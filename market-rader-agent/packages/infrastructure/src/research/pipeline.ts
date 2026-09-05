import { canonicalHash, newId } from "@market-radar/domain";
import { and, eq } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import { METRIC_NAMES, metrics } from "../observability/metrics.js";
import {
  aiRuns,
  evidenceCandidates,
  evidenceClaims,
  researchPlanItems,
  researchQueries,
  retailerObservations,
  retailers,
  scanEvents,
  scanRuns,
  sourceDocuments,
  sourceSnapshots,
} from "../db/schema.js";
import type { CorpusDocument } from "./plan.js";
import {
  isLowPrecisionAdvisoryError,
  topicByCode,
  validatePredicateEvidence,
  validatePredicateValue,
} from "./topics.js";

interface Marker {
  readonly predicate: string;
  readonly retailerName?: string;
  readonly value: string;
  readonly unit: string;
  readonly at: string;
  readonly marker: string;
  readonly sentence: string;
  readonly validationErrors?: readonly string[];
}

const MARKER_PATTERN = /\[([a-z_]+)\|([^\]|]+)\|([a-z_]+)\|(\d{4}-\d{2}-\d{2})\]/g;

function parseMarkers(text: string): Marker[] {
  const markers: Marker[] = [];
  const sentences = text.split(/(?<=\.)\s+/);
  for (const match of text.matchAll(MARKER_PATTERN)) {
    const marker = match[0];
    const sentence = sentences.find((candidate) => candidate.includes(marker));
    if (sentence === undefined) continue;
    markers.push({
      predicate: match[1]!,
      value: match[2]!,
      unit: match[3]!,
      at: match[4]!,
      marker,
      sentence,
    });
  }
  return markers;
}

async function ensureSnapshot(
  db: MarketDatabase,
  document: CorpusDocument,
  countryId: string,
): Promise<string> {
  const now = Date.now();
  const provider = document.provider ?? "fixture";
  const documentId = `sdoc_${newId("d").split("_")[1]}`;
  const contentHash = canonicalHash({ url: document.url, text: document.text });

  const existingDocument = await db
    .select()
    .from(sourceDocuments)
    .where(eq(sourceDocuments.canonicalUrl, document.url));
  let resolvedDocumentId = existingDocument[0]?.id ?? null;
  if (resolvedDocumentId === null) {
    await db.insert(sourceDocuments).values({
      id: documentId,
      canonicalUrl: document.url,
      publisher: document.publisher,
      sourceType: document.source_type,
      originClusterId: document.origin_cluster_id ?? `${provider}_${countryId}_${document.topic}`,
      firstSeenAt: now,
      lastSeenAt: now,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    resolvedDocumentId = documentId;
  }

  const existingSnapshot = await db
    .select()
    .from(sourceSnapshots)
    .where(
      and(
        eq(sourceSnapshots.sourceDocumentId, resolvedDocumentId),
        eq(sourceSnapshots.contentHash, contentHash),
      ),
    );
  if (existingSnapshot.length > 0) {
    return existingSnapshot[0]!.id;
  }

  const snapshotId = `snap_${newId("s").split("_")[1]}`;
  await db.insert(sourceSnapshots).values({
    id: snapshotId,
    sourceDocumentId: resolvedDocumentId,
    fetchedAt: now,
    publishedAt: Date.parse(`${document.published_at}T00:00:00.000Z`),
    publisher: document.publisher,
    sourceType: document.source_type,
    language: document.language,
    mimeType: "text/plain",
    httpStatus: 200,
    contentHash,
    normalizedText: document.text,
    parseStatus: "succeeded",
    parserVersion: provider === "pi-agent" ? "pi-agent-excerpt-1.3.0" : "fixture-research-1.0.0",
    metadataJson: JSON.stringify({
      provider,
      fixture: provider === "fixture",
      synthetic: provider === "fixture",
      excerpt_only: provider === "pi-agent",
      topic: document.topic,
      extractor_model: document.extractor_model ?? null,
    }),
    createdAt: now,
  });
  return snapshotId;
}

function normalizeRetailerName(value: string): string {
  const ignored = new Set([
    "berhad", "bhd", "sdn", "limited", "ltd", "plc", "inc", "incorporated",
    "holdings", "holding", "group", "company", "co", "retail", "retailer",
    "malaysia", "indonesia", "thailand", "philippines", "vietnam",
    "brazil", "brasil", "mexico", "méxico", "colombia", "chile", "peru", "perú",
    "saudi", "arabia", "uae", "qatar", "kuwait", "oman",
    "egypt", "morocco", "algeria", "tunisia", "libya",
  ]);
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter((token) => token.length > 0 && !ignored.has(token))
    .join("");
}

async function ensureRetailer(
  db: MarketDatabase,
  countryId: string,
  canonicalName: string,
): Promise<string> {
  const normalizedName = normalizeRetailerName(canonicalName);
  const existing = await db
    .select({ id: retailers.id })
    .from(retailers)
    .where(and(eq(retailers.countryId, countryId), eq(retailers.normalizedName, normalizedName)));
  if (existing[0] !== undefined) return existing[0].id;

  const retailerId = `ret_${canonicalHash({ countryId, normalizedName }).replace("sha256:", "").slice(0, 32)}`;
  const now = Date.now();
  await db.insert(retailers).values({
    id: retailerId,
    canonicalName,
    normalizedName,
    countryId,
    status: "active",
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();
  return retailerId;
}

export interface CandidateOutcome {
  readonly candidateId: string;
  readonly status: "valid" | "review_required" | "invalid" | "duplicate";
  readonly verified: boolean;
}

export interface TopicResearchResult {
  readonly documents: number;
  readonly candidates: number;
  readonly verified: number;
  readonly reviewRequired: number;
}

/**
 * Executes one research job end to end using provider documents, validates
 * extracted candidates and applies the auto-verification policy. Fixture
 * documents use inline markers; live providers submit explicit grounded claims.
 */
export async function executeTopicResearch(
  db: MarketDatabase,
  input: {
    scanRunId: string;
    planItemId: string;
    countryId: string;
    topicCode: string;
    documents: readonly CorpusDocument[];
    window: { from: string; to: string };
  },
): Promise<TopicResearchResult> {
  const now = Date.now();
  const countryIso = input.countryId.replace("cty_", "").toUpperCase();
  const topic = topicByCode(input.topicCode);

  await db.insert(scanEvents).values({
    scanRunId: input.scanRunId,
    eventType: "research.topic_started",
    stage: "researching",
    countryId: input.countryId,
    topicCode: input.topicCode,
    messageCode: "TOPIC_STARTED",
    payloadJson: JSON.stringify({}),
    createdAt: Date.now(),
  });

  const queries = await db
    .select()
    .from(researchQueries)
    .where(eq(researchQueries.researchPlanItemId, input.planItemId));
  for (const query of queries) {
    await db
      .update(researchQueries)
      .set({ status: "executed", executedAt: now })
      .where(eq(researchQueries.id, query.id));
  }

  const documents = input.documents.filter(
    (document) => document.country === countryIso && document.topic === input.topicCode,
  );

  let candidates = 0;
  let verified = 0;
  const reviewRequired = 0;

  for (const document of documents) {
    const snapshotId = await ensureSnapshot(db, document, input.countryId);
    const markers = document.extracted_claims !== undefined
      ? document.extracted_claims.map((claim) => ({
          predicate: claim.predicate,
          ...(claim.retailer_name === undefined ? {} : { retailerName: claim.retailer_name }),
          value: claim.value,
          unit: claim.unit,
          at: claim.observed_at,
          marker: `[provider-extraction:${claim.predicate}]`,
          sentence: claim.quote_text,
          ...(claim.validation_errors === undefined
            ? {}
            : { validationErrors: claim.validation_errors }),
        }))
      : parseMarkers(document.text);
    const provider = document.provider ?? "fixture";

    const extractionInputHash = canonicalHash({ snapshot: snapshotId, topic: input.topicCode });
    const aiRunId = `air_${newId("r").split("_")[1]}`;
    await db.insert(aiRuns).values({
      id: aiRunId,
      purpose: "evidence_extraction",
      provider,
      model: document.extractor_model ?? (provider === "fixture" ? "fixture-extractor" : "pi-agent-default"),
      promptVersion: "evidence-extractor-1.3.0",
      inputHash: extractionInputHash,
      outputHash: canonicalHash({ markers: markers.map((m) => m.marker) }),
      status: "succeeded",
      inputTokens: Math.ceil(document.text.length / 4),
      outputTokens: markers.length * 40,
      latencyMs: 12,
      createdAt: now,
      finishedAt: now,
    });

    for (const marker of markers) {
      if (topic !== undefined && !topic.predicates.includes(marker.predicate)) {
        continue;
      }
      const isNumeric = /^-?\d+(\.\d+)?$/.test(marker.value);
      const retailerName = marker.retailerName?.trim();
      const retailerId = retailerName === undefined
        ? null
        : await ensureRetailer(db, input.countryId, retailerName);
      const subjectEntityType = retailerId === null ? "country" : "retailer";
      const subjectEntityId = retailerId ?? input.countryId;
      const subjectText = retailerName ?? countryIso;
      const candidateHash = canonicalHash({
        snapshot: snapshotId,
        predicate: marker.predicate,
        value: marker.value,
        unit: marker.unit,
        at: marker.at,
        country: countryIso,
        subject: subjectEntityId,
      });

      const existingCandidate = await db
        .select()
        .from(evidenceCandidates)
        .where(eq(evidenceCandidates.candidateHash, candidateHash));
      if (existingCandidate.length > 0) {
        continue;
      }

      const structuralErrors = validatePredicateValue(
        marker.predicate,
        marker.value,
        marker.unit,
      );
      const semanticErrors = provider === "pi-agent"
        ? validatePredicateEvidence(
            marker.predicate,
            marker.value,
            marker.sentence,
            marker.at,
            document.published_at,
            countryIso,
          )
        : [];
      if (marker.predicate === "retailer_store_count_actual" && retailerId === null) {
        semanticErrors.push("retailer_name_required");
      }
      const providerErrors = [...(marker.validationErrors ?? [])];
      const validationErrors = [...new Set([
        ...structuralErrors,
        ...semanticErrors,
        ...providerErrors,
      ])];
      const hardValidationErrors = [
        ...structuralErrors,
        ...semanticErrors.filter((error) => !isLowPrecisionAdvisoryError(error)),
        ...providerErrors.filter((error) => !isLowPrecisionAdvisoryError(error)),
      ];
      const quoteExact = document.text.includes(marker.sentence);
      if (!quoteExact) {
        validationErrors.push("quote_not_substring");
        hardValidationErrors.push("quote_not_substring");
      }
      if (marker.at < input.window.from || marker.at > input.window.to) {
        validationErrors.push("observed_outside_research_window");
        hardValidationErrors.push("observed_outside_research_window");
      }

      if (topic?.reviewPredicates.includes(marker.predicate) === true) {
        validationErrors.push("manual_review_bypassed:low_precision_policy");
      }
      const lowPrecision = validationErrors.some(isLowPrecisionAdvisoryError);
      const validationStatus = hardValidationErrors.length > 0 ? "invalid" : "valid";

      const candidateId = `ec_${newId("c").split("_")[1]}`;
      await db.insert(evidenceCandidates).values({
        id: candidateId,
        scanRunId: input.scanRunId,
        subjectEntityType,
        subjectEntityId,
        subjectText,
        predicateCode: marker.predicate,
        textValue: isNumeric ? null : marker.value,
        numericValueDecimal: isNumeric ? marker.value : null,
        unit: marker.unit,
        effectiveFrom: null,
        effectiveTo: null,
        observedAt: marker.at,
        countryId: input.countryId,
        geoScopeJson: JSON.stringify({ country_iso2: countryIso }),
        sourceSnapshotId: snapshotId,
        quoteText: marker.sentence,
        locatorJson: JSON.stringify({
          block_id: "b0",
          start_offset: document.text.indexOf(marker.sentence),
          end_offset: document.text.indexOf(marker.sentence) + marker.sentence.length,
        }),
        extractionModel: document.extractor_model ?? (provider === "fixture" ? "fixture-extractor" : "pi-agent-default"),
        extractionPromptVersion: "evidence-extractor-1.3.0",
        candidateHash,
        modelConfidenceBps: 8_000,
        validationStatus,
        validationErrorsJson: JSON.stringify(validationErrors),
        aiRunId,
        createdAt: now,
      });
      candidates += 1;
      metrics.increment(METRIC_NAMES.evidenceCandidatesTotal, { status: validationStatus });

      if (validationStatus !== "valid") continue;

      const verifiedNow = await createVerifiedClaimFromCandidate(db, {
        candidateId,
        snapshotId,
        countryId: input.countryId,
        countryIso,
        subjectEntityType,
        subjectEntityId,
        subjectText,
        predicate: marker.predicate,
        numericValue: isNumeric ? marker.value : null,
        textValue: isNumeric ? null : marker.value,
        unit: marker.unit,
        observedAt: marker.at,
        quoteText: marker.sentence,
        sourceQualityBps: lowPrecision
          ? Math.min(sourceQualityForType(document.source_type), 4_000)
          : sourceQualityForType(document.source_type),
        originClusterId: document.origin_cluster_id ?? `${provider}_${input.countryId}_${document.topic}`,
        allowConflicts: true,
        verificationMethod: lowPrecision ? "auto_low_precision" : "corroborated",
        verifiedBy: null,
      });
      if (verifiedNow) {
        verified += 1;
        metrics.increment(METRIC_NAMES.verifiedClaimsCreatedTotal, { source: "research" });
      }
    }
  }

  const itemStatus = documents.length === 0 ? "partial" : "completed";
  await db
    .update(researchPlanItems)
    .set({
      status: itemStatus,
      stopReason: documents.length === 0 ? "no_search_results" : null,
      completedAt: now,
    })
    .where(eq(researchPlanItems.id, input.planItemId));

  await db.insert(scanEvents).values({
    scanRunId: input.scanRunId,
    eventType: itemStatus === "completed" ? "research.topic_completed" : "research.topic_failed",
    stage: "researching",
    countryId: input.countryId,
    topicCode: input.topicCode,
    messageCode: itemStatus === "completed" ? "TOPIC_COMPLETED" : "TOPIC_NO_RESULTS",
    payloadJson: JSON.stringify({
      documents: documents.length,
      candidates,
      verified,
      review_required: reviewRequired,
    }),
    createdAt: Date.now(),
  });

  return { documents: documents.length, candidates, verified, reviewRequired };
}

function sourceQualityForType(sourceType: string): number {
  const tiers: Record<string, number> = {
    government_regulator_official_statistics: 9_500,
    audited_annual_report_exchange_filing: 9_200,
    company_investor_material_official_announcement: 8_800,
    industry_association_transparent_research: 8_200,
    mainstream_business_media: 7_500,
    company_news_product_page: 7_000,
    other_verifiable_public_web: 5_000,
  };
  return tiers[sourceType] ?? 5_000;
}

/**
 * Creates a verified claim from a validated candidate unless it is a
 * duplicate (identity hash) or conflicts beyond tolerance with an existing
 * active claim (then it stays in the review queue).
 */
export async function createVerifiedClaimFromCandidate(
  db: MarketDatabase,
  input: {
    candidateId: string;
    snapshotId: string;
    countryId: string;
    countryIso: string;
    subjectEntityType?: "country" | "retailer";
    subjectEntityId?: string;
    subjectText?: string;
    predicate: string;
    numericValue: string | null;
    textValue: string | null;
    unit: string;
    observedAt: string;
    quoteText: string;
    sourceQualityBps: number;
    originClusterId: string;
    /** Explicitly accept material numeric conflicts; low-precision policy uses this automatically. */
    allowConflicts?: boolean;
    verificationMethod?: string;
    verifiedBy?: string | null;
  },
): Promise<boolean> {
  const structuralErrors = validatePredicateValue(
    input.predicate,
    input.numericValue ?? input.textValue ?? "",
    input.unit,
  );
  if (structuralErrors.length > 0) {
    await db
      .update(evidenceCandidates)
      .set({
        validationStatus: "invalid",
        validationErrorsJson: JSON.stringify(structuralErrors),
      })
      .where(eq(evidenceCandidates.id, input.candidateId));
    return false;
  }

  const now = Date.now();
  const subjectEntityType = input.subjectEntityType ?? "country";
  const subjectEntityId = input.subjectEntityId ?? input.countryId;
  const subjectText = input.subjectText ?? input.countryIso;
  const identityHash = canonicalHash({
    snapshot: input.snapshotId,
    subject: subjectEntityId,
    predicate: input.predicate,
    value: input.numericValue ?? input.textValue,
    unit: input.unit,
    period: input.observedAt,
    geo: input.countryIso,
    format: null,
  });
  const conflictKeyHash = canonicalHash({
    subject: subjectEntityId,
    predicate: input.predicate,
    geo: input.countryIso,
    unit: input.unit,
    period: input.observedAt,
  });

  const existingIdentity = await db
    .select()
    .from(evidenceClaims)
    .where(eq(evidenceClaims.claimIdentityHash, identityHash));
  if (existingIdentity.length > 0) {
    return false;
  }

  // Different periods are legitimate observations in a time series. Only
  // disagreeing values for the same subject, predicate, unit, and period need
  // human resolution. Query columns directly to remain compatible with legacy
  // conflict hashes that did not include the period.
  const conflicting = await db
    .select()
    .from(evidenceClaims)
    .where(
      and(
        eq(evidenceClaims.subjectEntityId, subjectEntityId),
        eq(evidenceClaims.predicateCode, input.predicate),
        eq(evidenceClaims.countryId, input.countryId),
        eq(evidenceClaims.unit, input.unit),
        eq(evidenceClaims.observedAt, input.observedAt),
        eq(evidenceClaims.active, true),
        eq(evidenceClaims.verificationStatus, "verified"),
      ),
    );
  const numeric = input.numericValue !== null ? Number(input.numericValue) : null;
  const materialConflict = conflicting.find((claim) => {
    if (numeric === null || claim.numericValueDecimal === null) return false;
    const existingValue = Number(claim.numericValueDecimal);
    const mean = Math.abs((numeric + existingValue) / 2);
    return mean > 0 && Math.abs(numeric - existingValue) / mean > 0.1;
  });
  if (materialConflict !== undefined && input.allowConflicts !== true) {
    await db
      .update(evidenceCandidates)
      .set({
        validationStatus: "review_required",
        validationErrorsJson: JSON.stringify([
          `conflicts_with_claim:${materialConflict.id}`,
        ]),
      })
      .where(eq(evidenceCandidates.id, input.candidateId));
    return false;
  }
  const autoAcceptedConflict = materialConflict !== undefined &&
    input.allowConflicts === true && input.verificationMethod !== "manual";

  const claimId = `clm_${newId("c").split("_")[1]}`;
  await db.insert(evidenceClaims).values({
    id: claimId,
    sourceCandidateId: input.candidateId,
    subjectEntityType,
    subjectEntityId,
    subjectText,
    predicateCode: input.predicate,
    textValue: input.textValue,
    numericValueDecimal: input.numericValue,
    unit: input.unit,
    effectiveFrom: null,
    effectiveTo: null,
    observedAt: input.observedAt,
    countryId: input.countryId,
    geoScopeJson: JSON.stringify({ country_iso2: input.countryIso }),
    sourceSnapshotId: input.snapshotId,
    quoteText: input.quoteText,
    locatorJson: JSON.stringify({ block_id: "b0" }),
    verificationStatus: "verified",
    verificationMethod: autoAcceptedConflict
      ? "auto_low_precision"
      : input.verificationMethod ?? "corroborated",
    verifiedBy: input.verifiedBy === undefined ? "usr_market_radar_ops" : input.verifiedBy,
    verifiedAt: now,
    sourceQualityBps: autoAcceptedConflict
      ? Math.min(input.sourceQualityBps, 4_000)
      : input.sourceQualityBps,
    claimQualityBps: autoAcceptedConflict
      ? Math.min(input.sourceQualityBps, 4_000)
      : input.sourceQualityBps,
    originClusterId: input.originClusterId,
    claimIdentityHash: identityHash,
    conflictKeyHash,
    claimVersion: 1,
    active: true,
    createdAt: now,
  });

  if (
    subjectEntityType === "retailer" &&
    input.predicate === "retailer_store_count_actual" &&
    input.numericValue !== null
  ) {
    await db.insert(retailerObservations).values({
      id: `robs_${newId("o").split("_")[1]}`,
      retailerId: subjectEntityId,
      metricCode: "store_count_actual",
      numericValueDecimal: input.numericValue,
      unit: input.unit,
      effectiveFrom: input.observedAt,
      claimId,
      createdAt: now,
    }).onConflictDoNothing();
  }

  await db
    .update(evidenceCandidates)
    .set({ validationStatus: "valid" })
    .where(eq(evidenceCandidates.id, input.candidateId));

  return true;
}

export async function isScanCancelled(db: MarketDatabase, scanRunId: string): Promise<boolean> {
  const rows = await db
    .select({ cancelRequestedAt: scanRuns.cancelRequestedAt })
    .from(scanRuns)
    .where(eq(scanRuns.id, scanRunId));
  return rows[0]?.cancelRequestedAt !== null && rows[0]?.cancelRequestedAt !== undefined;
}
