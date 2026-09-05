import { randomUUID } from "node:crypto";

const idPrefixPattern = /^[a-z][a-z0-9_]{0,31}$/;

/**
 * Generates a prefixed UUID identifier, e.g. `scn_3f2504e0-4f89-11d3-9a0c-0305e82c3301`.
 */
export function newId(prefix: string): string {
  if (!idPrefixPattern.test(prefix)) {
    throw new RangeError(
      `Invalid ID prefix ${JSON.stringify(prefix)}: expected lower_snake_case with a leading letter.`,
    );
  }
  return `${prefix}_${randomUUID()}`;
}

export function isPrefixedId(value: string, prefix: string): boolean {
  return value.startsWith(`${prefix}_`);
}
