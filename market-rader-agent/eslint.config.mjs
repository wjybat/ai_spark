import path from "node:path";
import { fileURLToPath } from "node:url";

import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));
const typedFiles = ["apps/**/*.{ts,tsx}", "packages/**/*.ts"];
const testFiles = ["**/*.test.ts", "**/*.test.tsx"];

const policies = {
  domain: new Set(),
  contracts: new Set(["domain"]),
  application: new Set(["domain", "contracts"]),
  infrastructure: new Set(["application", "domain", "contracts"]),
  agent: new Set(["application", "domain", "contracts", "infrastructure"]),
  web: new Set(["agent", "application", "infrastructure", "contracts", "domain"]),
  worker: new Set(["agent", "application", "infrastructure", "contracts"]),
  evals: new Set(["domain", "contracts", "application", "infrastructure", "agent"]),
};

function layerForPath(filePath) {
  const parts = path.relative(workspaceRoot, filePath).split(path.sep);
  if (parts[0] === "packages" && parts[1] in policies) return parts[1];
  if (parts[0] === "apps" && (parts[1] === "web" || parts[1] === "worker")) return parts[1];
  return undefined;
}

function layerForImport(importer, source) {
  if (source.startsWith("@market-radar/")) {
    return source.split("/")[1];
  }
  if (source.startsWith(".")) {
    return layerForPath(path.resolve(path.dirname(importer), source));
  }
  return undefined;
}

const importBoundariesRule = {
  meta: {
    type: "problem",
    docs: { description: "enforce Market Radar package dependency direction" },
    schema: [],
    messages: {
      forbidden: "{{from}} may not import {{to}}. Allowed workspace dependencies: {{allowed}}.",
      domainExternal: "domain may only import relative domain modules or Node.js modules using the node: prefix.",
      packageRoot: "Import {{source}} through its declared package root export instead of a deep path.",
    },
  },
  create(context) {
    const importer = context.filename;
    const from = layerForPath(importer);

    function check(node, sourceNode) {
      if (!from || typeof sourceNode?.value !== "string") return;
      const source = sourceNode.value;

      if (source.startsWith("@market-radar/") && source.split("/").length > 2) {
        context.report({ node, messageId: "packageRoot", data: { source } });
        return;
      }

      const to = layerForImport(importer, source);
      if (to && to !== from && !policies[from].has(to)) {
        const allowed = [...policies[from]].map((name) => `@market-radar/${name}`).join(", ") || "none";
        context.report({ node, messageId: "forbidden", data: { from, to, allowed } });
        return;
      }

      if (from === "domain" && !to && !source.startsWith(".") && !source.startsWith("node:")) {
        if (!importer.endsWith(".test.ts") || source !== "vitest") {
          context.report({ node, messageId: "domainExternal" });
        }
      }
    }

    return {
      ImportDeclaration(node) {
        check(node, node.source);
      },
      ExportNamedDeclaration(node) {
        check(node, node.source);
      },
      ExportAllDeclaration(node) {
        check(node, node.source);
      },
      ImportExpression(node) {
        check(node, node.source);
      },
      CallExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "require") {
          check(node, node.arguments[0]);
        }
      },
    };
  },
};

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "docs/implementation/参考ui代码/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...eslint.configs.recommended,
    languageOptions: {
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: typedFiles,
    ignores: testFiles,
  })),
  {
    files: typedFiles,
    ignores: testFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: workspaceRoot,
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      "market-radar": { rules: { "import-boundaries": importBoundariesRule } },
    },
    rules: {
      "market-radar/import-boundaries": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
      "@typescript-eslint/no-import-type-side-effects": "error",
    },
  },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: testFiles })),
  {
    files: testFiles,
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "market-radar": { rules: { "import-boundaries": importBoundariesRule } },
    },
    rules: {
      "market-radar/import-boundaries": "error",
    },
  },
);
