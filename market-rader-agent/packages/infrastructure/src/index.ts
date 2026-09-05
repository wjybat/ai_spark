export {
  ConfigValidationError,
  environmentSchema,
  loadConfig,
} from "./config/environment.js";
export type { AppConfig, Environment, EnvironmentInput } from "./config/environment.js";
export { createJsonLogger } from "./logger.js";
export type { LogData, LogLevel, Logger } from "./logger.js";
export { openMarketDatabase, openTestDatabase } from "./db/connection.js";
export type { MarketDatabase } from "./db/connection.js";
export { schema } from "./db/connection.js";
export {
  agentMessages,
  agentSessions,
  aiRuns,
  evidenceCandidates,
  evidenceClaims,
  jobAttempts,
  metricEvidenceLinks,
  metricValues,
  researchJobs,
  toolCallLogs,
} from "./db/schema.js";
export { repoRoot, resolveFromRoot } from "./paths.js";
export {
  ensureTraceContext,
  getTraceContext,
  newRequestId,
  newTraceId,
  withTrace,
} from "./observability/trace.js";
export type { TraceContext } from "./observability/trace.js";
export { MetricsRegistry, METRIC_NAMES, metrics } from "./observability/metrics.js";
export { loadFixtureDataset, importFixtureEvidence } from "./fixture/importer.js";
export type { FixtureDataset } from "./fixture/importer.js";
export {
  DEFAULT_REGION_CODE,
  createDefaultScenario,
  createRegionalScenario,
  getMarketRegions,
  resolveMarketRegion,
} from "./usecases/scenario.js";
export type { CreatedScenario } from "./usecases/scenario.js";
export {
  cancelScanRun,
  finalizeReadyScanRuns,
  finalizeScanRun,
  runFixtureScan,
  runRecalculationScan,
  runResearchScan,
} from "./usecases/scan.js";
export type { RunFixtureScanInput, RunScanResult } from "./usecases/scan.js";
export {
  explainMetric,
  getCountryDetail,
  getRanking,
  getScanRuns,
  getScenarios,
} from "./usecases/queries.js";
export type {
  CountryDetailResult,
  MetricExplanationResult,
  RankingItem,
  RankingResult,
  ScanRunSummary,
  ScenarioSummary,
} from "./usecases/queries.js";
export {
  approveCandidate,
  getReviewQueue,
  queryVerifiedClaims,
  rejectCandidate,
} from "./usecases/review.js";
export type {
  EvidenceClaimItem,
  ReviewDecision,
  ReviewQueueItem,
} from "./usecases/review.js";
export {
  claimNextJob,
  commitJob,
  heartbeatJob,
  reapExpiredLeases,
  scanHasActiveJobs,
} from "./research/jobs.js";
export type { ClaimedJob } from "./research/jobs.js";
export { runResearchJob } from "./research/runner.js";
export type { ResearchDocumentProvider, ResearchProviderRequest } from "./research/runner.js";
export { loadResearchCorpus, buildResearchPlan } from "./research/plan.js";
export type {
  CorpusDocument,
  ExtractedResearchClaim,
  PlanBuildResult,
  ResearchCorpus,
} from "./research/plan.js";
export {
  PREDICATE_VALUE_CONTRACTS,
  RESEARCH_POLICY_VERSION,
  RESEARCH_TOPICS,
  isLowPrecisionAdvisoryError,
  localLanguageSearchInstruction,
  predicateContractInstruction,
  researchLanguages,
  topicResearchInstruction,
  validatePredicateEvidence,
  validatePredicateValue,
} from "./research/topics.js";
export { appendScanEvent } from "./usecases/events.js";
export { getScanEvents, getScanJobs, isScanTerminal } from "./usecases/events.js";
export { renderBusinessMetrics } from "./usecases/metrics-report.js";
