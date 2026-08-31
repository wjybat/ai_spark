export type SourceLevel = "A" | "B" | "C";
export type Confidence = "high" | "medium" | "low";
export type FactKind = "fact" | "inference";
export type AdmissionLabel = "高潜" | "可跟进" | "观察中" | "风险较高" | "暂不建议优先投入";
export type RiskLevel = "high" | "medium" | "low";

export interface EvidenceRecord {
  id: string;
  customerId: string;
  regionId: string;
  category: "financial" | "expansion" | "digital" | "system" | "event" | "regulation" | "organization";
  title: string;
  excerpt: string;
  sourceUrl: string;
  sourceType: string;
  sourceLevel: SourceLevel;
  publishedAt: string;
  retrievedAt: string;
  confidence: Confidence;
  kind: FactKind;
  tags: string[];
}

export interface CustomerRecord {
  id: string;
  name: string;
  aliases: string[];
  headquarters: string;
  countries: string[];
  regionId: string;
  formats: string[];
  storeCount: number;
  storeCountLabel: string;
  revenueUsd: number;
  revenueLabel: string;
  revenuePeriod: string;
  businessAreas: string[];
  digitalFoundation: string[];
  knownSystems: string[];
  itTeamEvidence: string;
  managementSignals: string[];
  expansionSignals: string[];
  knownDecisionRoles: string[];
  currentUnknowns: string[];
  strategicSummary: string;
}

export interface RegionRecord {
  id: string;
  name: string;
  countries: string[];
  customerIds: string[];
  marketSummary: string;
  digitalDemand: number;
  marketAttractiveness: number;
  entryFriction: number;
  evidenceConfidence: number;
  regulationNotes: string[];
}

export interface ProductCapability {
  id: string;
  name: string;
  layer: string;
  description: string;
  targetSignals: string[];
  targetScenarios: string[];
  prerequisites: string[];
  deliveryComplexity: RiskLevel;
  avoidClaims: string[];
}

export interface MarketRadarResult {
  regionId: string;
  regionName: string;
  opportunityScore: number;
  heat: "high" | "medium" | "watch";
  summary: string;
  dimensions: Array<{ name: string; score: number; explanation: string }>;
  recommendedCountries: string[];
  customerCount: number;
  evidenceIds: string[];
  caveat: string;
}

export interface CustomerPoolItem {
  customerId: string;
  name: string;
  country: string;
  formats: string[];
  storeCountLabel: string;
  revenueLabel: string;
  digitalFoundation: string[];
  poolScore: number;
  reason: string;
  unknownCount: number;
}

export interface CustomerPoolResult {
  regionId: string;
  generatedAt: string;
  customers: CustomerPoolItem[];
  rankingBasis: string[];
}

export interface CustomerProfileResult {
  customerId: string;
  name: string;
  headquarters: string;
  countries: string[];
  formats: string[];
  storeCountLabel: string;
  revenueLabel: string;
  revenuePeriod: string;
  businessAreas: string[];
  digitalFoundation: string[];
  knownSystems: string[];
  organization: string;
  recentDynamics: string[];
  decisionRoles: string[];
  unknowns: string[];
  evidenceIds: string[];
}

export interface OpportunitySignal {
  id: string;
  type: "expansion" | "digital_upgrade" | "system_change" | "hiring" | "event" | "integration";
  title: string;
  summary: string;
  direction: string;
  strength: Confidence;
  evidenceIds: string[];
  interpretation: string;
}

export interface AdmissionDimension {
  name: string;
  status: "positive" | "neutral" | "risk" | "unknown";
  explanation: string;
  evidenceIds: string[];
}

export interface AdmissionResult {
  customerId: string;
  label: AdmissionLabel;
  referenceScore: number;
  dimensions: AdmissionDimension[];
  rationale: string;
  mustConfirm: string[];
  disclaimer: string;
}

export interface EvidenceChainResult {
  customerId: string;
  records: EvidenceRecord[];
  coverage: {
    facts: number;
    inferences: number;
    sourceLevelA: number;
    sourceLevelB: number;
    sourceLevelC: number;
    latestPublishedAt: string;
  };
  missingEvidence: string[];
}

export interface CapabilityMatch {
  capabilityId: string;
  capabilityName: string;
  fitScore: number;
  fit: "high" | "medium" | "low";
  reasons: string[];
  prerequisites: string[];
  evidenceIds: string[];
  caution: string;
  pilotScope?: string;
}

export interface GenerationProvenance {
  source: "llm" | "rules";
  generatedAt: string;
  requiresHumanReview: true;
  provider?: string;
  model?: string;
  thinkingEffort?: string;
}

export interface OutreachEmail {
  subject: string;
  body: string;
  angle?: string;
  evidenceIds?: string[];
  generation?: GenerationProvenance;
}

export interface ProductMatchResult {
  customerId: string;
  matches: CapabilityMatch[];
  positioning: string;
  avoidClaims: string[];
  generation?: GenerationProvenance;
}

export interface RiskItem {
  id: string;
  type: "existing_system" | "localization" | "data_compliance" | "budget" | "decision_chain" | "implementation" | "evidence_gap";
  level: RiskLevel;
  title: string;
  reason: string;
  mitigation: string;
  requiresHumanConfirmation: boolean;
  evidenceIds: string[];
}

export interface RiskResult {
  customerId: string;
  overall: RiskLevel;
  risks: RiskItem[];
  pendingConfirmations: string[];
}

export interface ResearchBriefResult {
  customerId: string;
  generatedAt: string;
  executiveSummary: string;
  admission: AdmissionLabel;
  opportunitySignals: string[];
  recommendedEntryPoints: string[];
  firstMeetingQuestions: string[];
  outreachEmail: OutreachEmail;
  internalActions: string[];
  risksAndUnknowns: string[];
  nextActions: string[];
  evidenceIds: string[];
}

export interface PipelineOutput {
  runId: string;
  mode: "demo" | "live";
  regionId: string;
  customerId: string;
  startedAt: string;
  completedAt: string;
  marketRadar: MarketRadarResult;
  customerPool: CustomerPoolResult;
  customerProfile: CustomerProfileResult;
  opportunitySignals: OpportunitySignal[];
  admission: AdmissionResult;
  evidenceChain: EvidenceChainResult;
  productMatch: ProductMatchResult;
  riskAssessment: RiskResult;
  researchBrief: ResearchBriefResult;
  finalNarrative: string;
  modelRun: {
    provider: string;
    model: string;
    thinkingEffort: string;
    narrative: string;
    usage: {
      input: number;
      output: number;
      totalTokens: number;
      cost: number;
    };
  };
}

export type PipelineEventType =
  | "run_created"
  | "agent_start"
  | "tool_start"
  | "tool_progress"
  | "tool_end"
  | "message_delta"
  | "run_complete"
  | "run_error";

export interface PipelineEvent {
  id: number;
  runId: string;
  type: PipelineEventType;
  timestamp: string;
  stage?: number;
  toolName?: string;
  label?: string;
  message?: string;
  data?: unknown;
}
