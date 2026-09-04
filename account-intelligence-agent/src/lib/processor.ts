import type { DatabaseSync } from "node:sqlite";
import { extract, heuristicExtract } from "./extractor";
import { analyzeWithPiAgent } from "./pi-agent";
import { getDb, transaction } from "./db";
import { recomputeState } from "./state-engine";
import { refreshSummary } from "./summary";
import type { CustomerRow, Extraction, SourceRow } from "./types";
import { makeId, nowIso } from "./utils";

interface JobRow { id: string; source_item_id: string; status: string; attempts: number }
interface FactRow { fact_type: string; fact_key: string; fact_value: string }

function compact(value: string): string { return value.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, ""); }
function grams(value: string): Set<string> {
  const normalized = compact(value);
  const result = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index++) result.add(normalized.slice(index, index + 2));
  return result;
}
export function findVerbatimEvidence(content: string, claim: string, proposed?: string | null): string | null {
  for (const candidate of [proposed, claim]) {
    const exact = candidate?.trim();
    if (exact && content.includes(exact)) return exact;
  }
  const target = grams(proposed || claim);
  if (!target.size) return null;
  let best = ""; let bestScore = 0;
  for (const raw of content.split(/\n{2,}|\n/)) {
    const paragraph = raw.replace(/^#{1,6}\s*/, "").trim();
    if (paragraph.length < 8) continue;
    const paragraphGrams = grams(paragraph);
    let overlap = 0;
    for (const token of target) if (paragraphGrams.has(token)) overlap++;
    const score = overlap / target.size;
    if (score > bestScore) { best = paragraph; bestScore = score; }
  }
  return bestScore >= 0.08 ? best.slice(0, 800) : null;
}

export function recoverStaleJobs(db: DatabaseSync = getDb()): number {
  const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  const result = db.prepare("UPDATE processing_jobs SET status='PENDING',started_at=NULL WHERE status='PROCESSING' AND started_at < ?").run(cutoff);
  return Number(result.changes);
}

export function claimNextJob(db: DatabaseSync = getDb()): JobRow | null {
  return transaction(db, () => {
    const job = db.prepare("SELECT * FROM processing_jobs WHERE status='PENDING' ORDER BY created_at LIMIT 1").get() as JobRow | undefined;
    if (!job) return null;
    db.prepare("UPDATE processing_jobs SET status='PROCESSING',attempts=attempts+1,started_at=?,error_message=NULL WHERE id=?").run(nowIso(), job.id);
    return { ...job, status: "PROCESSING", attempts: job.attempts + 1 };
  });
}

function mergeFact(db: DatabaseSync, customerId: string, sourceId: string, fact: Extraction["facts"][number]): void {
  db.prepare("UPDATE customer_facts SET is_current=0 WHERE customer_id=? AND fact_type=? AND fact_key=? AND is_current=1").run(customerId, fact.fact_type, fact.fact_key);
  db.prepare("INSERT INTO customer_facts (id,customer_id,source_item_id,fact_type,fact_key,fact_value,confidence,evidence_text,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(makeId("fac"), customerId, sourceId, fact.fact_type, fact.fact_key, fact.fact_value, fact.confidence, fact.evidence_text || null, nowIso());
}

function mergeExtractions(primary: Extraction, supplemental: Extraction): Extraction {
  const eventTypes = new Set(primary.events.map((event) => event.event_type));
  const supplementalEvents = supplemental.events.filter((event) => !(primary.events.length && event.event_type === "FIRST_CONTACT") && !eventTypes.has(event.event_type));
  const factKeys = new Set(primary.facts.map((fact) => `${fact.fact_type}:${fact.fact_key}`));
  const actionKeys = new Set(primary.next_actions.map((item) => item.action));
  return {
    events: [...primary.events, ...supplementalEvents],
    facts: [...primary.facts, ...supplemental.facts.filter((fact) => !factKeys.has(`${fact.fact_type}:${fact.fact_key}`))],
    next_actions: [...primary.next_actions, ...supplemental.next_actions.filter((item) => !actionKeys.has(item.action))],
  };
}

export async function processJob(job: JobRow, db: DatabaseSync = getDb(), override?: Extraction): Promise<void> {
  const source = db.prepare("SELECT * FROM source_items WHERE id=?").get(job.source_item_id) as SourceRow | undefined;
  if (!source?.customer_id) throw new Error("任务来源或客户不存在");
  const customer = db.prepare("SELECT * FROM customers WHERE id=?").get(source.customer_id) as CustomerRow | undefined;
  if (!customer) throw new Error("客户不存在");
  const currentFacts = db.prepare("SELECT fact_type,fact_key,fact_value FROM customer_facts WHERE customer_id=? AND is_current=1 LIMIT 30").all(source.customer_id) as unknown as FactRow[];
  try {
    let result = override;
    if (!result && process.env.PI_AGENT_ENABLED !== "false") {
      try {
        result = await analyzeWithPiAgent(db, customer, source);
      } catch (error) {
        if (process.env.PI_AGENT_FALLBACK === "false") throw error;
        console.warn(`[pi-agent] 基座 Agent 不可用，回退本地抽取器: ${error instanceof Error ? error.message : "未知错误"}`);
      }
    }
    if (result) result = mergeExtractions(result, heuristicExtract(source.content, source.occurred_at));
    else result = await extract(customer.name, currentFacts, source.content, source.occurred_at);
    transaction(db, () => {
      db.prepare("DELETE FROM customer_events WHERE source_item_id=?").run(source.id);
      db.prepare("DELETE FROM customer_facts WHERE source_item_id=?").run(source.id);
      const addEvent = db.prepare("INSERT INTO customer_events (id,customer_id,source_item_id,event_type,occurred_at,summary,importance,confidence,payload_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
      for (const event of result.events) addEvent.run(makeId("evt"), source.customer_id, source.id, event.event_type, event.occurred_at || source.occurred_at || source.received_at, event.summary, event.importance, event.confidence, JSON.stringify({ evidence_text: findVerbatimEvidence(source.content, event.summary, event.evidence_text) }), nowIso());
      for (const fact of result.facts) mergeFact(db, source.customer_id!, source.id, { ...fact, evidence_text: findVerbatimEvidence(source.content, fact.fact_value, fact.evidence_text) });
      result.next_actions.forEach((next, index) => mergeFact(db, source.customer_id!, source.id, { fact_type: "NEXT_ACTION", fact_key: `action_${index + 1}`, fact_value: next.action, confidence: 0.8, evidence_text: findVerbatimEvidence(source.content, next.action, next.reason) }));
      recomputeState(db, source.customer_id!);
      refreshSummary(db, source.customer_id!);
      const now = nowIso();
      db.prepare("UPDATE source_items SET processing_status='DONE',error_message=NULL,updated_at=? WHERE id=?").run(now, source.id);
      db.prepare("UPDATE processing_jobs SET status='DONE',error_message=NULL,finished_at=? WHERE id=?").run(now, job.id);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "处理失败";
    transaction(db, () => {
      const nextStatus = job.attempts < 2 ? "PENDING" : "FAILED";
      db.prepare("UPDATE processing_jobs SET status=?,error_message=?,finished_at=? WHERE id=?").run(nextStatus, message, nextStatus === "FAILED" ? nowIso() : null, job.id);
      db.prepare("UPDATE source_items SET processing_status=?,error_message=?,updated_at=? WHERE id=?").run(nextStatus, message, nowIso(), source.id);
    });
    throw error;
  }
}

export async function processNext(db: DatabaseSync = getDb()): Promise<boolean> {
  const job = claimNextJob(db);
  if (!job) return false;
  try { await processJob(job, db); } catch (error) { console.error(`[worker] ${job.id} 处理失败`, error); }
  return true;
}
