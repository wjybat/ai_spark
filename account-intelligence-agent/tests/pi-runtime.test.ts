import type { ModelRuntime } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_PI_AGENT_MODEL, selectPiModel } from "../src/lib/pi-runtime";

const originalModel = process.env.PI_AGENT_MODEL;

afterEach(() => {
  if (originalModel === undefined) delete process.env.PI_AGENT_MODEL;
  else process.env.PI_AGENT_MODEL = originalModel;
});

describe("Pi model selection", () => {
  it("defaults to the local dmall GLM model", async () => {
    delete process.env.PI_AGENT_MODEL;
    const selected = { provider: "dmall-router", id: "glm-5.3-zp" };
    const modelRuntime = {
      getModel(provider: string, model: string) {
        expect(`${provider}/${model}`).toBe(DEFAULT_PI_AGENT_MODEL);
        return selected;
      },
    } as unknown as ModelRuntime;

    expect(await selectPiModel(modelRuntime)).toBe(selected);
  });

  it("rejects malformed model names", async () => {
    process.env.PI_AGENT_MODEL = "glm-5.3-zp";
    const modelRuntime = { getModel: () => undefined } as unknown as ModelRuntime;
    await expect(selectPiModel(modelRuntime)).rejects.toThrow("provider/model");
  });
});
