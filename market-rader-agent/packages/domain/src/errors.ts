export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "SCENARIO_REVISION_STALE"
  | "SCAN_ALREADY_EXISTS"
  | "SCAN_NOT_CANCELLABLE"
  | "INSUFFICIENT_EVIDENCE"
  | "HARD_BLOCKER"
  | "SOURCE_FETCH_FAILED"
  | "SOURCE_PARSE_FAILED"
  | "JOB_LEASE_LOST"
  | "MODEL_OUTPUT_INVALID"
  | "QUALITY_GATE_FAILED"
  | "DATABASE_BUSY"
  | "BUDGET_EXHAUSTED";

export type AppErrorDetails = Readonly<Record<string, unknown>>;

export interface AppErrorInit {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly retryable?: boolean;
  readonly details?: AppErrorDetails;
  readonly cause?: unknown;
}

/** Application error with a stable machine code, retryability flag and structured details. */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly retryable: boolean;
  readonly details: AppErrorDetails;

  constructor(init: AppErrorInit) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = "AppError";
    this.code = init.code;
    this.retryable = init.retryable ?? false;
    this.details = init.details ?? {};
  }

  static isAppError(value: unknown): value is AppError {
    return value instanceof AppError;
  }
}
