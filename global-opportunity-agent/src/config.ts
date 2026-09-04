import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

export type RequestedAgentMode = "auto" | "demo" | "live";
export type LiveProvider = "dmall-router" | "openai" | "anthropic" | "openai-compatible";

function parseMode(value: string | undefined): RequestedAgentMode {
  if (value === "demo" || value === "live" || value === "auto") return value;
  return "auto";
}

function parseProvider(value: string | undefined): LiveProvider {
  if (value === "anthropic" || value === "openai" || value === "dmall-router" || value === "openai-compatible") return value;
  return "dmall-router";
}

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const config = {
  mode: parseMode(process.env.AGENT_MODE),
  provider: parseProvider(process.env.AGENT_PROVIDER),
  model: process.env.AGENT_MODEL ?? "gpt-5.6-luna",
  baseUrl: process.env.AGENT_BASE_URL ?? "https://ai-router.dmall.com/v1",
  thinkingEffort: process.env.AGENT_THINKING_EFFORT === "off" ? "off" as const : process.env.AGENT_THINKING_EFFORT === "low" ? "low" as const : process.env.AGENT_THINKING_EFFORT === "max" ? "max" as const : process.env.AGENT_THINKING_EFFORT === "xhigh" ? "xhigh" as const : "high" as const,
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 8787),
  projectDir,
  frontendDir: path.resolve(projectDir, process.env.FRONTEND_DIR ?? "../global-opportunity-radar"),
};

export function hasLiveCredential(provider = config.provider): boolean {
  if (provider === "dmall-router") return Boolean(process.env.DMALL_AI_API_KEY);
  return provider === "openai" || provider === "openai-compatible" ? Boolean(process.env.OPENAI_API_KEY) : Boolean(process.env.ANTHROPIC_API_KEY);
}

export function resolveMode(requested: RequestedAgentMode = config.mode): "demo" | "live" {
  if (requested === "demo") return "demo";
  if (requested === "live") {
    if (!hasLiveCredential()) throw new Error(`AGENT_MODE=live requires a ${config.provider} API credential`);
    return "live";
  }
  return hasLiveCredential() ? "live" : "demo";
}
