import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { loadConfig } from "../config/environment.js";
import { openMarketDatabase } from "./connection.js";
import { migrationsFolder, resolveFromRoot } from "../paths.js";

function main(): void {
  const config = loadConfig();
  const db = openMarketDatabase(
    resolveFromRoot(config.database.marketPath),
    config.database.sqliteBusyTimeoutMs,
  );
  migrate(db, { migrationsFolder });
  process.stdout.write(`Migrations applied to ${config.database.marketPath}\n`);
}

main();
