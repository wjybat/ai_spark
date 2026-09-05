import { z } from "zod";

const nonEmptyString = z.string().trim().min(1, "must not be empty");
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  nonEmptyString.optional(),
);

const integerString = z
  .string()
  .regex(/^\d+$/, "must be a base-10 integer")
  .transform((value) => Number.parseInt(value, 10));

function integerFromEnvironment(defaultValue: number, minimum: number) {
  return z.preprocess(
    (value) => value ?? String(defaultValue),
    integerString.pipe(z.number().int().min(minimum)),
  );
}

function requiredIntegerFromEnvironment(minimum: number) {
  return integerString.pipe(z.number().int().min(minimum));
}

const costDecimal = z
  .string()
  .regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/, "must be a non-negative decimal with at most two places");

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_BASE_URL: z.url(),
    MARKET_DB_PATH: nonEmptyString,
    AGENT_DB_PATH: nonEmptyString,
    SOURCE_CACHE_DIR: nonEmptyString,
    BACKUP_DIR: nonEmptyString,
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
    WORKER_ID: nonEmptyString,
    WORKER_POLL_MS: integerFromEnvironment(1_000, 50),
    WORKER_CONCURRENCY: integerFromEnvironment(3, 1),
    JOB_LEASE_MS: integerFromEnvironment(60_000, 1_000),
    JOB_HEARTBEAT_MS: integerFromEnvironment(15_000, 100),
    SQLITE_BUSY_TIMEOUT_MS: integerFromEnvironment(5_000, 0),
    SEARCH_PROVIDER: nonEmptyString.default("fixture"),
    SEARCH_API_KEY: optionalString,
    PI_AGENT_TIMEOUT_MS: integerFromEnvironment(180_000, 1_000),
    PI_AGENT_THINKING_LEVEL: z
      .enum(["off", "minimal", "low", "medium", "high", "xhigh", "max"])
      .default("low"),
    AGENT_CHAT_THINKING_LEVEL: z
      .enum(["off", "minimal", "low", "medium", "high", "xhigh", "max"])
      .default("minimal"),
    LLM_PROVIDER: nonEmptyString.default("fixture"),
    LLM_MODEL_EXTRACTOR: nonEmptyString.default("fixture-extractor"),
    LLM_MODEL_AGENT: nonEmptyString.default("fixture-agent"),
    LLM_MAX_TOKENS_PER_SCAN: requiredIntegerFromEnvironment(1),
    SCAN_MAX_COST_USD: costDecimal,
    FETCH_MAX_HTML_BYTES: integerFromEnvironment(5 * 1_024 * 1_024, 1),
    FETCH_MAX_PDF_BYTES: integerFromEnvironment(25 * 1_024 * 1_024, 1),
    FETCH_CONNECT_TIMEOUT_MS: integerFromEnvironment(10_000, 1),
    FETCH_TOTAL_TIMEOUT_MS: integerFromEnvironment(30_000, 1),
  })
  .superRefine((environment, context) => {
    if (
      environment.SEARCH_PROVIDER !== "fixture" &&
      environment.SEARCH_PROVIDER !== "pi-agent" &&
      !environment.SEARCH_API_KEY
    ) {
      context.addIssue({
        code: "custom",
        path: ["SEARCH_API_KEY"],
        message: `is required when SEARCH_PROVIDER is ${environment.SEARCH_PROVIDER}`,
      });
    }

    if (environment.WORKER_CONCURRENCY > 8) {
      context.addIssue({
        code: "custom",
        path: ["WORKER_CONCURRENCY"],
        message: "must not exceed 8",
      });
    }

    if (environment.JOB_HEARTBEAT_MS >= environment.JOB_LEASE_MS) {
      context.addIssue({
        code: "custom",
        path: ["JOB_HEARTBEAT_MS"],
        message: "must be less than JOB_LEASE_MS",
      });
    }

    if (environment.FETCH_CONNECT_TIMEOUT_MS > environment.FETCH_TOTAL_TIMEOUT_MS) {
      context.addIssue({
        code: "custom",
        path: ["FETCH_CONNECT_TIMEOUT_MS"],
        message: "must not exceed FETCH_TOTAL_TIMEOUT_MS",
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;
export type EnvironmentInput = Readonly<Record<string, string | undefined>>;

export interface AppConfig {
  readonly nodeEnv: Environment["NODE_ENV"];
  readonly appBaseUrl: string;
  readonly logLevel: Environment["LOG_LEVEL"];
  readonly database: Readonly<{
    marketPath: string;
    agentPath: string;
    sqliteBusyTimeoutMs: number;
  }>;
  readonly storage: Readonly<{
    sourceCacheDirectory: string;
    backupDirectory: string;
  }>;
  readonly worker: Readonly<{
    id: string;
    pollMs: number;
    concurrency: number;
    jobLeaseMs: number;
    jobHeartbeatMs: number;
  }>;
  readonly search: Readonly<{
    provider: string;
    apiKey?: string;
  }>;
  readonly llm: Readonly<{
    provider: string;
    extractorModel: string;
    agentModel: string;
    maxTokensPerScan: number;
  }>;
  readonly piAgent: Readonly<{
    timeoutMs: number;
    thinkingLevel: Environment["PI_AGENT_THINKING_LEVEL"];
  }>;
  readonly agentChat: Readonly<{
    thinkingLevel: Environment["AGENT_CHAT_THINKING_LEVEL"];
  }>;
  readonly scan: Readonly<{
    maxCostUsd: string;
  }>;
  readonly fetch: Readonly<{
    maxHtmlBytes: number;
    maxPdfBytes: number;
    connectTimeoutMs: number;
    totalTimeoutMs: number;
  }>;
}

export class ConfigValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid environment configuration:\n- ${issues.join("\n- ")}`);
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const key = issue.path.join(".") || "environment";
    const message =
      issue.code === "invalid_type" && issue.message.includes("received undefined")
        ? "is required"
        : issue.message;
    return `${key}: ${message}`;
  });
}

export function loadConfig(input: EnvironmentInput = process.env): AppConfig {
  const parsed = environmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new ConfigValidationError(formatIssues(parsed.error));
  }

  const environment = parsed.data;
  const search = environment.SEARCH_API_KEY
    ? Object.freeze({ provider: environment.SEARCH_PROVIDER, apiKey: environment.SEARCH_API_KEY })
    : Object.freeze({ provider: environment.SEARCH_PROVIDER });

  return Object.freeze({
    nodeEnv: environment.NODE_ENV,
    appBaseUrl: environment.APP_BASE_URL,
    logLevel: environment.LOG_LEVEL,
    database: Object.freeze({
      marketPath: environment.MARKET_DB_PATH,
      agentPath: environment.AGENT_DB_PATH,
      sqliteBusyTimeoutMs: environment.SQLITE_BUSY_TIMEOUT_MS,
    }),
    storage: Object.freeze({
      sourceCacheDirectory: environment.SOURCE_CACHE_DIR,
      backupDirectory: environment.BACKUP_DIR,
    }),
    worker: Object.freeze({
      id: environment.WORKER_ID,
      pollMs: environment.WORKER_POLL_MS,
      concurrency: environment.WORKER_CONCURRENCY,
      jobLeaseMs: environment.JOB_LEASE_MS,
      jobHeartbeatMs: environment.JOB_HEARTBEAT_MS,
    }),
    search,
    llm: Object.freeze({
      provider: environment.LLM_PROVIDER,
      extractorModel: environment.LLM_MODEL_EXTRACTOR,
      agentModel: environment.LLM_MODEL_AGENT,
      maxTokensPerScan: environment.LLM_MAX_TOKENS_PER_SCAN,
    }),
    piAgent: Object.freeze({
      timeoutMs: environment.PI_AGENT_TIMEOUT_MS,
      thinkingLevel: environment.PI_AGENT_THINKING_LEVEL,
    }),
    agentChat: Object.freeze({
      thinkingLevel: environment.AGENT_CHAT_THINKING_LEVEL,
    }),
    scan: Object.freeze({ maxCostUsd: environment.SCAN_MAX_COST_USD }),
    fetch: Object.freeze({
      maxHtmlBytes: environment.FETCH_MAX_HTML_BYTES,
      maxPdfBytes: environment.FETCH_MAX_PDF_BYTES,
      connectTimeoutMs: environment.FETCH_CONNECT_TIMEOUT_MS,
      totalTimeoutMs: environment.FETCH_TOTAL_TIMEOUT_MS,
    }),
  });
}
