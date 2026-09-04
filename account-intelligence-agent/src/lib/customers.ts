import type { DatabaseSync } from "node:sqlite";
import type { CustomerCreate, CustomerRow } from "./types";
import { makeId, normalizeCustomerName, nowIso } from "./utils";

export function createCustomer(db: DatabaseSync, input: CustomerCreate): CustomerRow {
  const normalized = normalizeCustomerName(input.name);
  if (db.prepare("SELECT id FROM customers WHERE normalized_name = ?").get(normalized)) throw new Error("同名客户已存在");
  const now = nowIso();
  const customer: CustomerRow = {
    id: makeId("cus"), name: input.name.trim(), normalized_name: normalized,
    country: input.country || null, region: input.region || null, industry: input.industry || null, owner: input.owner || null,
    category: "UNTAPPED", stage: "TARGET", status: "ACTIVE", profile_json: JSON.stringify(input.profile),
    last_activity_at: null, created_at: now, updated_at: now,
  };
  db.prepare(`INSERT INTO customers (id,name,normalized_name,country,region,industry,owner,profile_json,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(customer.id, customer.name, normalized, customer.country, customer.region, customer.industry, customer.owner, customer.profile_json, now, now);
  const aliasStatement = db.prepare("INSERT INTO customer_aliases (alias_normalized,alias_display,customer_id) VALUES (?,?,?)");
  for (const alias of input.aliases) {
    const aliasNormalized = normalizeCustomerName(alias);
    if (aliasNormalized && aliasNormalized !== normalized) aliasStatement.run(aliasNormalized, alias.trim(), customer.id);
  }
  return customer;
}

export function resolveCustomer(db: DatabaseSync, ref: { id?: string | null; name?: string | null }, allowCreate = false): CustomerRow {
  if (ref.id) {
    const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(ref.id) as CustomerRow | undefined;
    if (!customer) throw new Error(`客户不存在: ${ref.id}`);
    return customer;
  }
  const name = ref.name?.trim();
  if (!name) throw new Error("客户 ID 和名称至少提供一项");
  const normalized = normalizeCustomerName(name);
  const customer = db.prepare("SELECT * FROM customers WHERE normalized_name = ?").get(normalized) as CustomerRow | undefined;
  if (customer) return customer;
  const byAlias = db.prepare("SELECT c.* FROM customers c JOIN customer_aliases a ON a.customer_id=c.id WHERE a.alias_normalized=?").get(normalized) as CustomerRow | undefined;
  if (byAlias) return byAlias;
  if (!allowCreate) throw new Error(`客户不存在，请先新建客户: ${name}`);
  return createCustomer(db, { name, aliases: [], profile: {} });
}
