import { writeFile, rm } from "node:fs/promises";
import path from "node:path";

import { ESLint } from "eslint";

const fixturePath = path.resolve("packages/domain/src/__intentional_boundary_violation__.ts");
const fixtureSource = 'import "@market-radar/contracts";\n';

await writeFile(fixturePath, fixtureSource, "utf8");

try {
  const eslint = new ESLint();
  const [result] = await eslint.lintFiles([fixturePath]);
  const boundaryError = result?.messages.find(
    (message) => message.ruleId === "market-radar/import-boundaries" && message.severity === 2,
  );

  if (!boundaryError) {
    throw new Error("Intentional domain -> contracts import did not fail the boundary lint rule.");
  }

  process.stdout.write(`Boundary regression passed: ${boundaryError.message}\n`);
} finally {
  await rm(fixturePath, { force: true });
}
