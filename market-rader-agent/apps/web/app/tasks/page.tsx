import { getScanJobs, getScanRuns } from "@market-radar/infrastructure";

import { getAppContext } from "@/lib/context";
import { getDb } from "@/lib/db";
import { isActiveScan, selectJobRun } from "@/lib/task-runs";
import { AutoRefresh, CancelScanButton } from "../scan-actions";
import { COUNTRY_META, Flag } from "../ui/flags";
import { Icon, type IconName } from "../ui/icons";

export const dynamic = "force-dynamic";

function statusClass(status: string): string {
  return `badge-status badge-${status}`;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

export default async function TasksPage(): Promise<React.JSX.Element> {
  const db = getDb();
  const context = await getAppContext();
  const runs = (await getScanRuns(db)).filter((run) =>
    context.scenarioRevisionIds.includes(run.scenario_revision_id),
  );
  const latest = runs[0];
  const activeRuns = runs.filter(isActiveScan);
  const cancellingRuns = activeRuns.filter((run) => run.cancel_requested_at !== null);
  const jobRun = selectJobRun(runs);
  const jobs = jobRun !== undefined ? await getScanJobs(db, jobRun.scan_run_id) : [];
  const completedRuns = runs.filter((run) => run.status === "completed").length;
  const succeededJobs = jobs.filter((job) => job.status === "succeeded").length;
  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  const insufficientJobs = jobs.filter((job) => job.status === "insufficient_evidence").length;
  const runningJobs = jobs.filter((job) => job.status === "running").length;
  const queuedJobs = jobs.filter((job) => job.status === "queued").length;
  const active = activeRuns.length > 0;

  const stats: ReadonlyArray<{
    label: string;
    value: string;
    note: string;
    icon: IconName;
    iconClass: string;
  }> = [
    {
      label: "扫描总数",
      value: String(runs.length),
      note: `已完成 ${completedRuns} 次`,
      icon: "scan",
      iconClass: "task-stat-blue",
    },
    {
      label: "进行中",
      value: String(activeRuns.length),
      note: cancellingRuns.length > 0
        ? "正在停止当前 Pi 任务"
        : active
          ? "后台 Worker 正在处理"
          : "当前队列空闲",
      icon: "refresh",
      iconClass: active ? "task-stat-orange" : "task-stat-green",
    },
    {
      label: active ? "当前研究 Jobs" : "最近研究 Jobs",
      value: `${succeededJobs}/${jobs.length}`,
      note: failedJobs > 0
        ? `${failedJobs} 个失败 · ${insufficientJobs} 个证据不足`
        : active
          ? `${runningJobs} 运行中 · ${queuedJobs} 排队 · ${insufficientJobs} 个证据不足`
          : `${insufficientJobs} 个证据不足`,
      icon: "task",
      iconClass: failedJobs > 0 ? "task-stat-red" : "task-stat-green",
    },
    {
      label: "最新结果",
      value: latest?.result_status ?? "—",
      note: latest !== undefined ? `${latest.model_provider} · 数据截至 ${latest.data_as_of ?? "—"}` : "暂无结果",
      icon: "shield",
      iconClass: "task-stat-purple",
    },
  ];

  return (
    <div className="tasks-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-sub">
            扫描运行记录与后台研究任务。{active ? "有任务正在执行，页面每 3 秒自动刷新。" : "当前无进行中的扫描。"}
          </p>
        </div>
        <span className={active ? "run-state run-state-active" : "run-state run-state-idle"}>
          <i /> {active ? "Worker 处理中" : "系统空闲"}
        </span>
      </div>
      {active && <AutoRefresh />}

      <section className="task-stats">
        {stats.map((stat) => (
          <div className="task-stat" key={stat.label}>
            <span className={`task-stat-icon ${stat.iconClass}`}>
              <Icon name={stat.icon} size={18} />
            </span>
            <div>
              <div className="task-stat-label">{stat.label}</div>
              <div className="task-stat-value">{stat.value}</div>
              <div className="task-stat-note">{stat.note}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="card task-section">
        <div className="task-section-head">
          <div>
            <div className="card-title">扫描历史</div>
            <div className="task-section-sub">最近的 Fixture 与 Research 扫描运行记录</div>
          </div>
          <span className="section-count">{runs.length} Runs</span>
        </div>
        <div className="table-scroll">
          <table className="data-table task-table scan-run-table">
            <thead>
              <tr>
                <th>Scan Run</th>
                <th>研究引擎</th>
                <th>运行状态</th>
                <th>结果状态</th>
                <th>数据日期</th>
                <th>创建时间</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.scan_run_id}>
                  <td>
                    <div className="run-id" title={run.scan_run_id}>
                      <Icon name="radar" size={14} />
                      <code>{run.scan_run_id}</code>
                    </div>
                  </td>
                  <td>
                    <span className={run.model_provider === "pi-agent" ? "provider-pill provider-pi" : "provider-pill"}>
                      {run.model_provider === "pi-agent" ? "Pi Agent" : run.model_name}
                    </span>
                  </td>
                  <td>
                    <span className={statusClass(run.status)}>{run.status}</span>
                  </td>
                  <td>
                    <span className={statusClass(run.result_status)}>{run.result_status}</span>
                  </td>
                  <td className="task-nowrap">{run.data_as_of ?? "—"}</td>
                  <td className="muted task-nowrap">{formatDate(run.created_at)}</td>
                  <td className="task-action">
                    {isActiveScan(run) && (
                      <CancelScanButton
                        scanRunId={run.scan_run_id}
                        cancellationRequested={run.cancel_requested_at !== null}
                      />
                    )}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-table-cell">
                    暂无扫描记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card task-section">
        <div className="task-section-head">
          <div>
            <div className="card-title">{active ? "当前扫描的 Research Jobs" : "最近扫描的 Research Jobs"}</div>
            <div className="task-section-sub">
              {jobRun !== undefined ? `Scan ${jobRun.scan_run_id}` : "尚无 Research 扫描记录"}
            </div>
          </div>
          <span className="section-count">{jobs.length} Jobs</span>
        </div>
        <div className="table-scroll">
          <table className="data-table task-table research-job-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>国家</th>
                <th>研究主题</th>
                <th>状态</th>
                <th>尝试次数</th>
                <th>Error / Stop</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.job_id}>
                  <td>
                    <code className="job-id" title={job.job_id}>{job.job_id}</code>
                  </td>
                  <td>
                    <div className="cell-country">
                      <Flag code={job.country_iso2} />
                      <span>{COUNTRY_META[job.country_id]?.name ?? job.country_iso2}</span>
                    </div>
                  </td>
                  <td><code className="topic-code">{job.topic_code}</code></td>
                  <td><span className={statusClass(job.status)}>{job.status}</span></td>
                  <td>{job.attempt_count} / {job.max_attempts}</td>
                  <td className="muted small">{job.last_error_message ?? job.stop_reason ?? "—"}</td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-table-cell">
                    最新扫描没有后台 Job（Fixture 模式为同步完成）
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
