import { getTraceContext } from "./observability/trace.js";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export type LogData = Readonly<Record<string, unknown>>;

/** Pino-compatible structured JSON logger with automatic trace injection. */
export interface Logger {
  child(bindings: LogData): Logger;
  trace(message: string, data?: LogData): void;
  debug(message: string, data?: LogData): void;
  info(message: string, data?: LogData): void;
  warn(message: string, data?: LogData): void;
  error(message: string, data?: LogData): void;
  fatal(message: string, data?: LogData): void;
}

export function createJsonLogger(level: LogLevel, bindings: LogData = {}): Logger {
  const threshold = LEVEL_ORDER[level];

  const emit = (entryLevel: LogLevel, message: string, data?: LogData): void => {
    if (LEVEL_ORDER[entryLevel] < threshold) return;
    const trace = getTraceContext();
    const entry = {
      level: entryLevel,
      time: new Date().toISOString(),
      ...(trace !== undefined
        ? { trace_id: trace.traceId, request_id: trace.requestId }
        : {}),
      ...bindings,
      ...(data ?? {}),
      message,
    };
    const sink = entryLevel === "error" || entryLevel === "fatal" ? process.stderr : process.stdout;
    sink.write(`${JSON.stringify(entry)}\n`);
  };

  const logger: Logger = {
    child(childBindings) {
      return createJsonLogger(level, { ...bindings, ...childBindings });
    },
    trace(message, data) {
      emit("trace", message, data);
    },
    debug(message, data) {
      emit("debug", message, data);
    },
    info(message, data) {
      emit("info", message, data);
    },
    warn(message, data) {
      emit("warn", message, data);
    },
    error(message, data) {
      emit("error", message, data);
    },
    fatal(message, data) {
      emit("fatal", message, data);
    },
  };
  return logger;
}
