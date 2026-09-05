import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const ts = (name: string) => integer(name, { mode: "number" });
const bool = (name: string) => integer(name, { mode: "boolean" });

/* ------------------------------ foundation ------------------------------ */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const countries = sqliteTable("countries", {
  id: text("id").primaryKey(),
  iso2: text("iso2").notNull().unique(),
  iso3: text("iso3").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameLocal: text("name_local"),
  regionCode: text("region_code"),
  currencyCode: text("currency_code"),
  timezone: text("timezone").notNull(),
  active: bool("active").notNull().default(true),
  createdAt: ts("created_at").notNull(),
});

export const retailFormats = sqliteTable("retail_formats", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  nameEn: text("name_en").notNull(),
  taxonomyVersion: text("taxonomy_version").notNull(),
  active: bool("active").notNull().default(true),
  createdAt: ts("created_at").notNull(),
});

export const retailFormatAliases = sqliteTable(
  "retail_format_aliases",
  {
    id: text("id").primaryKey(),
    retailFormatId: text("retail_format_id")
      .notNull()
      .references(() => retailFormats.id),
    countryId: text("country_id").references(() => countries.id),
    language: text("language").notNull(),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    source: text("source").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("retail_format_alias_unique").on(
      table.retailFormatId,
      table.countryId,
      table.language,
      table.normalizedAlias,
    ),
  ],
);

/* --------------------------- product & scenario -------------------------- */

export const productProfiles = sqliteTable("product_profiles", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  currentRevisionId: text("current_revision_id"),
  status: text("status").notNull(),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const productProfileRevisions = sqliteTable(
  "product_profile_revisions",
  {
    id: text("id").primaryKey(),
    productProfileId: text("product_profile_id")
      .notNull()
      .references(() => productProfiles.id),
    revisionNo: integer("revision_no").notNull(),
    version: text("version").notNull(),
    configJson: text("config_json").notNull(),
    configHash: text("config_hash").notNull(),
    status: text("status").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: ts("created_at").notNull(),
    publishedAt: ts("published_at"),
  },
  (table) => [
    uniqueIndex("product_profile_revision_no_unique").on(table.productProfileId, table.revisionNo),
    uniqueIndex("product_profile_revision_hash_unique").on(table.productProfileId, table.configHash),
  ],
);

export const scenarios = sqliteTable("scenarios", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  currentRevisionId: text("current_revision_id"),
  status: text("status").notNull(),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
  archivedAt: ts("archived_at"),
});

export const scenarioRevisions = sqliteTable(
  "scenario_revisions",
  {
    id: text("id").primaryKey(),
    scenarioId: text("scenario_id")
      .notNull()
      .references(() => scenarios.id),
    revisionNo: integer("revision_no").notNull(),
    parentRevisionId: text("parent_revision_id"),
    countryScopeJson: text("country_scope_json").notNull(),
    retailFormatCodesJson: text("retail_format_codes_json").notNull(),
    productProfileRevisionId: text("product_profile_revision_id")
      .notNull()
      .references(() => productProfileRevisions.id),
    customerFilterJson: text("customer_filter_json").notNull(),
    researchWindowJson: text("research_window_json").notNull(),
    strategyCode: text("strategy_code").notNull(),
    weightProfileId: text("weight_profile_id").notNull(),
    metricDefinitionSetId: text("metric_definition_set_id"),
    referenceSetId: text("reference_set_id"),
    scoringModelId: text("scoring_model_id"),
    benchmarkStatus: text("benchmark_status"),
    configHash: text("config_hash").notNull(),
    changeSummary: text("change_summary"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("scenario_revision_no_unique").on(table.scenarioId, table.revisionNo),
    uniqueIndex("scenario_revision_hash_unique").on(table.scenarioId, table.configHash),
  ],
);

/* ------------------------------ evidence core ---------------------------- */

export const retailers = sqliteTable(
  "retailers",
  {
    id: text("id").primaryKey(),
    canonicalName: text("canonical_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    countryId: text("country_id")
      .notNull()
      .references(() => countries.id),
    website: text("website"),
    status: text("status").notNull(),
    mergedIntoRetailerId: text("merged_into_retailer_id"),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [uniqueIndex("retailer_country_name_unique").on(table.countryId, table.normalizedName)],
);

export const retailerAliases = sqliteTable(
  "retailer_aliases",
  {
    id: text("id").primaryKey(),
    retailerId: text("retailer_id")
      .notNull()
      .references(() => retailers.id),
    language: text("language").notNull(),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    sourceSnapshotId: text("source_snapshot_id"),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("retailer_alias_unique").on(table.retailerId, table.language, table.normalizedAlias),
  ],
);

export const sourceDocuments = sqliteTable(
  "source_documents",
  {
    id: text("id").primaryKey(),
    canonicalUrl: text("canonical_url").notNull().unique(),
    publisher: text("publisher"),
    sourceType: text("source_type").notNull(),
    originClusterId: text("origin_cluster_id"),
    firstSeenAt: ts("first_seen_at").notNull(),
    lastSeenAt: ts("last_seen_at").notNull(),
    status: text("status").notNull(),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [index("source_documents_origin_cluster_idx").on(table.originClusterId)],
);

export const sourceSnapshots = sqliteTable(
  "source_snapshots",
  {
    id: text("id").primaryKey(),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id),
    fetchedAt: ts("fetched_at").notNull(),
    publishedAt: ts("published_at"),
    publisher: text("publisher"),
    sourceType: text("source_type").notNull(),
    language: text("language"),
    mimeType: text("mime_type").notNull(),
    httpStatus: integer("http_status").notNull(),
    etag: text("etag"),
    lastModified: text("last_modified"),
    contentHash: text("content_hash").notNull(),
    normalizedText: text("normalized_text").notNull(),
    rawContentPath: text("raw_content_path"),
    parseStatus: text("parse_status").notNull(),
    parserVersion: text("parser_version").notNull(),
    metadataJson: text("metadata_json").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("source_snapshot_content_unique").on(table.sourceDocumentId, table.contentHash),
    index("source_snapshots_content_hash_idx").on(table.contentHash),
    index("source_snapshots_published_at_idx").on(table.publishedAt),
    index("source_snapshots_parse_status_idx").on(table.parseStatus),
  ],
);

export const evidenceCandidates = sqliteTable(
  "evidence_candidates",
  {
    id: text("id").primaryKey(),
    scanRunId: text("scan_run_id"),
    subjectEntityType: text("subject_entity_type").notNull(),
    subjectEntityId: text("subject_entity_id"),
    subjectText: text("subject_text").notNull(),
    predicateCode: text("predicate_code").notNull(),
    textValue: text("text_value"),
    numericValueDecimal: text("numeric_value_decimal"),
    unit: text("unit"),
    currency: text("currency"),
    effectiveFrom: text("effective_from"),
    effectiveTo: text("effective_to"),
    observedAt: text("observed_at"),
    countryId: text("country_id")
      .notNull()
      .references(() => countries.id),
    geoScopeJson: text("geo_scope_json").notNull(),
    retailFormatId: text("retail_format_id").references(() => retailFormats.id),
    sourceSnapshotId: text("source_snapshot_id")
      .notNull()
      .references(() => sourceSnapshots.id),
    quoteText: text("quote_text").notNull(),
    locatorJson: text("locator_json").notNull(),
    extractionModel: text("extraction_model"),
    extractionPromptVersion: text("extraction_prompt_version"),
    candidateHash: text("candidate_hash").notNull().unique(),
    modelConfidenceBps: integer("model_confidence_bps"),
    validationStatus: text("validation_status").notNull(),
    validationErrorsJson: text("validation_errors_json").notNull(),
    aiRunId: text("ai_run_id"),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [
    index("evidence_candidates_status_idx").on(table.validationStatus, table.createdAt),
  ],
);

export const evidenceClaims = sqliteTable(
  "evidence_claims",
  {
    id: text("id").primaryKey(),
    sourceCandidateId: text("source_candidate_id"),
    subjectEntityType: text("subject_entity_type").notNull(),
    subjectEntityId: text("subject_entity_id"),
    subjectText: text("subject_text").notNull(),
    predicateCode: text("predicate_code").notNull(),
    textValue: text("text_value"),
    numericValueDecimal: text("numeric_value_decimal"),
    unit: text("unit"),
    currency: text("currency"),
    effectiveFrom: text("effective_from"),
    effectiveTo: text("effective_to"),
    observedAt: text("observed_at"),
    countryId: text("country_id")
      .notNull()
      .references(() => countries.id),
    geoScopeJson: text("geo_scope_json").notNull(),
    retailFormatId: text("retail_format_id").references(() => retailFormats.id),
    sourceSnapshotId: text("source_snapshot_id")
      .notNull()
      .references(() => sourceSnapshots.id),
    quoteText: text("quote_text").notNull(),
    locatorJson: text("locator_json").notNull(),
    verificationStatus: text("verification_status").notNull(),
    verificationMethod: text("verification_method").notNull(),
    verifiedBy: text("verified_by").references(() => users.id),
    verifiedAt: ts("verified_at").notNull(),
    sourceQualityBps: integer("source_quality_bps").notNull(),
    claimQualityBps: integer("claim_quality_bps").notNull(),
    originClusterId: text("origin_cluster_id"),
    claimIdentityHash: text("claim_identity_hash").notNull().unique(),
    conflictKeyHash: text("conflict_key_hash").notNull(),
    claimVersion: integer("claim_version").notNull(),
    supersedesClaimId: text("supersedes_claim_id"),
    active: bool("active").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [
    index("evidence_claims_lookup_idx").on(
      table.countryId,
      table.predicateCode,
      table.verificationStatus,
      table.active,
    ),
    index("evidence_claims_conflict_idx").on(table.conflictKeyHash),
    index("evidence_claims_effective_idx").on(table.effectiveFrom, table.effectiveTo),
  ],
);

export const evidenceRelations = sqliteTable(
  "evidence_relations",
  {
    id: text("id").primaryKey(),
    fromClaimId: text("from_claim_id")
      .notNull()
      .references(() => evidenceClaims.id),
    toClaimId: text("to_claim_id")
      .notNull()
      .references(() => evidenceClaims.id),
    relationType: text("relation_type").notNull(),
    reason: text("reason"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("evidence_relation_unique").on(table.fromClaimId, table.toClaimId, table.relationType),
  ],
);

export const evidenceReviews = sqliteTable("evidence_reviews", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id"),
  claimId: text("claim_id"),
  reviewerUserId: text("reviewer_user_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  reason: text("reason"),
  createdAt: ts("created_at").notNull(),
});

export const retailerFormats = sqliteTable(
  "retailer_formats",
  {
    retailerId: text("retailer_id")
      .notNull()
      .references(() => retailers.id),
    retailFormatId: text("retail_format_id")
      .notNull()
      .references(() => retailFormats.id),
    validFrom: text("valid_from"),
    validTo: text("valid_to"),
    claimId: text("claim_id")
      .notNull()
      .references(() => evidenceClaims.id),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.retailerId, table.retailFormatId, table.claimId] })],
);

export const retailerObservations = sqliteTable(
  "retailer_observations",
  {
    id: text("id").primaryKey(),
    retailerId: text("retailer_id")
      .notNull()
      .references(() => retailers.id),
    metricCode: text("metric_code").notNull(),
    numericValueDecimal: text("numeric_value_decimal"),
    textValue: text("text_value"),
    unit: text("unit"),
    currency: text("currency"),
    effectiveFrom: text("effective_from"),
    effectiveTo: text("effective_to"),
    claimId: text("claim_id")
      .notNull()
      .references(() => evidenceClaims.id),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("retailer_observation_unique").on(table.retailerId, table.metricCode, table.claimId),
    index("retailer_observations_lookup_idx").on(table.retailerId, table.metricCode, table.effectiveFrom),
  ],
);

/* ---------------------------- metric & scoring --------------------------- */

export const metricDefinitionSets = sqliteTable(
  "metric_definition_sets",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    version: text("version").notNull(),
    status: text("status").notNull(),
    configHash: text("config_hash").notNull(),
    publishedAt: ts("published_at"),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("metric_definition_set_version_unique").on(table.code, table.version),
    uniqueIndex("metric_definition_set_hash_unique").on(table.configHash),
  ],
);

export const referenceSets = sqliteTable(
  "reference_sets",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    version: text("version").notNull(),
    scopeJson: text("scope_json").notNull(),
    effectiveAt: text("effective_at").notNull(),
    configJson: text("config_json").notNull(),
    configHash: text("config_hash").notNull(),
    status: text("status").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [uniqueIndex("reference_set_version_unique").on(table.code, table.version)],
);

export const metricDefinitions = sqliteTable(
  "metric_definitions",
  {
    id: text("id").primaryKey(),
    metricDefinitionSetId: text("metric_definition_set_id")
      .notNull()
      .references(() => metricDefinitionSets.id),
    metricCode: text("metric_code").notNull(),
    dimensionCode: text("dimension_code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    valueType: text("value_type").notNull(),
    rawUnit: text("raw_unit"),
    direction: text("direction").notNull(),
    indicatorWeightBps: integer("indicator_weight_bps").notNull(),
    aggregationMethod: text("aggregation_method").notNull(),
    aggregationConfigJson: text("aggregation_config_json").notNull(),
    normalizationMethod: text("normalization_method").notNull(),
    normalizationConfigJson: text("normalization_config_json").notNull(),
    referenceSetId: text("reference_set_id").references(() => referenceSets.id),
    freshnessWindowDays: integer("freshness_window_days").notNull(),
    minimumVerifiedClaims: integer("minimum_verified_claims").notNull(),
    minimumIndependentSources: integer("minimum_independent_sources").notNull(),
    critical: bool("critical").notNull(),
    missingDataPolicy: text("missing_data_policy").notNull(),
    outlierPolicy: text("outlier_policy").notNull(),
    inputPredicatesJson: text("input_predicates_json").notNull(),
    version: text("version").notNull(),
    status: text("status").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("metric_definition_code_unique").on(table.metricDefinitionSetId, table.metricCode),
  ],
);

export const weightProfiles = sqliteTable(
  "weight_profiles",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    version: text("version").notNull(),
    name: text("name").notNull(),
    dimensionWeightsJson: text("dimension_weights_json").notNull(),
    configHash: text("config_hash").notNull(),
    status: text("status").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [uniqueIndex("weight_profile_version_unique").on(table.code, table.version)],
);

export const scoringModels = sqliteTable(
  "scoring_models",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    version: text("version").notNull(),
    metricDefinitionSetId: text("metric_definition_set_id")
      .notNull()
      .references(() => metricDefinitionSets.id),
    opportunityFormulaJson: text("opportunity_formula_json").notNull(),
    priorityRulesJson: text("priority_rules_json").notNull(),
    hardBlockerRulesJson: text("hard_blocker_rules_json").notNull(),
    minimumCoverageJson: text("minimum_coverage_json").notNull(),
    configHash: text("config_hash").notNull(),
    status: text("status").notNull(),
    publishedAt: ts("published_at"),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [uniqueIndex("scoring_model_version_unique").on(table.code, table.version)],
);

export const scanRuns = sqliteTable(
  "scan_runs",
  {
    id: text("id").primaryKey(),
    scenarioRevisionId: text("scenario_revision_id")
      .notNull()
      .references(() => scenarioRevisions.id),
    status: text("status").notNull(),
    stage: text("stage").notNull(),
    inputHash: text("input_hash").notNull(),
    traceId: text("trace_id"),
    resultStatus: text("result_status").notNull(),
    productProfileRevisionId: text("product_profile_revision_id")
      .notNull()
      .references(() => productProfileRevisions.id),
    metricDefinitionSetId: text("metric_definition_set_id")
      .notNull()
      .references(() => metricDefinitionSets.id),
    scoringModelId: text("scoring_model_id")
      .notNull()
      .references(() => scoringModels.id),
    researchPolicyVersion: text("research_policy_version"),
    extractorPromptVersion: text("extractor_prompt_version"),
    validatorVersion: text("validator_version"),
    modelProvider: text("model_provider"),
    modelName: text("model_name"),
    dataAsOf: text("data_as_of"),
    requestedBy: text("requested_by")
      .notNull()
      .references(() => users.id),
    idempotencyKey: text("idempotency_key").notNull(),
    cancelRequestedAt: ts("cancel_requested_at"),
    startedAt: ts("started_at"),
    finishedAt: ts("finished_at"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("scan_run_idempotency_unique").on(table.requestedBy, table.idempotencyKey),
    index("scan_run_status_idx").on(table.status),
  ],
);

export const metricValues = sqliteTable(
  "metric_values",
  {
    id: text("id").primaryKey(),
    scanRunId: text("scan_run_id")
      .notNull()
      .references(() => scanRuns.id),
    countryId: text("country_id")
      .notNull()
      .references(() => countries.id),
    metricDefinitionId: text("metric_definition_id")
      .notNull()
      .references(() => metricDefinitions.id),
    rawValueJson: text("raw_value_json").notNull(),
    normalizedValueBps: integer("normalized_value_bps"),
    coverageBps: integer("coverage_bps").notNull(),
    sourceQualityBps: integer("source_quality_bps").notNull(),
    freshnessBps: integer("freshness_bps").notNull(),
    consistencyBps: integer("consistency_bps").notNull(),
    independenceBps: integer("independence_bps").notNull(),
    evidenceQualityIndexBps: integer("evidence_quality_index_bps").notNull(),
    status: text("status").notNull(),
    inputHash: text("input_hash").notNull(),
    calculationVersion: text("calculation_version").notNull(),
    calculatedAt: ts("calculated_at").notNull(),
  },
  (table) => [
    uniqueIndex("metric_value_unique").on(
      table.scanRunId,
      table.countryId,
      table.metricDefinitionId,
      table.inputHash,
    ),
    index("metric_value_lookup_idx").on(table.scanRunId, table.countryId, table.metricDefinitionId),
  ],
);

export const metricEvidenceLinks = sqliteTable(
  "metric_evidence_links",
  {
    metricValueId: text("metric_value_id")
      .notNull()
      .references(() => metricValues.id),
    evidenceClaimId: text("evidence_claim_id")
      .notNull()
      .references(() => evidenceClaims.id),
    role: text("role").notNull(),
    weightBps: integer("weight_bps").notNull(),
    reason: text("reason"),
  },
  (table) => [
    primaryKey({ columns: [table.metricValueId, table.evidenceClaimId, table.role] }),
  ],
);

export const scoreRuns = sqliteTable(
  "score_runs",
  {
    id: text("id").primaryKey(),
    scanRunId: text("scan_run_id")
      .notNull()
      .references(() => scanRuns.id),
    scoringModelId: text("scoring_model_id")
      .notNull()
      .references(() => scoringModels.id),
    inputHash: text("input_hash").notNull(),
    status: text("status").notNull(),
    startedAt: ts("started_at").notNull(),
    finishedAt: ts("finished_at"),
    errorCode: text("error_code"),
  },
  (table) => [uniqueIndex("score_run_unique").on(table.scanRunId, table.inputHash)],
);

export const scoreComponents = sqliteTable(
  "score_components",
  {
    id: text("id").primaryKey(),
    scoreRunId: text("score_run_id")
      .notNull()
      .references(() => scoreRuns.id),
    countryId: text("country_id")
      .notNull()
      .references(() => countries.id),
    dimensionCode: text("dimension_code").notNull(),
    scoreBps: integer("score_bps"),
    weightBps: integer("weight_bps").notNull(),
    contributionBps: integer("contribution_bps"),
    coverageBps: integer("coverage_bps").notNull(),
    evidenceQualityIndexBps: integer("evidence_quality_index_bps").notNull(),
    status: text("status").notNull(),
    inputHash: text("input_hash").notNull(),
  },
  (table) => [
    uniqueIndex("score_component_unique").on(table.scoreRunId, table.countryId, table.dimensionCode),
  ],
);

export const countryScores = sqliteTable(
  "country_scores",
  {
    id: text("id").primaryKey(),
    scoreRunId: text("score_run_id")
      .notNull()
      .references(() => scoreRuns.id),
    countryId: text("country_id")
      .notNull()
      .references(() => countries.id),
    marketAttractivenessBps: integer("market_attractiveness_bps"),
    entryEaseBps: integer("entry_ease_bps"),
    entryDifficultyBps: integer("entry_difficulty_bps"),
    opportunityScoreBps: integer("opportunity_score_bps"),
    priority: text("priority"),
    coverageBps: integer("coverage_bps").notNull(),
    evidenceQualityIndexBps: integer("evidence_quality_index_bps").notNull(),
    rank: integer("rank"),
    rankStability: text("rank_stability").notNull(),
    resultStatus: text("result_status").notNull(),
    dataAsOf: text("data_as_of"),
    inputHash: text("input_hash").notNull(),
  },
  (table) => [
    uniqueIndex("country_score_unique").on(table.scoreRunId, table.countryId),
    index("country_score_rank_idx").on(table.scoreRunId, table.rank),
  ],
);

export const scanEvents = sqliteTable(
  "scan_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scanRunId: text("scan_run_id")
      .notNull()
      .references(() => scanRuns.id),
    eventType: text("event_type").notNull(),
    stage: text("stage").notNull(),
    countryId: text("country_id"),
    topicCode: text("topic_code"),
    messageCode: text("message_code").notNull(),
    payloadJson: text("payload_json").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [index("scan_events_run_idx").on(table.scanRunId, table.id)],
);

/* ------------------------------ research jobs ---------------------------- */

export const researchPlans = sqliteTable(
  "research_plans",
  {
    id: text("id").primaryKey(),
    scanRunId: text("scan_run_id")
      .notNull()
      .references(() => scanRuns.id),
    researchPolicyVersion: text("research_policy_version").notNull(),
    planHash: text("plan_hash").notNull().unique(),
    status: text("status").notNull(),
    createdAt: ts("created_at").notNull(),
    completedAt: ts("completed_at"),
  },
  (table) => [uniqueIndex("research_plan_scan_unique").on(table.scanRunId)],
);

export const researchPlanItems = sqliteTable(
  "research_plan_items",
  {
    id: text("id").primaryKey(),
    researchPlanId: text("research_plan_id")
      .notNull()
      .references(() => researchPlans.id),
    countryId: text("country_id")
      .notNull()
      .references(() => countries.id),
    topicCode: text("topic_code").notNull(),
    requirementsJson: text("requirements_json").notNull(),
    budgetsJson: text("budgets_json").notNull(),
    preferredSourceTypesJson: text("preferred_source_types_json").notNull(),
    languagesJson: text("languages_json").notNull(),
    freshnessRequirementJson: text("freshness_requirement_json").notNull(),
    reuseDecisionJson: text("reuse_decision_json").notNull(),
    completionRuleJson: text("completion_rule_json").notNull(),
    status: text("status").notNull(),
    stopReason: text("stop_reason"),
    createdAt: ts("created_at").notNull(),
    completedAt: ts("completed_at"),
  },
  (table) => [
    uniqueIndex("research_plan_item_unique").on(
      table.researchPlanId,
      table.countryId,
      table.topicCode,
    ),
  ],
);

export const researchQueries = sqliteTable(
  "research_queries",
  {
    id: text("id").primaryKey(),
    researchPlanItemId: text("research_plan_item_id")
      .notNull()
      .references(() => researchPlanItems.id),
    queryText: text("query_text").notNull(),
    language: text("language").notNull(),
    queryHash: text("query_hash").notNull(),
    source: text("source").notNull(),
    status: text("status").notNull(),
    resultCount: integer("result_count"),
    createdAt: ts("created_at").notNull(),
    executedAt: ts("executed_at"),
  },
  (table) => [uniqueIndex("research_query_unique").on(table.researchPlanItemId, table.queryHash)],
);

export const researchJobs = sqliteTable(
  "research_jobs",
  {
    id: text("id").primaryKey(),
    scanRunId: text("scan_run_id")
      .notNull()
      .references(() => scanRuns.id),
    scenarioRevisionId: text("scenario_revision_id")
      .notNull()
      .references(() => scenarioRevisions.id),
    researchPlanItemId: text("research_plan_item_id")
      .notNull()
      .references(() => researchPlanItems.id),
    countryId: text("country_id")
      .notNull()
      .references(() => countries.id),
    topicCode: text("topic_code").notNull(),
    payloadJson: text("payload_json").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: text("status").notNull(),
    priority: integer("priority").notNull().default(100),
    workerId: text("worker_id"),
    leaseToken: text("lease_token"),
    leaseUntil: ts("lease_until"),
    heartbeatAt: ts("heartbeat_at"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    nextRetryAt: ts("next_retry_at"),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    stopReason: text("stop_reason"),
    resultSummaryJson: text("result_summary_json"),
    createdAt: ts("created_at").notNull(),
    startedAt: ts("started_at"),
    finishedAt: ts("finished_at"),
    cancelledAt: ts("cancelled_at"),
  },
  (table) => [
    index("research_jobs_claim_idx").on(table.status, table.priority, table.nextRetryAt),
    index("research_jobs_lease_idx").on(table.leaseUntil),
  ],
);

export const jobAttempts = sqliteTable(
  "job_attempts",
  {
    id: text("id").primaryKey(),
    researchJobId: text("research_job_id")
      .notNull()
      .references(() => researchJobs.id),
    attemptNo: integer("attempt_no").notNull(),
    workerId: text("worker_id").notNull(),
    leaseToken: text("lease_token").notNull(),
    startedAt: ts("started_at").notNull(),
    finishedAt: ts("finished_at"),
    status: text("status").notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    metricsJson: text("metrics_json"),
  },
  (table) => [uniqueIndex("job_attempt_unique").on(table.researchJobId, table.attemptNo)],
);

/* -------------------------------- agent ---------------------------------- */

export const aiRuns = sqliteTable("ai_runs", {
  id: text("id").primaryKey(),
  purpose: text("purpose").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  inputHash: text("input_hash").notNull(),
  outputHash: text("output_hash"),
  status: text("status").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  latencyMs: integer("latency_ms"),
  errorCode: text("error_code"),
  createdAt: ts("created_at").notNull(),
  finishedAt: ts("finished_at"),
});

export const agentSessions = sqliteTable("agent_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  activeScanRunId: text("active_scan_run_id"),
  createdAt: ts("created_at").notNull(),
  lastActiveAt: ts("last_active_at").notNull(),
});

export const agentMessages = sqliteTable(
  "agent_messages",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => agentSessions.id),
    role: text("role").notNull(),
    content: text("content").notNull(),
    citationsJson: text("citations_json").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [index("agent_messages_session_idx").on(table.sessionId, table.createdAt)],
);

export const toolCallLogs = sqliteTable("tool_call_logs", {
  id: text("id").primaryKey(),
  toolCallId: text("tool_call_id").notNull().unique(),
  sessionId: text("session_id"),
  runId: text("run_id"),
  userId: text("user_id").references(() => users.id),
  toolName: text("tool_name").notNull(),
  argsHash: text("args_hash").notNull(),
  resultHash: text("result_hash"),
  status: text("status").notNull(),
  errorCode: text("error_code"),
  resourceIdsJson: text("resource_ids_json"),
  latencyMs: integer("latency_ms"),
  createdAt: ts("created_at").notNull(),
  finishedAt: ts("finished_at"),
});
