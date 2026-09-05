import { createHash, randomUUID } from "node:crypto";

export const nowIso = () => new Date().toISOString();
export const makeId = (prefix: string) => `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
export const contentHash = (content: string) => createHash("sha256").update(content).digest("hex");

export function normalizeCustomerName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ")
    .replace(/(?:[,\s]+)(plc|limited|ltd\.?|inc\.?|incorporated|corp\.?|corporation|llc|co\.?)\s*$/i, "")
    .replace(/[ ,.]+$/, "");
}

export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function apiError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "未知错误";
  const status = message.includes("不存在") ? 404 : message.includes("已存在") ? 409 : 400;
  return Response.json({ error: message }, { status });
}
