"use client";

/**
 * Shared context for problem evaluation data.
 *
 * ProblemWorkspace publishes evaluation results here after AI evaluation.
 * AISidebar reads from this context to offer evaluation-aware actions
 * (improve solution, generate notes from feedback, follow-up suggestions).
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export interface EvaluationData {
  overallScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  complexity: { time: string; space: string };
  edgeCases?: string[];
  alternativeApproaches?: string[];
}

export interface ProblemEvaluationContextValue {
  /** The latest AI evaluation result (null if not yet evaluated) */
  evaluation: EvaluationData | null;
  /** The code that was evaluated */
  evaluatedCode: string | null;
  /** Problem metadata for context */
  problemTitle: string | null;
  problemPatterns: string[];
  problemDifficulty: string | null;

  /** Called by ProblemWorkspace after evaluation completes */
  publishEvaluation: (
    evaluation: EvaluationData,
    code: string,
    meta: { title: string; patterns: string[]; difficulty: string },
  ) => void;

  /** Called when user saves content back from sidebar */
  onSaveNotes: ((notes: string) => void) | null;
  onSaveSolution: ((code: string) => void) | null;

  /** Register save callbacks from ProblemWorkspace */
  registerSaveHandlers: (handlers: {
    onSaveNotes: (notes: string) => void;
    onSaveSolution: (code: string) => void;
  }) => void;

  /** Clear evaluation (e.g., when code changes significantly) */
  clearEvaluation: () => void;
}

const ProblemEvaluationContext = createContext<ProblemEvaluationContextValue>({
  evaluation: null,
  evaluatedCode: null,
  problemTitle: null,
  problemPatterns: [],
  problemDifficulty: null,
  publishEvaluation: () => {},
  onSaveNotes: null,
  onSaveSolution: null,
  registerSaveHandlers: () => {},
  clearEvaluation: () => {},
});

export function ProblemEvaluationProvider({ children }: { children: ReactNode }) {
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [evaluatedCode, setEvaluatedCode] = useState<string | null>(null);
  const [problemTitle, setProblemTitle] = useState<string | null>(null);
  const [problemPatterns, setProblemPatterns] = useState<string[]>([]);
  const [problemDifficulty, setProblemDifficulty] = useState<string | null>(null);
  const [saveHandlers, setSaveHandlers] = useState<{
    onSaveNotes: ((notes: string) => void) | null;
    onSaveSolution: ((code: string) => void) | null;
  }>({ onSaveNotes: null, onSaveSolution: null });

  const publishEvaluation = useCallback(
    (
      eval_: EvaluationData,
      code: string,
      meta: { title: string; patterns: string[]; difficulty: string },
    ) => {
      setEvaluation(eval_);
      setEvaluatedCode(code);
      setProblemTitle(meta.title);
      setProblemPatterns(meta.patterns);
      setProblemDifficulty(meta.difficulty);
    },
    [],
  );

  const registerSaveHandlers = useCallback(
    (handlers: {
      onSaveNotes: (notes: string) => void;
      onSaveSolution: (code: string) => void;
    }) => {
      setSaveHandlers(handlers);
    },
    [],
  );

  const clearEvaluation = useCallback(() => {
    setEvaluation(null);
    setEvaluatedCode(null);
  }, []);

  return (
    <ProblemEvaluationContext.Provider
      value={{
        evaluation,
        evaluatedCode,
        problemTitle,
        problemPatterns,
        problemDifficulty,
        publishEvaluation,
        onSaveNotes: saveHandlers.onSaveNotes,
        onSaveSolution: saveHandlers.onSaveSolution,
        registerSaveHandlers,
        clearEvaluation,
      }}
    >
      {children}
    </ProblemEvaluationContext.Provider>
  );
}

export function useProblemEvaluation(): ProblemEvaluationContextValue {
  return useContext(ProblemEvaluationContext);
}
