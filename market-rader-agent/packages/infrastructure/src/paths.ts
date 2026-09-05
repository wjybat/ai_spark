import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  // from dist/db → ../../..
  "../../..",
);

export const migrationsFolder = path.join(repoRoot, "drizzle");
export const configDirectory = path.join(repoRoot, "config");

/** Resolves a possibly relative path against the repository root. */
export function resolveFromRoot(target: string): string {
  return path.isAbsolute(target) ? target : path.join(repoRoot, target);
}
