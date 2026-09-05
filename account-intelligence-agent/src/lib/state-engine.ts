import type { DatabaseSync } from "node:sqlite";
import type { CustomerRow } from "./types";
import { nowIso } from "./utils";

const eventStage: Record<string, string> = {
  FIRST_CONTACT: "CONTACTED", DISCOVERY_COMPLETED: "DISCOVERY", REQUIREMENT_IDENTIFIED: "QUALIFIED",
  SOLUTION_PRESENTED: "SOLUTION", POC_PROPOSED: "POC", POC_STARTED: "POC", POC_COMPLETED: "POC",
  COMMERCIAL_STARTED: "COMMERCIAL", CONTRACT_SIGNED: "CONTRACT", DEPLOYMENT_STARTED: "DEPLOYMENT",
  PRODUCTION_STARTED: "PRODUCTION", EXPANSION_STARTED: "EXPANSION", LOST: "CLOSED_LOST",
};
const rank: Record<string, number> = { TARGET: 0, RESEARCH: 1, CONTACTED: 2, DISCOVERY: 3, QUALIFIED: 4, SOLUTION: 5, POC: 6, COMMERCIAL: 7, CONTRACT: 8, DEPLOYMENT: 9, PRODUCTION: 10, EXPANSION: 11, CLOSED_LOST: 12 };
const statusEventTypes = new Set(["LOST", "CONTRACT_SIGNED", "DEPLOYMENT_STARTED", "PRODUCTION_STARTED", "PROJECT_PAUSED", "PROJECT_RESUMED"]);
interface EventRow { event_type: string; occurred_at: string }

export function recomputeState(db: DatabaseSync, customerId: string): CustomerRow {
  const customer = db.prepare("SELECT * FROM customers WHERE id=?").get(customerId) as CustomerRow | undefined;
  if (!customer) throw new Error(`客户不存在: ${customerId}`);
  const events = db.prepare("SELECT event_type,occurred_at FROM customer_events WHERE customer_id=? ORDER BY occurred_at,created_at").all(customerId) as unknown as EventRow[];
  let stage = "TARGET";
  for (const event of events) {
    const next = eventStage[event.event_type];
    if (next && (next === "CLOSED_LOST" || rank[next] >= rank[stage])) stage = next;
  }
  const latestStatus = [...events].reverse().find((event) => statusEventTypes.has(event.event_type));
  const types = new Set(events.map((event) => event.event_type));
  let status = "ACTIVE";
  if (latestStatus?.event_type === "LOST") status = "LOST";
  else if (["CONTRACT_SIGNED", "DEPLOYMENT_STARTED", "PRODUCTION_STARTED"].some((type) => types.has(type))) status = "WON";
  else if (latestStatus?.event_type === "PROJECT_PAUSED") status = "STALLED";
  else if (latestStatus?.event_type === "PROJECT_RESUMED") status = "ACTIVE";
  else if (events.length && new Date(events.at(-1)!.occurred_at).getTime() < Date.now() - 60 * 86400_000) status = "STALLED";
  const category = ["CONTRACT", "DEPLOYMENT", "PRODUCTION", "EXPANSION"].includes(stage)
    ? "CONVERTED" : rank[stage] >= rank.CONTACTED ? "UNCONVERTED" : "UNTAPPED";
  const lastActivity = events.at(-1)?.occurred_at || customer.last_activity_at;
  db.prepare("UPDATE customers SET category=?,stage=?,status=?,last_activity_at=?,updated_at=? WHERE id=?")
    .run(category, stage, status, lastActivity, nowIso(), customerId);
  return { ...customer, category, stage, status, last_activity_at: lastActivity, updated_at: nowIso() };
}
