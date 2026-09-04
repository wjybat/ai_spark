import type { DatabaseSync } from "node:sqlite";
import { resolveCustomer } from "./customers";
import type { IngestInput, SourceRow } from "./types";
import { contentHash, makeId, nowIso } from "./utils";

export interface IngestResult { source_id: string; job_id: string; status: "accepted" | "already_exists" | "updated" }
export interface RetryJobResult { source_id: string; job_id: string; customer_id: string | null; status: "accepted" }

export function retryFailedJob(db: DatabaseSync, failedJobId: string): RetryJobResult {
  const failed = db.prepare(`SELECT j.status,s.id source_id,s.customer_id FROM processing_jobs j
    JOIN source_items s ON s.id=j.source_item_id WHERE j.id=?`).get(failedJobId) as { status: string; source_id: string; customer_id: string | null } | undefined;
  if (!failed) throw new Error("任务不存在");
  if (failed.status !== "FAILED") throw new Error("只有失败任务可以重新分析");
  const now = nowIso();
  const jobId = makeId("job");
  db.prepare("UPDATE source_items SET processing_status='PENDING',error_message=NULL,updated_at=? WHERE id=?").run(now, failed.source_id);
  db.prepare("INSERT INTO processing_jobs (id,source_item_id,created_at) VALUES (?,?,?)").run(jobId, failed.source_id, now);
  return { source_id: failed.source_id, job_id: jobId, customer_id: failed.customer_id, status: "accepted" };
}

export function ingest(db: DatabaseSync, input: IngestInput, filePath?: string): IngestResult {
  const customer = resolveCustomer(db, input.customer, input.auto_create_customer);
  const hash = contentHash(input.content);
  const existing = db.prepare("SELECT * FROM source_items WHERE source_system=? AND external_id=?").get(input.source_system, input.external_id) as SourceRow | undefined;
  const now = nowIso();
  if (existing?.content_hash === hash) {
    const job = db.prepare("SELECT id FROM processing_jobs WHERE source_item_id=? ORDER BY created_at DESC LIMIT 1").get(existing.id) as { id: string } | undefined;
    if (job) return { source_id: existing.id, job_id: job.id, status: "already_exists" };
    const jobId = makeId("job");
    db.prepare("INSERT INTO processing_jobs (id,source_item_id,created_at) VALUES (?,?,?)").run(jobId, existing.id, now);
    return { source_id: existing.id, job_id: jobId, status: "already_exists" };
  }

  const sourceId = existing?.id || makeId("src");
  if (existing) {
    const affectedFacts = db.prepare("SELECT DISTINCT customer_id,fact_type,fact_key FROM customer_facts WHERE source_item_id=?").all(sourceId) as unknown as Array<{ customer_id: string; fact_type: string; fact_key: string }>;
    db.prepare("DELETE FROM customer_events WHERE source_item_id=?").run(sourceId);
    db.prepare("DELETE FROM customer_facts WHERE source_item_id=?").run(sourceId);
    for (const fact of affectedFacts) {
      db.prepare("UPDATE customer_facts SET is_current=0 WHERE customer_id=? AND fact_type=? AND fact_key=?").run(fact.customer_id, fact.fact_type, fact.fact_key);
      const latest = db.prepare("SELECT id FROM customer_facts WHERE customer_id=? AND fact_type=? AND fact_key=? ORDER BY created_at DESC LIMIT 1").get(fact.customer_id, fact.fact_type, fact.fact_key) as { id: string } | undefined;
      if (latest) db.prepare("UPDATE customer_facts SET is_current=1 WHERE id=?").run(latest.id);
    }
    db.prepare(`UPDATE source_items SET customer_id=?,source_type=?,title=?,content=?,content_hash=?,file_path=COALESCE(?,file_path),
      occurred_at=?,received_at=?,author=?,metadata_json=?,processing_status='PENDING',error_message=NULL,updated_at=? WHERE id=?`)
      .run(customer.id, input.source_type, input.title || null, input.content, hash, filePath || null, input.occurred_at || null, now, input.author || null, JSON.stringify(input.metadata), now, sourceId);
  } else {
    db.prepare(`INSERT INTO source_items (id,customer_id,source_type,source_system,external_id,title,content,content_hash,file_path,occurred_at,received_at,author,metadata_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(sourceId, customer.id, input.source_type, input.source_system, input.external_id, input.title || null,
      input.content, hash, filePath || null, input.occurred_at || null, now, input.author || null, JSON.stringify(input.metadata), now, now);
  }
  const jobId = makeId("job");
  db.prepare("INSERT INTO processing_jobs (id,source_item_id,created_at) VALUES (?,?,?)").run(jobId, sourceId, now);
  return { source_id: sourceId, job_id: jobId, status: existing ? "updated" : "accepted" };
}
