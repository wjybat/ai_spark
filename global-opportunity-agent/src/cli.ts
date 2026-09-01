import { parseArgs } from "node:util";
import { runOpportunityPipeline } from "./agent/orchestrator.js";

const { values } = parseArgs({
  options: {
    region: { type: "string", default: "global" },
    customer: { type: "string", default: "cencosud" },
    "country-id": { type: "string" },
    "country-name": { type: "string" },
    mode: { type: "string", default: "auto" },
  },
});
const mode = values.mode === "live" || values.mode === "auto" ? values.mode : "demo";
const output = await runOpportunityPipeline(
  {
    runId: `cli-${Date.now()}`,
    regionId: values.region ?? "global",
    customerId: values.customer ?? "cencosud",
    ...(values["country-id"] ? { countryId: values["country-id"] } : {}),
    ...(values["country-name"] ? { countryName: values["country-name"] } : {}),
    mode,
  },
  (event) => {
    if (event.type === "tool_start") console.log(`[${event.stage}/9] ${event.label}`);
    if (event.type === "tool_progress") console.log(`  progress: ${JSON.stringify(event.data)}`);
    if (event.type === "tool_end") console.log(`  completed: ${event.toolName}`);
  },
);

console.log("\nFinal narrative:\n", output.finalNarrative);
console.log("Mode:", output.mode);
console.log("Model:", `${output.modelRun.provider}/${output.modelRun.model}`, `thinking=${output.modelRun.thinkingEffort}`);
console.log("Usage:", output.modelRun.usage);
console.log("\nAdmission:", output.admission.label, output.admission.referenceScore);
console.log("Top matches:", output.productMatch.matches.slice(0, 3).map((match) => match.capabilityName).join(", "));
