import type { ExecutionResult } from "../../lib/types";

export interface ConsolePanelProps {
  result: ExecutionResult | null;
  isExecuting: boolean;
}
