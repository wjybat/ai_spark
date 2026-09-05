import { and, desc, eq, inArray } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import {
  evidenceCandidates,
  evidenceClaims,
  evidenceReviews,
  sourceSnapshots,
} from "../db/schema.js";
import { createVerifiedClaimFromCandidate } from "../research/pipeline.js";

export interface ReviewQueueItem {
  readonly candidate_id: string;
  readonly country_id: string;
  readonly predicate_code: string;
  readonly numeric_value: string | null;
  readonly text_value: string | null;
  readonly unit: string | null;
  readonly observed_at: string | null;
  readonly quote_text: string;
  readonly validation_errors: readonly string[];
  readonly candidate_hash: string;
  readonly source_type: string | null;
  readonly publisher: string | null;
  readonly created_at: number;
}

export async function getReviewQueue(
  db: MarketDatabase,
  filter: { countryIds?: readonly string[] } = {},
): Promise<ReviewQueueItem[]> {
  if (filter.countryIds !== undefined && filter.countryIds.length === 0) return [];
  const conditions = [eq(evidenceCandidates.validationStatus, "review_required")];
  if (filter.countryIds !== undefined) {
    conditions.push(inArray(evidenceCandidates.countryId, [...filter.countryIds]));
  }
  const rows = await db
    .select({ candidate: evidenceCandidates, snapshot: sourceSnapshots })
    .from(evidenceCandidates)
    .leftJoin(sourceSnapshots, eq(sourceSnapshots.id, evidenceCandidates.sourceSnapshotId))
    .where(and(...conditions))
    .orderBy(desc(evidenceCandidates.createdAt))
    .limit(100);

  return rows.map(({ candidate, snapshot }) => ({
    candidate_id: candidate.id,
    country_id: candidate.countryId,
    predicate_code: candidate.predicateCode,
    numeric_value: candidate.numericValueDecimal,
    text_value: candidate.textValue,
    unit: candidate.unit,
    observed_at: candidate.observedAt,
    quote_text: candidate.quoteText,
    validation_errors: JSON.parse(candidate.validationErrorsJson) as string[],
    candidate_hash: candidate.candidateHash,
    source_type: snapshot?.sourceType ?? null,
    publisher: snapshot?.publisher ?? null,
    created_at: candidate.createdAt,
  }));
}

export interface ReviewDecision {
  readonly approved: boolean;
  readonly claimId: string | null;
}

/** Approves a candidate with optimistic concurrency on the candidate hash. */
export async function approveCandidate(
  db: MarketDatabase,
  input: { candidateId: string; expectedCandidateHash: string; reviewerId?: string; reason?: string },
): Promise<ReviewDecision> {
  const rows = await db
    .select()
    .from(evidenceCandidates)
    .where(eq(evidenceCandidates.id, input.candidateId));
  const candidate = rows[0];
  if (!candidate) {
    throw new Error(`Candidate not found: ${input.candidateId}`);
  }
  if (candidate.candidateHash !== input.expectedCandidateHash) {
    const conflict = new Error("Candidate hash mismatch — the item changed, reload the queue.");
    conflict.name = "CONFLICT";
    throw conflict;
  }
  if (candidate.validationStatus !== "review_required") {
    throw new Error(`Candidate is not awaiting review: ${candidate.validationStatus}`);
  }

  const now = Date.now();
  const reviewerId = input.reviewerId ?? "usr_market_radar_ops";
  const countryIso = candidate.countryId.replace("cty_", "").toUpperCase();
  const verified = await createVerifiedClaimFromCandidate(db, {
    candidateId: candidate.id,
    snapshotId: candidate.sourceSnapshotId,
    countryId: candidate.countryId,
    countryIso,
    subjectEntityType: candidate.subjectEntityType === "retailer" ? "retailer" : "country",
    subjectEntityId: candidate.subjectEntityId ?? candidate.countryId,
    subjectText: candidate.subjectText,
    predicate: candidate.predicateCode,
    numericValue: candidate.numericValueDecimal,
    textValue: candidate.textValue,
    unit: candidate.unit ?? "dimensionless",
    observedAt: candidate.observedAt ?? "",
    quoteText: candidate.quoteText,
    sourceQualityBps: 7_000,
    originClusterId: `review_${candidate.countryId}`,
    allowConflicts: true,
    verificationMethod: "manual",
    verifiedBy: reviewerId,
  });

  const claimRows = await db
    .select({ id: evidenceClaims.id })
    .from(evidenceClaims)
    .where(eq(evidenceClaims.sourceCandidateId, candidate.id));
  const claimId = claimRows[0]?.id ?? null;
  if (!verified && claimId === null) {
    throw new Error("Manual approval did not produce or locate a verified claim.");
  }

  const reviewId = `rev_${candidate.id.slice(3)}`;
  const reviewValues = {
    candidateId: candidate.id,
    claimId,
    reviewerUserId: reviewerId,
    action: "approve",
    beforeJson: JSON.stringify({ validation_status: candidate.validationStatus }),
    afterJson: JSON.stringify({ validation_status: "valid", verified: true }),
    reason: input.reason ?? "Manual approval",
    createdAt: now,
  };
  await db
    .insert(evidenceReviews)
    .values({ id: reviewId, ...reviewValues })
    .onConflictDoUpdate({ target: evidenceReviews.id, set: reviewValues });

  return { approved: true, claimId };
}

export async function rejectCandidate(
  db: MarketDatabase,
  input: { candidateId: string; expectedCandidateHash: string; reviewerId?: string; reason?: string },
): Promise<ReviewDecision> {
  const rows = await db
    .select()
    .from(evidenceCandidates)
    .where(eq(evidenceCandidates.id, input.candidateId));
  const candidate = rows[0];
  if (!candidate) {
    throw new Error(`Candidate not found: ${input.candidateId}`);
  }
  if (candidate.candidateHash !== input.expectedCandidateHash) {
    const conflict = new Error("Candidate hash mismatch — the item changed, reload the queue.");
    conflict.name = "CONFLICT";
    throw conflict;
  }
  if (candidate.validationStatus !== "review_required") {
    throw new Error(`Candidate is not awaiting review: ${candidate.validationStatus}`);
  }

  await db
    .update(evidenceCandidates)
    .set({ validationStatus: "invalid" })
    .where(eq(evidenceCandidates.id, candidate.id));

  const reviewId = `rev_${candidate.id.slice(3)}`;
  const reviewValues = {
    candidateId: candidate.id,
    claimId: null,
    reviewerUserId: input.reviewerId ?? "usr_market_radar_ops",
    action: "reject",
    beforeJson: JSON.stringify({ validation_status: candidate.validationStatus }),
    afterJson: JSON.stringify({ validation_status: "invalid" }),
    reason: input.reason ?? "Manual rejection",
    createdAt: Date.now(),
  };
  await db
    .insert(evidenceReviews)
    .values({ id: reviewId, ...reviewValues })
    .onConflictDoUpdate({ target: evidenceReviews.id, set: reviewValues });

  return { approved: false, claimId: null };
}

export interface EvidenceClaimItem {
  readonly claim_id: string;
  readonly country_id: string;
  readonly predicate_code: string;
  readonly numeric_value: string | null;
  readonly text_value: string | null;
  readonly quote_text: string;
  readonly observed_at: string | null;
  readonly verification_status: string;
  readonly verification_method: string;
  readonly claim_quality_bps: number;
  readonly source_type: string | null;
  readonly publisher: string | null;
}

export async function queryVerifiedClaims(
  db: MarketDatabase,
  filter: {
    countryId?: string;
    countryIds?: readonly string[];
    predicateCode?: string;
    claimIds?: readonly string[];
    limit?: number;
  },
): Promise<EvidenceClaimItem[]> {
  if (filter.countryIds !== undefined && filter.countryIds.length === 0) return [];
  const conditions = [eq(evidenceClaims.active, true)];
  if (filter.countryId !== undefined) {
    conditions.push(eq(evidenceClaims.countryId, filter.countryId));
  }
  if (filter.countryIds !== undefined) {
    conditions.push(inArray(evidenceClaims.countryId, [...filter.countryIds]));
  }
  if (filter.predicateCode !== undefined) {
    conditions.push(eq(evidenceClaims.predicateCode, filter.predicateCode));
  }
  if (filter.claimIds !== undefined) {
    if (filter.claimIds.length === 0) return [];
    conditions.push(inArray(evidenceClaims.id, [...filter.claimIds]));
  }
  const rows = await db
    .select({ claim: evidenceClaims, snapshot: sourceSnapshots })
    .from(evidenceClaims)
    .leftJoin(sourceSnapshots, eq(sourceSnapshots.id, evidenceClaims.sourceSnapshotId))
    .where(and(...conditions))
    .orderBy(desc(evidenceClaims.createdAt))
    .limit(filter.limit ?? 50);

  return rows.map(({ claim, snapshot }) => ({
    claim_id: claim.id,
    country_id: claim.countryId,
    predicate_code: claim.predicateCode,
    numeric_value: claim.numericValueDecimal,
    text_value: claim.textValue,
    quote_text: claim.quoteText,
    observed_at: claim.observedAt,
    verification_status: claim.verificationStatus,
    verification_method: claim.verificationMethod,
    claim_quality_bps: claim.claimQualityBps,
    source_type: snapshot?.sourceType ?? null,
    publisher: snapshot?.publisher ?? null,
  }));
}
