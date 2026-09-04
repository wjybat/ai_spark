import { createProvider, type Model, type Provider } from "@earendil-works/pi-ai";
import { stream, streamSimple } from "@earendil-works/pi-ai/api/openai-completions";

export const COMPATIBLE_PROVIDER_ID = "openai-compatible";
export function createCompatibleModel(options: { baseUrl: string; modelId: string }): Model<"openai-completions"> {
  return {
    id: options.modelId, name: options.modelId, api: "openai-completions", provider: COMPATIBLE_PROVIDER_ID,
    baseUrl: options.baseUrl.replace(/\/+$/, ""), reasoning: true, input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128_000, maxTokens: 16_384,
    compat: { supportsStore: false, supportsDeveloperRole: false, supportsReasoningEffort: false,
      maxTokensField: "max_tokens", supportsStrictMode: false, thinkingFormat: "qwen" },
  };
}
export function compatibleProvider(options: { baseUrl: string; modelId: string }): Provider<"openai-completions"> {
  const model = createCompatibleModel(options);
  return createProvider({
    id: COMPATIBLE_PROVIDER_ID, name: "OpenAI compatible", baseUrl: model.baseUrl, models: [model],
    auth: { apiKey: { name: "Compatible API key", resolve: async ({ ctx, signal }) => {
      if (signal.aborted) return undefined;
      const key = await ctx.env("OPENAI_API_KEY");
      return key ? { auth: { apiKey: key }, source: "OPENAI_API_KEY" } : undefined;
    } } }, api: { stream, streamSimple },
  });
}
