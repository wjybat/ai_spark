import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { createDatabase, transaction } from "../src/lib/db";
import { ingest, retryFailedJob } from "../src/lib/ingestion";
import { claimNextJob, findVerbatimEvidence, processJob } from "../src/lib/processor";
import { heuristicExtract } from "../src/lib/extractor";
import { recomputeState } from "../src/lib/state-engine";
import { createCustomer } from "../src/lib/customers";
import { contentHash, makeId, nowIso } from "../src/lib/utils";
import type { Extraction } from "../src/lib/types";

const databases: DatabaseSync[] = [];
const dirs: string[] = [];
afterEach(() => { databases.splice(0).forEach((db) => db.close()); dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })); });
const memoryDb = () => { const db = createDatabase(":memory:"); databases.push(db); return db; };
const sample = (externalId = "meeting-1") => ({
  source_type: "MEETING" as const, source_system: "test", external_id: externalId,
  customer: { name: "Tesco" }, title: "PoC 讨论", content: "客户希望选择 10 家门店开展 PoC",
  occurred_at: "2026-09-03T02:00:00.000Z", author: "Jack", metadata: {}, auto_create_customer: true,
});

const fixedExtraction: Extraction = {
  events: [{ event_type: "POC_PROPOSED", occurred_at: "2026-09-03T02:00:00.000Z", summary: "客户提出 10 家门店 PoC", importance: 8, confidence: 0.95, evidence_text: "10 家门店" }],
  facts: [
    { fact_type: "STORE_COUNT", fact_key: "poc_scope", fact_value: "10", confidence: 0.92, evidence_text: "10 家门店" },
    { fact_type: "FAILURE_REASON", fact_key: "solution_delay", fact_value: "方案确认曾延期", confidence: 0.9, evidence_text: "延期 14 天" },
    { fact_type: "PLAYBOOK", fact_key: "modular_signoff", fact_value: "分模块确认、整体收口", confidence: 0.9, evidence_text: "分模块确认" },
  ],
  next_actions: [{ action: "确认 ROI 指标", reason: "需要成功标准" }],
};

describe("客户情报核心链路", () => {
  it("更新不能隐式创建客户，显式授权后创建 Source 和 Job", () => {
    const db = memoryDb();
    expect(() => transaction(db, () => ingest(db, { ...sample(), auto_create_customer: false }))).toThrow("请先新建客户");
    const result = transaction(db, () => ingest(db, sample()));
    expect(result.status).toBe("accepted");
    expect((db.prepare("SELECT COUNT(*) count FROM source_items").get() as { count: number }).count).toBe(1);
    expect((db.prepare("SELECT status FROM processing_jobs WHERE id=?").get(result.job_id) as { status: string }).status).toBe("PENDING");
  });

  it("完全相同的来源重复接入不会重复处理", () => {
    const db = memoryDb();
    const first = transaction(db, () => ingest(db, sample()));
    const second = transaction(db, () => ingest(db, sample()));
    expect(second).toEqual({ ...first, status: "already_exists" });
    expect((db.prepare("SELECT COUNT(*) count FROM processing_jobs").get() as { count: number }).count).toBe(1);
  });

  it("Worker 将固定材料转换为 Event、Fact 和 Summary", async () => {
    const db = memoryDb();
    transaction(db, () => ingest(db, sample()));
    const job = claimNextJob(db)!;
    await processJob(job, db, fixedExtraction);
    expect((db.prepare("SELECT event_type FROM customer_events").get() as { event_type: string }).event_type).toBe("POC_PROPOSED");
    const storeFact = db.prepare("SELECT fact_value,evidence_text FROM customer_facts WHERE fact_type='STORE_COUNT'").get() as { fact_value: string; evidence_text: string };
    expect(storeFact.fact_value).toBe("10");
    expect(storeFact.evidence_text).toBe("10 家门店");
    expect(db.prepare("SELECT current_state FROM customer_summaries").get()).toBeTruthy();
    expect((db.prepare("SELECT COUNT(*) count FROM customer_experiences").get() as { count: number }).count).toBe(2);
  });

  it("证据抽取优先保留原文，并为改写结论定位最相关段落", () => {
    const content = "# 项目复盘\n\nSolution 初版原计划 7 月 3 日完成，实际到 7 月 17 日确认，延期 14 天。\n\n项目涉及 27 个核心接口。";
    expect(findVerbatimEvidence(content, "方案延期", "延期 14 天")).toBe("延期 14 天");
    expect(findVerbatimEvidence(content, "Solution 业务确认较计划延期十四天")).toContain("Solution 初版原计划");
    expect(heuristicExtract("12 月完成 UAT 并计划试点上线", null).events.some((event) => event.event_type.startsWith("POC"))).toBe(false);
  });

  it("已有推进但未签约的活跃客户归类为未转化", () => {
    const db = memoryDb();
    transaction(db, () => ingest(db, sample("active-solution")));
    const source = db.prepare("SELECT customer_id,id FROM source_items LIMIT 1").get() as { customer_id: string; id: string };
    const now = nowIso();
    db.prepare("INSERT INTO customer_events (id,customer_id,source_item_id,event_type,occurred_at,summary,importance,confidence,payload_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(makeId("evt"), source.customer_id, source.id, "SOLUTION_PRESENTED", now, "方案已确认", 8, 1, "{}", now);
    const state = recomputeState(db, source.customer_id);
    expect([state.category, state.stage, state.status]).toEqual(["UNCONVERTED", "SOLUTION", "ACTIVE"]);
  });

  it("CONTRACT_SIGNED 得到已落地、合同、赢单状态", () => {
    const db = memoryDb();
    transaction(db, () => {
      const customer = createCustomer(db, { name: "Carrefour", aliases: [], profile: {} });
      const sourceId = makeId("src"); const now = nowIso();
      db.prepare(`INSERT INTO source_items (id,customer_id,source_type,source_system,external_id,content,content_hash,received_at,metadata_json,processing_status,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(sourceId, customer.id, "CRM_FOLLOWUP", "test", "signed", "合同签署", contentHash("合同签署"), now, "{}", "DONE", now, now);
      db.prepare("INSERT INTO customer_events (id,customer_id,source_item_id,event_type,occurred_at,summary,importance,confidence,payload_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(makeId("evt"), customer.id, sourceId, "CONTRACT_SIGNED", now, "合同已签", 10, 1, "{}", now);
      const state = recomputeState(db, customer.id);
      expect([state.category, state.stage, state.status]).toEqual(["CONVERTED", "CONTRACT", "WON"]);
    });
  });

  it("失败任务可以创建新的重试任务", () => {
    const db = memoryDb();
    const result = transaction(db, () => ingest(db, sample("retry")));
    db.prepare("UPDATE processing_jobs SET status='FAILED',attempts=2,error_message='模型不可用' WHERE id=?").run(result.job_id);
    db.prepare("UPDATE source_items SET processing_status='FAILED',error_message='模型不可用' WHERE id=?").run(result.source_id);
    const retry = transaction(db, () => retryFailedJob(db, result.job_id));
    expect(retry.job_id).not.toBe(result.job_id);
    expect((db.prepare("SELECT status FROM processing_jobs WHERE id=?").get(retry.job_id) as { status: string }).status).toBe("PENDING");
    expect((db.prepare("SELECT processing_status FROM source_items WHERE id=?").get(result.source_id) as { processing_status: string }).processing_status).toBe("PENDING");
  });

  it("失败任务标记 FAILED，数据库重开后待处理任务仍存在", async () => {
    const dir = mkdtempSync(join(tmpdir(), "customer-intelligence-")); dirs.push(dir);
    const path = join(dir, "app.db");
    const db = createDatabase(path);
    const result = transaction(db, () => ingest(db, sample("failure")));
    let job = claimNextJob(db)!;
    job.attempts = 2;
    await expect(processJob(job, db, { events: null } as unknown as Extraction)).rejects.toBeTruthy();
    expect((db.prepare("SELECT status FROM processing_jobs WHERE id=?").get(result.job_id) as { status: string }).status).toBe("FAILED");
    transaction(db, () => ingest(db, sample("survives-restart")));
    db.close();
    const reopened = createDatabase(path); databases.push(reopened);
    expect((reopened.prepare("SELECT COUNT(*) count FROM processing_jobs WHERE status='PENDING'").get() as { count: number }).count).toBe(1);
  });
});
