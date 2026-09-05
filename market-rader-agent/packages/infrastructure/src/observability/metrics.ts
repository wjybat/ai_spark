/**
 * In-process Prometheus-style counter registry. Counters are labeled; label
 * sets are rendered in canonical (sorted) order for stable output.
 */
export class MetricsRegistry {
  private readonly counters = new Map<string, Map<string, number>>();

  increment(name: string, labels: Readonly<Record<string, string>> = {}, by = 1): void {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      throw new RangeError(`Invalid metric name: ${name}`);
    }
    const labelKey = canonicalLabelKey(labels);
    let series = this.counters.get(name);
    if (series === undefined) {
      series = new Map<string, number>();
      this.counters.set(name, series);
    }
    series.set(labelKey, (series.get(labelKey) ?? 0) + by);
  }

  snapshot(): ReadonlyMap<string, ReadonlyMap<string, number>> {
    return this.counters;
  }

  value(name: string, labels: Readonly<Record<string, string>> = {}): number {
    return this.counters.get(name)?.get(canonicalLabelKey(labels)) ?? 0;
  }

  /** Prometheus text exposition format. */
  render(): string {
    const lines: string[] = [];
    for (const [name, series] of [...this.counters.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
      lines.push(`# TYPE ${name} counter`);
      for (const [labelKey, value] of [...series.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
        lines.push(`${name}${labelKey} ${value}`);
      }
    }
    return `${lines.join("\n")}\n`;
  }

  reset(): void {
    this.counters.clear();
  }
}

function canonicalLabelKey(labels: Readonly<Record<string, string>>): string {
  const entries = Object.entries(labels).filter(([, value]) => value !== "");
  if (entries.length === 0) return "";
  entries.sort(([a], [b]) => (a < b ? -1 : 1));
  return `{${entries.map(([key, value]) => `${key}="${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
}

/** Process-wide singleton registry shared by web and worker. */
export const metrics = new MetricsRegistry();

export const METRIC_NAMES = {
  httpRequestsTotal: "http_requests_total",
  httpRequestDurationMsSum: "http_request_duration_ms_sum",
  httpRequestDurationMsCount: "http_request_duration_ms_count",
  scansTotal: "scans_total",
  researchJobsTotal: "research_jobs_total",
  aiRunsTotal: "ai_runs_total",
  toolCallsTotal: "tool_calls_total",
  evidenceCandidatesTotal: "evidence_candidates_total",
  verifiedClaimsCreatedTotal: "verified_claims_created_total",
} as const;
