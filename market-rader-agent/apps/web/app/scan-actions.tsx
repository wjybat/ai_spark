"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  buildScanRequest,
  parseRegionCode,
  REGION_CHANGE_EVENT,
  type RegionCode,
} from "@/lib/regions";
import { Icon } from "./ui/icons";

/** Header 扫描按钮：按当前区域创建对应的版本化 Scenario。 */
export function ScanButton({
  researchProvider,
  initialRegion,
}: {
  researchProvider: string;
  initialRegion: RegionCode;
}): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState<"fixture" | "research" | null>(null);
  const [regionCode, setRegionCode] = useState<RegionCode>(initialRegion);

  useEffect(() => {
    setRegionCode(initialRegion);
    const onRegionChange = (event: Event): void => {
      const value = (event as CustomEvent<{ regionCode?: unknown }>).detail?.regionCode;
      const region = parseRegionCode(value);
      if (region !== null) setRegionCode(region);
    };
    window.addEventListener(REGION_CHANGE_EVENT, onRegionChange);
    return () => window.removeEventListener(REGION_CHANGE_EVENT, onRegionChange);
  }, [initialRegion]);

  async function run(mode: "fixture" | "research"): Promise<void> {
    setPending(mode);
    try {
      await fetch("/api/scan-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildScanRequest(mode, regionCode, Date.now())),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (researchProvider === "pi-agent") {
    return (
      <button
        type="button"
        className="btn-scan"
        id="btn-scan"
        onClick={() => void run("research")}
        disabled={pending !== null}
      >
        <Icon name="scan" size={15} />
        <span>{pending === "research" ? "创建中…" : "开始 Pi 扫描"}</span>
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button type="button" className="btn-secondary" onClick={() => void run("research")} disabled={pending !== null}>
        <Icon name="database" size={15} />
        <span>{pending === "research" ? "创建中…" : "研究扫描"}</span>
      </button>
      <button type="button" className="btn-scan" id="btn-scan" onClick={() => void run("fixture")} disabled={pending !== null}>
        <Icon name="scan" size={15} />
        <span>{pending === "fixture" ? "扫描中…" : "开始扫描"}</span>
      </button>
    </div>
  );
}

/** 页面自动刷新（进行中的扫描） */
export function AutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }): null {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}

export function CancelScanButton({
  scanRunId,
  cancellationRequested,
}: {
  scanRunId: string;
  cancellationRequested: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [requested, setRequested] = useState(cancellationRequested);

  useEffect(() => {
    if (cancellationRequested) setRequested(true);
  }, [cancellationRequested]);

  async function cancel(): Promise<void> {
    setPending(true);
    setRequested(true);
    try {
      const response = await fetch(`/api/scan-runs/${scanRunId}/cancel`, { method: "POST" });
      if (!response.ok) throw new Error(`Cancel request failed with HTTP ${response.status}`);
      router.refresh();
    } catch {
      setRequested(false);
    } finally {
      setPending(false);
    }
  }
  return (
    <button
      type="button"
      className="btn-danger"
      onClick={() => void cancel()}
      disabled={pending || requested}
      title={requested ? "已提交取消请求，正在停止当前 Pi 任务" : "取消扫描"}
    >
      {requested ? "正在取消…" : "取消"}
    </button>
  );
}

/** 洞察 chips：向 Agent 抽屉发问 */
export function AskChip({ message, children }: { message: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <button
      type="button"
      className="chip"
      onClick={() => window.dispatchEvent(new CustomEvent("agent:ask", { detail: { message } }))}
    >
      {children}
    </button>
  );
}
