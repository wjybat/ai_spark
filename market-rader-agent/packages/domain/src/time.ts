export type EpochMs = number;

export function nowEpochMs(): EpochMs {
  return Date.now();
}

export function isValidEpochMs(value: number): value is EpochMs {
  return Number.isInteger(value) && Number.isFinite(value) && value >= 0;
}

export function assertEpochMs(value: number, label = "timestamp"): EpochMs {
  if (!isValidEpochMs(value)) {
    throw new RangeError(`Invalid ${label}: expected a non-negative integer epoch millisecond value.`);
  }
  return value;
}

export function epochMsToIsoUtc(ms: number): string {
  return new Date(assertEpochMs(ms, "epoch milliseconds")).toISOString();
}

const isoUtcPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

export function isIsoUtcString(value: string): boolean {
  if (!isoUtcPattern.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

export function isoUtcToEpochMs(value: string): EpochMs {
  if (!isIsoUtcString(value)) {
    throw new RangeError(`Invalid ISO 8601 UTC timestamp: ${JSON.stringify(value)}`);
  }
  return Date.parse(value);
}

/** Calendar date in UTC (YYYY-MM-DD). */
export function isUtcDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearPart, monthPart, dayPart] = value.split("-") as [string, string, string];
  const year = Number.parseInt(yearPart, 10);
  const month = Number.parseInt(monthPart, 10);
  const day = Number.parseInt(dayPart, 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
