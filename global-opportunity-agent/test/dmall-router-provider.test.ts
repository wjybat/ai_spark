import { describe, expect, it } from "vitest";
import { createDmallRouterModel, dmallRouterProvider, DMALL_ROUTER_PROVIDER_ID } from "../src/agent/dmall-router-provider.js";

describe("Dmall AI Router provider", () => {
  it("creates an xhigh-capable OpenAI Responses model against the configured router", () => {
    const model = createDmallRouterModel({ baseUrl: "https://ai-router.dmall.com/v1/", modelId: "gpt-5.6-luna" });
    const provider = dmallRouterProvider({ baseUrl: "https://ai-router.dmall.com/v1/", modelId: "gpt-5.6-luna" });
    expect(model.provider).toBe(DMALL_ROUTER_PROVIDER_ID);
    expect(model.api).toBe("openai-responses");
    expect(model.reasoning).toBe(true);
    expect(model.baseUrl).toBe("https://ai-router.dmall.com/v1");
    expect(provider.getModels()[0]?.id).toBe("gpt-5.6-luna");
  });
});
