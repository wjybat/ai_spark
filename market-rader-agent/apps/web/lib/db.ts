import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  loadConfig,
  openMarketDatabase,
  type AppConfig,
  type MarketDatabase,
} from "@market-radar/infrastructure";

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const entries: Record<string, string> = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    entries[key] = value;
  }
  return entries;
}

function buildEnvironment(): Record<string, string | undefined> {
  const candidates = [
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), ".env"),
  ];
  const fileEnv: Record<string, string> = {};
  for (const candidate of candidates) {
    Object.assign(fileEnv, parseEnvFile(candidate));
  }
  return { ...fileEnv, ...process.env };
}

interface WebDbGlobal {
  __marketRadarDb?: MarketDatabase;
  __marketRadarConfig?: AppConfig;
}

const globalRef = globalThis as unknown as WebDbGlobal;

/** Root-aware validated config shared by all Web server modules. */
export function getWebConfig(): AppConfig {
  if (globalRef.__marketRadarConfig === undefined) {
    globalRef.__marketRadarConfig = loadConfig(buildEnvironment());
  }
  return globalRef.__marketRadarConfig;
}

/** Singleton database connection for the web app. */
export function getDb(): MarketDatabase {
  if (globalRef.__marketRadarDb === undefined) {
    const config = getWebConfig();
    globalRef.__marketRadarDb = openMarketDatabase(
      path.resolve(process.cwd(), "../../", config.database.marketPath),
      config.database.sqliteBusyTimeoutMs,
    );
  }
  return globalRef.__marketRadarDb;
}
