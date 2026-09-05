"use client";

import { AlertCircle, CheckCircle2, Clock3, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type JobStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";
interface TrackedJob {
  jobId: string;
  customerId: string;
  customerName: string;
  title: string;
  status: JobStatus;
  error?: string | null;
  createdAt: string;
}
interface JobResult { id: string; status: JobStatus; error_message: string | null }

const storageKey = "customer-intelligence:analysis-jobs";
const activeStatuses = new Set<JobStatus>(["PENDING", "PROCESSING"]);
const statusText: Record<JobStatus, string> = { PENDING: "等待分析", PROCESSING: "Pi Agent 分析中", DONE: "分析完成", FAILED: "分析失败" };

function readStoredJobs(): TrackedJob[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "[]") as TrackedJob[];
    const cutoff = Date.now() - 24 * 60 * 60_000;
    return value.filter((job) => activeStatuses.has(job.status) || job.status === "FAILED" || new Date(job.createdAt).getTime() > cutoff).slice(0, 5);
  } catch { return []; }
}

export function JobTracker() {
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const jobsRef = useRef<TrackedJob[]>([]);
  const pollingRef = useRef(false);

  function updateJobs(updater: (current: TrackedJob[]) => TrackedJob[]) {
    setJobs((current) => {
      const next = updater(current);
      jobsRef.current = next;
      return next;
    });
  }

  useEffect(() => {
    const stored = readStoredJobs();
    jobsRef.current = stored;
    setJobs(stored);
    setHydrated(true);
    const add = (event: Event) => {
      const detail = (event as CustomEvent<{ jobId: string; customerId: string; customerName: string; title: string }>).detail;
      if (!detail?.jobId) return;
      updateJobs((current) => [{ ...detail, status: "PENDING" as const, createdAt: new Date().toISOString() }, ...current.filter((job) => job.jobId !== detail.jobId)].slice(0, 5));
    };
    window.addEventListener("analysis-job-created", add);
    return () => window.removeEventListener("analysis-job-created", add);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(storageKey, JSON.stringify(jobs));
  }, [jobs, hydrated]);

  useEffect(() => {
    const poll = async () => {
      if (pollingRef.current) return;
      const snapshot = jobsRef.current;
      const active = snapshot.filter((job) => activeStatuses.has(job.status));
      if (!active.length) return;
      pollingRef.current = true;
      try {
        const results = await Promise.all(active.map(async (job) => {
          try {
            const response = await fetch(`/api/v1/jobs/${job.jobId}`, { cache: "no-store" });
            if (!response.ok) throw new Error("任务状态读取失败");
            return { tracked: job, result: await response.json() as JobResult };
          } catch (error) {
            return { tracked: job, result: null, pollError: error instanceof Error ? error.message : "任务状态读取失败" };
          }
        }));
        updateJobs((current) => current.map((job) => {
          const item = results.find(({ tracked }) => tracked.jobId === job.jobId);
          if (!item?.result) return item?.pollError ? { ...job, error: item.pollError } : job;
          return { ...job, status: item.result.status, error: item.result.error_message };
        }));
        for (const { tracked, result } of results) {
          if (!result || !activeStatuses.has(tracked.status) || activeStatuses.has(result.status)) continue;
          window.dispatchEvent(new CustomEvent("customer-analysis-completed", { detail: { customerId: tracked.customerId, status: result.status } }));
        }
      } finally { pollingRef.current = false; }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1500);
    return () => window.clearInterval(timer);
  }, []);

  const dismiss = (jobId: string) => updateJobs((current) => current.filter((job) => job.jobId !== jobId));
  const retry = async (job: TrackedJob) => {
    updateJobs((current) => current.map((item) => item.jobId === job.jobId ? { ...item, error: null } : item));
    try {
      const response = await fetch(`/api/v1/jobs/${job.jobId}/retry`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "重新分析失败");
      updateJobs((current) => [{ ...job, jobId: result.job_id, status: "PENDING", error: null, createdAt: new Date().toISOString() }, ...current.filter((item) => item.jobId !== job.jobId)]);
    } catch (error) {
      updateJobs((current) => current.map((item) => item.jobId === job.jobId ? { ...item, error: error instanceof Error ? error.message : "重新分析失败" } : item));
    }
  };

  if (!jobs.length) return null;
  return <aside className="job-tracker" aria-label="材料分析任务" aria-live="polite">
    <div className="job-tracker-title"><span><Clock3 size={15} />材料分析</span><small>{jobs.filter((job) => activeStatuses.has(job.status)).length ? "后台处理中" : "最近任务"}</small></div>
    {jobs.map((job) => <article key={job.jobId} className={`job-item job-${job.status.toLowerCase()}`}>
      <span className="job-status-icon">{job.status === "DONE" ? <CheckCircle2 /> : job.status === "FAILED" ? <AlertCircle /> : <Loader2 className={job.status === "PROCESSING" ? "spin" : ""} />}</span>
      <div><b>{job.customerName}</b><p title={job.title}>{job.title}</p><span>{statusText[job.status]}</span>{job.error && <em>{job.error}</em>}<div className="job-progress"><i /></div>{job.status === "FAILED" && <button type="button" onClick={() => void retry(job)}><RefreshCw size={12} />重新分析</button>}</div>
      <button className="job-dismiss" type="button" aria-label={`关闭 ${job.title} 任务提示`} onClick={() => dismiss(job.jobId)}><X size={14} /></button>
    </article>)}
  </aside>;
}
