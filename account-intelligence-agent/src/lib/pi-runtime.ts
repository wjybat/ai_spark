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

export async function selectPiModel(modelRuntime: ModelRuntime) {
  const configured = process.env.PI_AGENT_MODEL?.trim();
  if (configured) {
    const slash = configured.indexOf("/");
    if (slash < 1) throw new Error("PI_AGENT_MODEL 必须使用 provider/model 格式");
    const model = modelRuntime.getModel(configured.slice(0, slash), configured.slice(slash + 1));
    if (!model) throw new Error(`Pi 模型不存在: ${configured}`);
    return model;
  }
  const runtimeProvider = process.env.PI_PROVIDER;
  const runtimeModel = process.env.PI_MODEL;
  if (runtimeProvider && runtimeModel) {
    const inherited = modelRuntime.getModel(runtimeProvider, runtimeModel);
    if (inherited) return inherited;
  }
  const persistedSettings = SettingsManager.create(process.cwd(), getAgentDir());
  const defaultProvider = persistedSettings.getDefaultProvider();
  const defaultModel = persistedSettings.getDefaultModel();
  if (defaultProvider && defaultModel) {
    const saved = modelRuntime.getModel(defaultProvider, defaultModel);
    if (saved) return saved;
  }
  const available = await modelRuntime.getAvailable();
  if (!available.length) throw new Error("Pi 没有可用模型，请先运行 pi /login 或配置模型 API Key");
  return available[0];
}
