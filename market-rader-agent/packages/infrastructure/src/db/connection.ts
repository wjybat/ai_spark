import { mkdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema.js";

export type MarketDatabase = BetterSQLite3Database<typeof schema> & {
  readonly $client: Database.Database;
};

function applyPragmas(sqlite: Database.Database, busyTimeoutMs: number): void {
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("synchronous = FULL");
  sqlite.pragma(`busy_timeout = ${busyTimeoutMs}`);
}

export function openMarketDatabase(dbPath: string, busyTimeoutMs: number): MarketDatabase {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  applyPragmas(sqlite, busyTimeoutMs);
  return drizzle(sqlite, { schema });
}

/** Isolated in-memory database for integration tests. */
export function openTestDatabase(): MarketDatabase {
  const sqlite = new Database(":memory:");
  applyPragmas(sqlite, 5_000);
  return drizzle(sqlite, { schema });
}

export { schema };
