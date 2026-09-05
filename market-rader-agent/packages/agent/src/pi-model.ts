import type { ModelRuntime } from "@earendil-works/pi-coding-agent";

export const DEFAULT_PI_AGENT_MODEL = "dmall-router/glm-5.3-zp";

/** Resolve an explicit Pi model while leaving its URL and credential in the local Pi configuration. */
export function selectPiModel(modelRuntime: ModelRuntime, configuredModel = DEFAULT_PI_AGENT_MODEL) {
  const slash = configuredModel.indexOf("/");
  if (slash < 1 || slash === configuredModel.length - 1) {
    throw new Error("PI_AGENT_MODEL must use provider/model format");
  }
  const model = modelRuntime.getModel(
    configuredModel.slice(0, slash),
    configuredModel.slice(slash + 1),
  );
  if (model === undefined) {
    throw new Error(
      `Pi model not found: ${configuredModel}; check the local ~/.pi/agent/models.json`,
    );
  }
  return model;
}
