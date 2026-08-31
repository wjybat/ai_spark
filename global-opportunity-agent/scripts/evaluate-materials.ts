// Explicit opt-in live evaluation. Reads normal local configuration; never logs credentials.
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { runOpportunityPipeline } from "../src/agent/orchestrator.js";

const { values } = parseArgs({ options: {
  customer: { type: "string", default: "cencosud" },
  region: { type: "string", default: "south-america" },
  output: { type: "string" },
} });
const deadline = setTimeout(() => { console.error("Live evaluation exceeded 240 seconds"); process.exit(1); }, 240_000);
try {
  const started = Date.now();
  let toolErrors = 0;
  const output = await runOpportunityPipeline({
    runId: `materials-evaluation-${Date.now()}`, customerId: values.customer!, regionId: values.region!, mode: "live",
  }, event => {
    if (event.type === "tool_start") console.log(`[${event.stage}/9] ${event.label}`);
    if (event.type === "tool_end" && event.message === "tool failed") { toolErrors += 1; console.log(`Validation/execution retry: ${event.toolName}`); }
  });
  if (values.output) await writeFile(values.output, JSON.stringify(output, null, 2));
  console.log(JSON.stringify({
    runId: output.runId, seconds: (Date.now() - started) / 1000, toolErrors,
    model: output.modelRun.model, thinkingEffort: output.modelRun.thinkingEffort, usage: output.modelRun.usage,
    matching: output.productMatch,
    email: output.researchBrief.outreachEmail,
  }, null, 2));
} finally { clearTimeout(deadline); }
