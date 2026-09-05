interface TimelineEventLike {
  source_item_id: string;
  occurred_at: string;
  summary: string;
  importance: number;
  confidence?: number;
  created_at?: string;
  payload?: Record<string, unknown>;
}

interface DateCandidate {
  index: number;
  year: number;
  month: number;
  day: number;
}

const datePattern = /(20\d{2})-(\d{1,2})-(\d{1,2})|(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日|(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;

function validDate(candidate: DateCandidate): boolean {
  const value = new Date(Date.UTC(candidate.year, candidate.month - 1, candidate.day));
  return value.getUTCFullYear() === candidate.year && value.getUTCMonth() === candidate.month - 1 && value.getUTCDate() === candidate.day;
}

function dateCandidates(text: string, fallback: string): DateCandidate[] {
  const fallbackDate = new Date(fallback);
  const fallbackYear = Number.isNaN(fallbackDate.getTime()) ? new Date().getUTCFullYear() : fallbackDate.getUTCFullYear();
  const candidates: DateCandidate[] = [];
  for (const match of text.matchAll(datePattern)) {
    const candidate = match[1]
      ? { index: match.index, year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
      : match[4]
        ? { index: match.index, year: Number(match[4]), month: Number(match[5]), day: Number(match[6]) }
        : { index: match.index, year: fallbackYear, month: Number(match[7]), day: Number(match[8]) };
    if (validDate(candidate)) candidates.push(candidate);
  }
  return candidates;
}

function isoDate(candidate: DateCandidate): string {
  const month = String(candidate.month).padStart(2, "0");
  const day = String(candidate.day).padStart(2, "0");
  return `${candidate.year}-${month}-${day}T00:00:00+08:00`;
}

export function resolveEventOccurredAt(text: string, fallback: string): string {
  const candidates = dateCandidates(text, fallback);
  if (!candidates.length) return fallback;

  const actualIndex = text.search(/实际(?:到|于)?/);
  if (actualIndex >= 0) {
    const actual = candidates.find((candidate) => candidate.index >= actualIndex);
    if (actual) return isoDate(actual);
  }

  const nonPlanned = candidates.filter((candidate) => {
    const prefix = text.slice(Math.max(0, candidate.index - 18), candidate.index);
    return !/(?:原计划|计划|预计|目标|拟于)[^，。；\n]{0,12}$/.test(prefix);
  });
  if (!nonPlanned.length) return fallback;
  return isoDate(nonPlanned.at(-1)!);
}

function eventEvidence(event: TimelineEventLike): string {
  const evidence = event.payload?.evidence_text;
  return typeof evidence === "string" && evidence.trim() ? evidence : event.summary;
}

function compact(value: string): string {
  return value.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

export function buildRecentTimeline<T extends TimelineEventLike>(events: T[], limit = 20): T[] {
  const unique = new Map<string, T>();
  for (const event of events) {
    const evidence = eventEvidence(event);
    const normalized = { ...event, occurred_at: resolveEventOccurredAt(evidence, event.occurred_at) } as T;
    const key = `${event.source_item_id}:${compact(evidence)}`;
    const previous = unique.get(key);
    if (!previous || event.importance > previous.importance || (event.importance === previous.importance && (event.confidence || 0) > (previous.confidence || 0))) unique.set(key, normalized);
  }
  return [...unique.values()].sort((left, right) => right.occurred_at.localeCompare(left.occurred_at) || right.importance - left.importance || (right.created_at || "").localeCompare(left.created_at || "")).slice(0, limit);
}
