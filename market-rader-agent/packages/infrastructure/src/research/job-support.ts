import { eq } from "drizzle-orm";

import type { MarketDatabase } from "../db/connection.js";
import { scanRuns } from "../db/schema.js";

export { commitJob, heartbeatJob } from "./jobs.js";

export async function isScanCancelledViaScanRuns(
  db: MarketDatabase,
  scanRunId: string,
): Promise<boolean> {
  const rows = await db
    .select({ cancelRequestedAt: scanRuns.cancelRequestedAt })
    .from(scanRuns)
    .where(eq(scanRuns.id, scanRunId));
  const value = rows[0]?.cancelRequestedAt;
  return value !== null && value !== undefined;
}
