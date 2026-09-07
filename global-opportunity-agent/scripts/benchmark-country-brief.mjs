// Explicit opt-in: this calls the configured live model and may incur API charges.
// Build first. Run from global-opportunity-agent with the same env file as the service.
import { runCountryBrief } from "../dist/agent/country-brief.js";

if (!process.argv.includes("--live")) {
  console.error("Usage: node --env-file=.env scripts/benchmark-country-brief.mjs --live [countryId]");
  process.exit(2);
}
const countryId = process.argv.slice(2).find(value => value !== "--live") || "canada";
const started = performance.now();
try {
  const output = await runCountryBrief({
    runId: `benchmark-${crypto.randomUUID()}`, countryId, mode: "live",
  }, () => {});
  // No prompt, API key, generated report, or business DB is written by this script.
  console.log(JSON.stringify({
    benchmark: "country-brief", status: "completed", countryId,
    elapsedMs: Math.round(performance.now() - started),
    model: output.modelRun.model, thinkingEffort: output.modelRun.thinkingEffort,
    companyCount: output.analysis.companyAssessments.length,
    usage: output.modelRun.usage, diagnostics: output.diagnostics,
  }));
} catch (error) {
  console.error(JSON.stringify({
    benchmark: "country-brief", status: "failed", countryId,
    elapsedMs: Math.round(performance.now() - started),
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
}
