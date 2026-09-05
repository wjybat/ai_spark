import { getDb } from "../lib/db";
import { processNext, recoverStaleJobs } from "../lib/processor";

const once = process.argv.includes("--once");
const interval = Number(process.env.WORKER_POLL_INTERVAL_MS || 1000);
let running = true;
process.on("SIGINT", () => { running = false; });
process.on("SIGTERM", () => { running = false; });

async function main() {
  const db = getDb();
  const recovered = recoverStaleJobs(db);
  if (recovered) console.log(`[worker] 已恢复 ${recovered} 个超时任务`);
  do {
    const processed = await processNext(db);
    if (once) break;
    if (!processed) await new Promise((resolve) => setTimeout(resolve, interval));
  } while (running);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
