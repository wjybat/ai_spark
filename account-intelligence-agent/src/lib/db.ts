import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const schema = `
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, normalized_name TEXT NOT NULL UNIQUE,
  country TEXT, region TEXT, industry TEXT, owner TEXT,
  category TEXT NOT NULL DEFAULT 'UNTAPPED', stage TEXT NOT NULL DEFAULT 'TARGET', status TEXT NOT NULL DEFAULT 'ACTIVE',
  profile_json TEXT NOT NULL DEFAULT '{}', last_activity_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_state ON customers(category, stage, status);
CREATE TABLE IF NOT EXISTS customer_aliases (
  alias_normalized TEXT PRIMARY KEY, alias_display TEXT NOT NULL, customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS source_items (
  id TEXT PRIMARY KEY, customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL, source_system TEXT NOT NULL, external_id TEXT NOT NULL, title TEXT,
  content TEXT NOT NULL, content_hash TEXT NOT NULL, file_path TEXT, occurred_at TEXT, received_at TEXT NOT NULL,
  author TEXT, metadata_json TEXT NOT NULL DEFAULT '{}', processing_status TEXT NOT NULL DEFAULT 'PENDING',
  error_message TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE(source_system, external_id)
);
CREATE INDEX IF NOT EXISTS idx_sources_customer_time ON source_items(customer_id, occurred_at DESC);
CREATE TABLE IF NOT EXISTS processing_jobs (
  id TEXT PRIMARY KEY, source_item_id TEXT NOT NULL REFERENCES source_items(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL DEFAULT 'PROCESS_SOURCE', status TEXT NOT NULL DEFAULT 'PENDING', attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT, created_at TEXT NOT NULL, started_at TEXT, finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status, created_at);
CREATE TABLE IF NOT EXISTS customer_events (
  id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  source_item_id TEXT NOT NULL REFERENCES source_items(id) ON DELETE CASCADE, event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL, summary TEXT NOT NULL, importance INTEGER NOT NULL DEFAULT 5,
  confidence REAL NOT NULL DEFAULT 1, payload_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_customer_time ON customer_events(customer_id, occurred_at DESC);
CREATE TABLE IF NOT EXISTS customer_facts (
  id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  source_item_id TEXT NOT NULL REFERENCES source_items(id) ON DELETE CASCADE, fact_type TEXT NOT NULL,
  fact_key TEXT NOT NULL, fact_value TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 1,
  evidence_text TEXT, is_current INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_facts_current ON customer_facts(customer_id, fact_type, fact_key, is_current);
CREATE TABLE IF NOT EXISTS customer_summaries (
  customer_id TEXT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE, current_state TEXT NOT NULL,
  key_requirements_json TEXT NOT NULL DEFAULT '[]', key_blockers_json TEXT NOT NULL DEFAULT '[]',
  success_factors_json TEXT NOT NULL DEFAULT '[]', failure_reasons_json TEXT NOT NULL DEFAULT '[]',
  reusable_playbook_json TEXT NOT NULL DEFAULT '[]', next_actions_json TEXT NOT NULL DEFAULT '[]',
  evidence_json TEXT NOT NULL DEFAULT '[]', generated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS customer_experiences (
  id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  experience_type TEXT NOT NULL, stage TEXT, title TEXT NOT NULL, description TEXT NOT NULL,
  action TEXT, outcome TEXT, confidence REAL NOT NULL DEFAULT 1, source_item_ids_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
);
`;

export function createDatabase(path: string): DatabaseSync {
  const absolute = path === ":memory:" ? path : resolve(path);
  if (absolute !== ":memory:") mkdirSync(dirname(absolute), { recursive: true });
  const db = new DatabaseSync(absolute);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(schema);
  const factColumns = db.prepare("PRAGMA table_info(customer_facts)").all() as unknown as Array<{ name: string }>;
  if (!factColumns.some((column) => column.name === "evidence_text")) db.exec("ALTER TABLE customer_facts ADD COLUMN evidence_text TEXT");
  return db;
}

const globalDb = globalThis as typeof globalThis & { customerIntelligenceDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalDb.customerIntelligenceDb) globalDb.customerIntelligenceDb = createDatabase(process.env.DATABASE_PATH || "./data/app.db");
  return globalDb.customerIntelligenceDb;
}

export function transaction<T>(db: DatabaseSync, action: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try { const value = action(); db.exec("COMMIT"); return value; }
  catch (error) { db.exec("ROLLBACK"); throw error; }
}
