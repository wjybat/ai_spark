import type {
  AdmissionResult,
  CustomerPoolResult,
  CustomerProfileResult,
  EvidenceChainResult,
  MarketRadarResult,
  OpportunitySignal,
  ProductMatchResult,
  ResearchBriefResult,
  RiskResult,
} from "../types/domain.js";

export interface ToolStageDetails<T> {
  stage: number;
  label: string;
  progress: number;
  output?: T;
}

export class PipelineWorkspace {
  marketRadar: MarketRadarResult | undefined;
  customerPool: CustomerPoolResult | undefined;
  customerProfile: CustomerProfileResult | undefined;
  opportunitySignals: OpportunitySignal[] | undefined;
  admission: AdmissionResult | undefined;
  evidenceChain: EvidenceChainResult | undefined;
  productMatch: ProductMatchResult | undefined;
  riskAssessment: RiskResult | undefined;
  researchBrief: ResearchBriefResult | undefined;
}
