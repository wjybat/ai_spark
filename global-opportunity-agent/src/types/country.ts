import type { GenerationProvenance, PipelineOutput } from "./domain.js";
export interface CountryEvidence {
  id: string; companyId: string; kind: "fact" | "inference"; scope: string; text: string;
  source?: { title: string; url: string };
}
export interface CountryCompany {
  id: string; name: string; role: string; countryId: string; summary: string;
  footprint: string; footprintScope: string; financial: string; business: string[];
  digital: string[]; systems: string[]; organization: string; roles: string[];
  signals: string[]; opportunity: string; risks: string[]; evidence: CountryEvidence[];
}
export interface CountryBriefAnalysis {
  title: string; executiveSummary: string;
  regionalPriority: { level: string; score: number; rationale: string };
  opportunityLogic: string;
  companyAssessments: Array<{ companyId: string; role: string; opportunity: string; risk: string; recommendedAction: string; evidenceIds: string[] }>;
  keySignals: Array<{ title: string; detail: string; companyIds: string[]; evidenceIds: string[]; basis: "事实" | "研判" }>;
  risks: Array<{ title: string; detail: string; mitigation: string; companyIds: string[]; evidenceIds: string[] }>;
  nextActions: Array<{ horizon: string; owner: string; action: string; deliverable: string }>;
  confidence: { level: "高" | "中" | "低"; rationale: string; gaps: string[] };
}
export interface CountryContext {
  countryId: string; countryName: string; regionId: string; regionName: string; asOf: string;
  market: Record<string, unknown>; methodology: Record<string, string>;
  companies: CountryCompany[]; evidence: CountryEvidence[]; draft: CountryBriefAnalysis;
}
export interface CountryBriefOutput {
  scope: "country"; runId: string; mode: "demo" | "live"; countryId: string; countryName: string;
  regionId: string; regionName: string; startedAt: string; completedAt: string;
  analysis: CountryBriefAnalysis; companies: CountryCompany[]; evidence: CountryEvidence[];
  generation: GenerationProvenance; finalNarrative: string; modelRun: PipelineOutput["modelRun"];
}
