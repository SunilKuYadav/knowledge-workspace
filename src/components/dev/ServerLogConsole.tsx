"use client";

import { useEffect } from "react";

export default function ServerLogConsole() {
  useEffect(() => {
    const source = new EventSource("/api/logs");

    source.onmessage = (event) => {
      const log = JSON.parse(event.data);

      console.groupCollapsed(
        `[${log.level}] ${log.namespace}`
      );

      console.log(...log.args);

      console.groupEnd();
    };

    return () => source.close();
  }, []);

  return null;
}