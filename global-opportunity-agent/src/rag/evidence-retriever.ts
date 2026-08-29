import { evidence } from "../data/knowledge.js";
import type { EvidenceRecord } from "../types/domain.js";

export interface EvidenceQuery {
  customerId?: string;
  regionId?: string;
  categories?: EvidenceRecord["category"][];
  query?: string;
  includeInferences?: boolean;
  limit?: number;
}

function queryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,，。；;、/|]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function sourceWeight(record: EvidenceRecord): number {
  const level = record.sourceLevel === "A" ? 18 : record.sourceLevel === "B" ? 10 : 3;
  const confidence = record.confidence === "high" ? 10 : record.confidence === "medium" ? 6 : 2;
  return level + confidence;
}

function lexicalScore(record: EvidenceRecord, terms: string[]): number {
  if (terms.length === 0) return 0;
  const searchable = [record.title, record.excerpt, record.category, ...record.tags].join(" ").toLowerCase();
  return terms.reduce((score, term) => score + (searchable.includes(term) ? 8 : 0), 0);
}

export function searchEvidence(query: EvidenceQuery): EvidenceRecord[] {
  const terms = queryTerms(query.query ?? "");
  const includeInferences = query.includeInferences ?? true;
  const limit = query.limit ?? 20;

  return evidence
    .filter((record) => !query.customerId || record.customerId === query.customerId)
    .filter((record) => !query.regionId || record.regionId === query.regionId)
    .filter((record) => !query.categories || query.categories.includes(record.category))
    .filter((record) => includeInferences || record.kind === "fact")
    .map((record) => ({ record, score: sourceWeight(record) + lexicalScore(record, terms) }))
    .sort((a, b) => b.score - a.score || b.record.publishedAt.localeCompare(a.record.publishedAt))
    .slice(0, limit)
    .map(({ record }) => structuredClone(record));
}

export function requireEvidence(customerId: string): EvidenceRecord[] {
  const records = searchEvidence({ customerId, limit: 100 });
  if (records.length === 0) throw new Error(`No evidence found for customer: ${customerId}`);
  return records;
}
