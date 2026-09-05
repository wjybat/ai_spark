import { readFile } from "node:fs/promises";
import path from "node:path";

import { canonicalHash, newId } from "@market-radar/domain";
import { and, eq, inArray } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import {
  evidenceClaims,
  researchJobs,
  researchPlanItems,
  researchPlans,
  researchQueries,
  scanEvents,
  sourceSnapshots,
  scanRuns,
} from "../db/schema.js";
import { repoRoot } from "../paths.js";
import {
  localLanguageSearchInstruction,
  RESEARCH_POLICY_VERSION,
  RESEARCH_TOPICS,
  researchLanguages,
  type TopicDefinition,
} from "./topics.js";

export function hasObservationSpan(
  observedDates: readonly (string | null)[],
  minimumYears: number,
  maximumYears: number,
): boolean {
  const timestamps = [...new Set(
    observedDates
      .filter((value): value is string => value !== null)
      .map((value) => Date.parse(value))
      .filter((value) => !Number.isNaN(value)),
  )].sort((a, b) => a - b);
  return timestamps.some((start, startIndex) =>
    timestamps.slice(startIndex + 1).some((end) => {
      const years = (end - start) / (365.25 * 86_400_000);
      return years >= minimumYears && years <= maximumYears;
    }),
  );
}

export interface ExtractedResearchClaim {
  readonly predicate: string;
  readonly retailer_name?: string;
  readonly value: string;
  readonly unit: string;
  readonly observed_at: string;
  /** Exact quote contained in the persisted document text. */
  readonly quote_text: string;
  /** Provider-detected semantic warnings retained under low-precision auto-acceptance. */
  readonly validation_errors?: readonly string[];
}

export interface CorpusDocument {
  readonly country: string;
  readonly topic: string;
  readonly source_type: string;
  readonly publisher: string;
  readonly url: string;
  readonly published_at: string;
  readonly language: string;
  readonly text: string;
  /** Optional provider extraction. Fixture documents continue to use inline markers. */
  readonly extracted_claims?: readonly ExtractedResearchClaim[];
  readonly provider?: "fixture" | "pi-agent";
  readonly extractor_model?: string;
  readonly origin_cluster_id?: string;
}

export interface ResearchCorpus {
  readonly version?: string;
  readonly documents: readonly CorpusDocument[];
}

export async function loadResearchCorpus(
  filePath = path.join(repoRoot, "fixtures", "research-corpus.json"),
): Promise<ResearchCorpus> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as ResearchCorpus;
}

export interface PlanBuildResult {
  readonly planId: string;
  readonly planHash: string;
  readonly totalItems: number;
  readonly reusedItems: number;
  readonly createdJobs: number;
}

/**
 * Deterministic research plan builder: every (country, topic) pair is checked
 * against existing verified claims; covered pairs are marked reused, gaps
 * become research jobs. The plan hash covers inputs only, so identical inputs
 * yield an identical plan.
 */
export async function buildResearchPlan(
  db: MarketDatabase,
  input: {
    scanRunId: string;
    scenarioRevisionId: string;
    countryIds: readonly string[];
    window: { from: string; to: string };
    providerName?: string;
    forceRefresh?: boolean;
  },
): Promise<PlanBuildResult> {
  const now = Date.now();
  const countryIsoBy = new Map(
    input.countryIds.map((id) => [id, id.replace("cty_", "").toUpperCase()]),
  );

  const expectedProvider = input.providerName ?? "fixture";
  const claimRows = await db
    .select({ claim: evidenceClaims, snapshot: sourceSnapshots })
    .from(evidenceClaims)
    .innerJoin(sourceSnapshots, eq(sourceSnapshots.id, evidenceClaims.sourceSnapshotId))
    .where(
      and(
        eq(evidenceClaims.verificationStatus, "verified"),
        eq(evidenceClaims.active, true),
        inArray(evidenceClaims.countryId, [...input.countryIds]),
      ),
    );
  const existingClaims = claimRows
    .filter(({ snapshot }) => {
      try {
        const metadata = JSON.parse(snapshot.metadataJson) as { provider?: unknown };
        return (typeof metadata.provider === "string" ? metadata.provider : "fixture") === expectedProvider;
      } catch {
        return expectedProvider === "fixture";
      }
    })
    .map(({ claim }) => claim);
  type ExistingClaim = (typeof existingClaims)[number];
  const claimsByCountryPredicate = new Map<string, number>();
  const retailerSeriesByCountry = new Map<string, Map<string, ExistingClaim[]>>();
  for (const claim of existingClaims) {
    if (claim.observedAt !== null && (claim.observedAt < input.window.from || claim.observedAt > input.window.to)) {
      continue;
    }
    const key = `${claim.countryId}:${claim.predicateCode}`;
    claimsByCountryPredicate.set(key, (claimsByCountryPredicate.get(key) ?? 0) + 1);
    if (
      claim.predicateCode === "retailer_store_count_actual" &&
      claim.subjectEntityType === "retailer" &&
      claim.subjectEntityId !== null
    ) {
      const countrySeries = retailerSeriesByCountry.get(claim.countryId) ??
        new Map<string, ExistingClaim[]>();
      const series = countrySeries.get(claim.subjectEntityId) ?? ([] as ExistingClaim[]);
      series.push(claim);
      countrySeries.set(claim.subjectEntityId, series);
      retailerSeriesByCountry.set(claim.countryId, countrySeries);
    }
  }

  const itemSpecs: {
    countryId: string;
    topic: TopicDefinition;
    reused: boolean;
    claimCount: number;
  }[] = [];
  for (const countryId of input.countryIds) {
    for (const topic of RESEARCH_TOPICS) {
      const coveredPredicates = topic.predicates.filter(
        (predicate) => (claimsByCountryPredicate.get(`${countryId}:${predicate}`) ?? 0) > 0,
      ).length;
      const claimCount = topic.predicates.reduce(
        (sum, predicate) => sum + (claimsByCountryPredicate.get(`${countryId}:${predicate}`) ?? 0),
        0,
      );
      // A topic is reused only when every required predicate already has
      // enough verified evidence in scope. Retailer foundations specifically
      // need three qualified retailer series with a true 2.5–3.5 year span;
      // merely having two adjacent observations cannot support a 3Y CAGR.
      const retailerSeries = retailerSeriesByCountry.get(countryId);
      const qualifiedThreeYearSeries = retailerSeries === undefined
        ? []
        : [...retailerSeries.values()].filter((series) =>
            hasObservationSpan(series.map((claim) => claim.observedAt), 2.5, 3.5) &&
            Math.max(...series.map((claim) => Number(claim.numericValueDecimal ?? 0))) >= 500,
          );
      const retailerFoundationCovered =
        !topic.code.startsWith("retailer_foundations_") || qualifiedThreeYearSeries.length >= 3;
      itemSpecs.push({
        countryId,
        topic,
        reused:
          input.forceRefresh !== true &&
          coveredPredicates === topic.predicates.length &&
          claimCount >= topic.minimumVerifiedClaims &&
          retailerFoundationCovered,
        claimCount,
      });
    }
  }

  const planHash = canonicalHash({
    scan: input.scanRunId,
    revision: input.scenarioRevisionId,
    countries: [...input.countryIds].sort(),
    topics: RESEARCH_TOPICS.map((topic) => ({ code: topic.code, predicates: topic.predicates })),
    research_policy_version: RESEARCH_POLICY_VERSION,
    provider: input.providerName ?? "fixture",
    force_refresh: input.forceRefresh === true,
    existing_claims: existingClaims
      .map((claim) => `${claim.countryId}:${claim.predicateCode}`)
      .sort(),
  });

  const planId = `rpl_${newId("p").split("_")[1]}`;
  await db.insert(researchPlans).values({
    id: planId,
    scanRunId: input.scanRunId,
    researchPolicyVersion: RESEARCH_POLICY_VERSION,
    planHash,
    status: "active",
    createdAt: now,
  });

  let createdJobs = 0;
  for (const spec of itemSpecs) {
    const itemId = `rpi_${newId("i").split("_")[1]}`;
    await db.insert(researchPlanItems).values({
      id: itemId,
      researchPlanId: planId,
      countryId: spec.countryId,
      topicCode: spec.topic.code,
      requirementsJson: JSON.stringify({
        required_predicates: spec.topic.predicates,
        minimum_verified_claims: spec.topic.minimumVerifiedClaims,
        minimum_independent_sources: spec.topic.minimumIndependentSources,
      }),
      budgetsJson: JSON.stringify({ query_budget: 6, document_budget: 6, max_failures: 2 }),
      preferredSourceTypesJson: JSON.stringify([
        "government_regulator_official_statistics",
        "audited_annual_report_exchange_filing",
        "industry_association_transparent_research",
        "mainstream_business_media",
      ]),
      languagesJson: JSON.stringify(researchLanguages(countryIsoBy.get(spec.countryId) ?? "")),
      freshnessRequirementJson: JSON.stringify({ freshness_window_days: 730 }),
      reuseDecisionJson: JSON.stringify({
        reused: spec.reused,
        existing_claim_count: spec.claimCount,
        force_refresh: input.forceRefresh === true,
      }),
      completionRuleJson: JSON.stringify({ rule: "minimum_claims_or_budget_exhausted" }),
      status: spec.reused ? "completed" : "pending",
      completedAt: spec.reused ? now : null,
      createdAt: now,
    });

    if (spec.reused) {
      continue;
    }

    const countryIso2 = countryIsoBy.get(spec.countryId) ?? "";
    for (const language of researchLanguages(countryIso2)) {
      const queryText = language === "en"
        ? `${countryIso2} ${spec.topic.code.replace(/_/g, " ")} retail market evidence`
        : `${countryIso2} ${spec.topic.code.replace(/_/g, " ")} local-language evidence — ${localLanguageSearchInstruction(countryIso2)}`;
      await db.insert(researchQueries).values({
        id: `rq_${newId("q").split("_")[1]}`,
        researchPlanItemId: itemId,
        queryText,
        language,
        queryHash: canonicalHash({ query: queryText, language }),
        source: input.providerName ?? "fixture",
        status: "planned",
        createdAt: now,
      });
    }

    await db.insert(researchJobs).values({
      id: `rjob_${newId("j").split("_")[1]}`,
      scanRunId: input.scanRunId,
      scenarioRevisionId: input.scenarioRevisionId,
      researchPlanItemId: itemId,
      countryId: spec.countryId,
      topicCode: spec.topic.code,
      payloadJson: JSON.stringify({ topic: spec.topic.code, predicates: spec.topic.predicates }),
      idempotencyKey: `${input.scanRunId}:${spec.countryId}:${spec.topic.code}`,
      status: "queued",
      priority: 100,
      maxAttempts: 3,
      createdAt: now,
    });
    createdJobs += 1;
  }

  await db.insert(scanEvents).values({
    scanRunId: input.scanRunId,
    eventType: "scan.planning",
    stage: "planning",
    messageCode: "PLAN_CREATED",
    payloadJson: JSON.stringify({
      total_items: itemSpecs.length,
      reused: itemSpecs.filter((spec) => spec.reused).length,
      jobs: createdJobs,
    }),
    createdAt: Date.now(),
  });

  return {
    planId,
    planHash,
    totalItems: itemSpecs.length,
    reusedItems: itemSpecs.filter((spec) => spec.reused).length,
    createdJobs,
  };
}

export async function markScanStatus(
  db: MarketDatabase,
  scanRunId: string,
  status: string,
  stage: string,
): Promise<void> {
  await db.update(scanRuns).set({ status, stage }).where(eq(scanRuns.id, scanRunId));
}
