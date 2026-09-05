const PRIORITY_LABELS: Readonly<Record<string, string>> = {
  p1: "P1",
  p2: "P2",
  p3: "P3",
  watch: "观察",
  hold: "暂缓",
  insufficient_evidence: "证据不足",
};

export function priorityLabel(priority: string | null | undefined): string {
  if (priority === null || priority === undefined) return "—";
  return PRIORITY_LABELS[priority] ?? priority.toUpperCase();
}
