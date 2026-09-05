import { getAgentDir, ModelRuntime, SettingsManager } from "@earendil-works/pi-coding-agent";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

export function configurePiProxy(): void {
  const globalSettings = SettingsManager.create(process.cwd(), getAgentDir()).getGlobalSettings();
  if (globalSettings.httpProxy && !process.env.HTTP_PROXY && !process.env.HTTPS_PROXY) {
    process.env.HTTP_PROXY = globalSettings.httpProxy;
    process.env.HTTPS_PROXY = globalSettings.httpProxy;
  }
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY) setGlobalDispatcher(new EnvHttpProxyAgent());
}

export const DEFAULT_PI_AGENT_MODEL = "dmall-router/glm-5.3-zp";

export async function selectPiModel(modelRuntime: ModelRuntime) {
  const configured = process.env.PI_AGENT_MODEL?.trim() || DEFAULT_PI_AGENT_MODEL;
  const slash = configured.indexOf("/");
  if (slash < 1 || slash === configured.length - 1) {
    throw new Error("PI_AGENT_MODEL 必须使用 provider/model 格式");
  }
  const model = modelRuntime.getModel(configured.slice(0, slash), configured.slice(slash + 1));
  if (!model) {
    throw new Error(`Pi 模型不存在: ${configured}，请检查本机 ~/.pi/agent/models.json`);
  }
  return model;
}
