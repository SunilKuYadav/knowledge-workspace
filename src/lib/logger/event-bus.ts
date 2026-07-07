import { LogEntry } from "./types";

type Listener = (log: LogEntry) => void;

class LoggerEventBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(log: LogEntry) {
    this.listeners.forEach((listener) => {
      listener(log);
    });
  }
}

export const loggerBus = new LoggerEventBus();
