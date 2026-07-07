import { loggerBus } from "./event-bus";
import { LogEntry, LogLevel } from "./types";

function emit(level: LogLevel, namespace: string, ...args: unknown[]) {
  console[level === "success" ? "log" : level](...args);

  const log: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    namespace,
    args,
  };

  loggerBus.emit(log);
}

export const logger = {
  info(namespace: string, ...args: unknown[]) {
    emit("info", namespace, ...args);
  },

  warn(namespace: string, ...args: unknown[]) {
    emit("warn", namespace, ...args);
  },

  error(namespace: string, ...args: unknown[]) {
    emit("error", namespace, ...args);
  },

  debug(namespace: string, ...args: unknown[]) {
    emit("debug", namespace, ...args);
  },

  success(namespace: string, ...args: unknown[]) {
    emit("success", namespace, ...args);
  },
};