import { createProvider, type Model, type Provider } from "@earendil-works/pi-ai";
import { stream, streamSimple } from "@earendil-works/pi-ai/api/openai-responses";

export const DMALL_ROUTER_PROVIDER_ID = "dmall-ai-router";

export interface DmallRouterProviderOptions {
  baseUrl: string;
  modelId: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function createDmallRouterModel(options: DmallRouterProviderOptions): Model<"openai-responses"> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  return {
    id: options.modelId,
    name: options.modelId,
    api: "openai-responses",
    provider: DMALL_ROUTER_PROVIDER_ID,
    baseUrl,
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200_000,
    maxTokens: 32_768,
    compat: {
      supportsDeveloperRole: true,
      supportsLongCacheRetention: false,
      supportsStrictMode: false,
      supportsExplicitPromptCacheMode: false,
    },
  };
}

export function dmallRouterProvider(options: DmallRouterProviderOptions): Provider<"openai-responses"> {
  const model = createDmallRouterModel(options);
  return createProvider({
    id: DMALL_ROUTER_PROVIDER_ID,
    name: "Dmall AI Router",
    baseUrl: model.baseUrl,
    auth: {
      apiKey: {
        name: "Dmall AI Router API key",
        resolve: async ({ ctx, signal }) => {
          if (signal.aborted) return undefined;
          const key = await ctx.env("DMALL_AI_API_KEY");
          return key ? { auth: { apiKey: key }, source: "DMALL_AI_API_KEY" } : undefined;
        },
      },
    },
    models: [model],
    api: { stream, streamSimple },
  });
}
