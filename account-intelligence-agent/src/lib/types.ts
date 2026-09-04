import { z } from "zod";

export const sourceTypes = ["MEETING", "CRM_FOLLOWUP", "RESEARCH", "PROJECT_REVIEW", "EMAIL", "DOCUMENT", "AGENT_SESSION", "MANUAL_NOTE", "OTHER"] as const;
export const eventTypes = ["FIRST_CONTACT", "DISCOVERY_COMPLETED", "REQUIREMENT_IDENTIFIED", "SOLUTION_PRESENTED", "POC_PROPOSED", "POC_STARTED", "POC_COMPLETED", "POSITIVE_FEEDBACK", "NEGATIVE_FEEDBACK", "BUDGET_APPROVED", "BUDGET_REJECTED", "PROJECT_PAUSED", "PROJECT_RESUMED", "COMMERCIAL_STARTED", "CONTRACT_SIGNED", "DEPLOYMENT_STARTED", "PRODUCTION_STARTED", "EXPANSION_STARTED", "LOST"] as const;
export const factTypes = ["REQUIREMENT", "BLOCKER", "DECISION_MAKER", "INFLUENCER", "STORE_COUNT", "BUDGET", "COMPETITOR", "PRODUCT_INTEREST", "SUCCESS_METRIC", "SUCCESS_FACTOR", "FAILURE_REASON", "PLAYBOOK", "NEXT_ACTION", "OTHER"] as const;

export const customerCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  country: z.string().optional(),
  region: z.string().optional(),
  industry: z.string().optional(),
  owner: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  profile: z.record(z.unknown()).default({}),
});

export const ingestSchema = z.object({
  source_type: z.enum(sourceTypes),
  source_system: z.string().min(1).max(100),
  external_id: z.string().min(1).max(300),
  customer: z.object({ id: z.string().nullish(), name: z.string().nullish() }).refine((value) => value.id || value.name, "客户 ID 和名称至少提供一项"),
  title: z.string().nullish(),
  content: z.string().min(1),
  occurred_at: z.string().datetime({ offset: true }).nullish(),
  author: z.string().nullish(),
  metadata: z.record(z.unknown()).default({}),
  auto_create_customer: z.boolean().default(false),
});

export const structuredEventSchema = z.object({
  customer_id: z.string().min(1),
  event_type: z.enum(eventTypes),
  occurred_at: z.string().datetime({ offset: true }),
  summary: z.string().min(1),
  importance: z.number().int().min(1).max(10).default(7),
  source: z.object({ system: z.string().min(1), external_id: z.string().min(1) }),
});

export const extractionSchema = z.object({
  events: z.array(z.object({
    event_type: z.enum(eventTypes),
    occurred_at: z.string().datetime({ offset: true }).nullish(),
    summary: z.string().min(1),
    importance: z.number().int().min(1).max(10).default(5),
    confidence: z.number().min(0).max(1).default(1),
    evidence_text: z.string().nullish(),
  })).default([]),
  facts: z.array(z.object({
    fact_type: z.enum(factTypes),
    fact_key: z.string().min(1),
    fact_value: z.string().min(1),
    confidence: z.number().min(0).max(1).default(1),
    evidence_text: z.string().nullish(),
  })).default([]),
  next_actions: z.array(z.object({ action: z.string().min(1), reason: z.string().nullish() })).default([]),
});

export type CustomerCreate = z.infer<typeof customerCreateSchema>;
export type IngestInput = z.infer<typeof ingestSchema>;
export type StructuredEventInput = z.infer<typeof structuredEventSchema>;
export type Extraction = z.infer<typeof extractionSchema>;

export interface CustomerRow {
  id: string; name: string; normalized_name: string; country: string | null; region: string | null;
  industry: string | null; owner: string | null; category: string; stage: string; status: string;
  profile_json: string; last_activity_at: string | null; created_at: string; updated_at: string;
}

export interface SourceRow {
  id: string; customer_id: string | null; source_type: string; source_system: string; external_id: string;
  title: string | null; content: string; content_hash: string; file_path: string | null; occurred_at: string | null;
  received_at: string; author: string | null; metadata_json: string; processing_status: string;
  error_message: string | null; created_at: string; updated_at: string;
}
