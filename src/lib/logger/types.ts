export type LogLevel =
  | "info"
  | "warn"
  | "error"
  | "debug"
  | "success";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  namespace?: string;
  args: unknown[];
}