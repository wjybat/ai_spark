import type { ModelRuntime } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";

import { DEFAULT_PI_AGENT_MODEL, selectPiModel } from "./pi-model.js";

describe("Pi model selection", () => {
  it("selects the local dmall GLM model by default", () => {
    const selected = { provider: "dmall-router", id: "glm-5.3-zp" };
    const modelRuntime = {
      getModel(provider: string, model: string) {
        expect(`${provider}/${model}`).toBe(DEFAULT_PI_AGENT_MODEL);
        return selected;
      },
    } as unknown as ModelRuntime;

    expect(selectPiModel(modelRuntime)).toBe(selected);
  });

  it("fails clearly when the local model is unavailable", () => {
    const modelRuntime = { getModel: () => undefined } as unknown as ModelRuntime;
    expect(() => selectPiModel(modelRuntime)).toThrow("~/.pi/agent/models.json");
  });
});
