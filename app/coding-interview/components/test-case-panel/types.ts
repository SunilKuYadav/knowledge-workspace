import type { TestCaseResult } from "../../lib/types";

export interface TestCasePanelProps {
  results: TestCaseResult[];
  isExecuting: boolean;
}
