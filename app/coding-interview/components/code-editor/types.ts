import type { ExecutionResult, TestCaseResult, EvaluationReport } from "../../lib/types";

export interface FullscreenActions {
  onRun: () => void;
  onHint: (level: number) => void;
  onNote?: () => void;
  onVariation?: () => void;
  onEvaluate: () => void;
  isExecuting: boolean;
  isHintLoading?: boolean;
  isEvaluating?: boolean;
  isNoteGenerating?: boolean;
  isVariationLoading?: boolean;
}

export interface FullscreenPanelData {
  executionResult: ExecutionResult | null;
  testResults: TestCaseResult[];
  evaluation: EvaluationReport | null;
  /** Optional custom evaluation content to render instead of the default EvaluationPanel */
  evaluationContent?: React.ReactNode;
  /** Optional custom test case content to render instead of the default TestCasePanel */
  testCaseContent?: React.ReactNode;
}

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "javascript" | "typescript";
  boilerplate: string;
  readOnly?: boolean;
  /** When provided, fullscreen mode renders action buttons and result panels */
  fullscreenActions?: FullscreenActions;
  /** Panel data to display in fullscreen mode */
  fullscreenPanelData?: FullscreenPanelData;
}

export type CopyStatus = "idle" | "copied";
