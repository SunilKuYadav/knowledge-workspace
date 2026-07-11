/* ─── Interview Module Configuration ─────────────────────── */

export type InterviewSource =
  "problem" | "topic" | "self-test" | "revision" | "practice" | "interview";

/** Summary of a variation's solve state for interview context. */
export interface VariationSummary {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  category?: string;
  tags?: string[];
  status: "not-started" | "attempted" | "solved";
}

export type InterviewContext =
  | {
      source: "problem";
      id: string;
      title: string;
      category: string;
      tags: string[];
      /** Solve status of the main problem */
      problemStatus?: "not-started" | "attempted" | "solved";
      /** Variation summaries with solve states */
      variations?: VariationSummary[];
    }
  | { source: "topic"; id: string; title: string; concepts: string[] }
  | { source: "revision"; sessionId: string; topicIds: string[] }
  | { source: "self-test" | "practice" | "interview" };

export interface InterviewModuleProps {
  source: InterviewSource;
  context?: InterviewContext;
  language?: "javascript" | "typescript";
  difficulty?: "easy" | "medium" | "hard";
  duration?: number; // 1-180 minutes
}

/* ─── Execution Types ────────────────────────────────────── */

export interface TestCase {
  input: unknown;
  expectedOutput: unknown;
}

export interface ExecutionRequest {
  code: string;
  language: "javascript" | "typescript";
  testCases: TestCase[];
  timeout: number; // ms, default 5000
}

export interface TestCaseResult {
  input: unknown;
  expectedOutput: unknown;
  actualOutput: unknown;
  passed: boolean;
  executionTimeMs: number;
}

export interface ExecutionError {
  type: "syntax" | "runtime" | "timeout";
  message: string;
  line?: number;
  stack?: string;
}

export interface ExecutionResult {
  consoleOutput: string;
  testResults: TestCaseResult[];
  executionTimeMs: number;
  memoryUsageMb: number;
  error?: ExecutionError;
}

/* ─── Problem Model ──────────────────────────────────────── */

export interface SampleIO {
  input: string;
  output: string;
  explanation: string;
}

export interface EdgeCase {
  description: string;
  input: string;
  expectedOutput: string;
}

export interface GeneratedProblem {
  title: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  tags: string[]; // >= 2
  statement: string;
  constraints: string[];
  inputFormat: string;
  outputFormat: string;
  samples: SampleIO[]; // >= 2
  edgeCases: EdgeCase[]; // >= 2
  hiddenTestCases: TestCase[]; // >= 5
  expectedTimeComplexity: string; // Big-O
  expectedSpaceComplexity: string; // Big-O
  companyTags: string[]; // 1-5
  boilerplate: string;
}

/* ─── Evaluation Model ───────────────────────────────────── */

export interface EvaluationReport {
  correctness: {
    testsPassed: number;
    testsTotal: number;
    results: TestCaseResult[];
  };
  algorithmChoice: {
    submittedComplexity: string;
    optimalComplexity: string;
    isOptimal: boolean;
    feedback: string;
  };
  complexityAnalysis: {
    timeComplexity: string;
    spaceComplexity: string;
    explanation: string;
  };
  codeQuality: {
    positives: string[];
    improvements: string[];
    score: number;
  };
  edgeCaseHandling: {
    handled: string[];
    missed: string[];
  };
  errorHandling: {
    assessment: string;
    suggestions: string[];
  };
}

/* ─── Scoring Model ──────────────────────────────────────── */

export interface DimensionScore {
  score: number; // 0-100
  justification: string; // 1-3 sentences
}

export interface ScoringReport {
  overallScore: number; // 0-100
  dimensions: {
    communication: DimensionScore;
    codingAbility: DimensionScore;
    problemSolving: DimensionScore;
    algorithmSelection: DimensionScore;
    complexityAnalysis: DimensionScore;
    edgeCaseCoverage: DimensionScore;
    codeQuality: DimensionScore;
  };
  confidence: number; // 0-100%
  readiness: "not ready" | "needs practice" | "almost ready" | "ready";
  penalties: {
    hintsUsed: number;
    timePenalty: number;
    executionAttempts: number;
  };
}

/* ─── Session Summary Model ──────────────────────────────── */

export interface SessionSummary {
  strengths: string[]; // 1-5
  weaknesses: string[]; // 1-5
  missedEdgeCases: Array<{ case: string; explanation: string }>;
  alternativeSolutions: Array<{
    approach: string;
    timeComplexity: string;
    spaceComplexity: string;
  }>; // 1-3
  studyRecommendations: string[]; // 2-5
  similarProblems: Array<{ title: string; targetSkill: string }>; // 2-5
  nextTopics: string[]; // 1-3
  improvementPlan: Array<{
    action: string;
    priority: "high" | "medium" | "low";
  }>; // 3-7, ordered high→low
}

/* ─── Interview State (Zustand Store) ────────────────────── */

export type InterviewPhase =
  | "initializing"
  | "generating"
  | "coding"
  | "executing"
  | "confirming"
  | "evaluating"
  | "follow-up"
  | "scoring"
  | "summary"
  | "ended"
  | "error";

export interface ConversationMessage {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: number;
}

export interface InterviewState {
  // Configuration
  phase: InterviewPhase;
  source: InterviewSource;
  context: InterviewContext | null;
  language: "javascript" | "typescript";
  difficulty: "easy" | "medium" | "hard" | null;
  duration: number; // minutes

  // Problem
  problem: GeneratedProblem | null;

  // Editor
  code: string;
  boilerplate: string;

  // Timer
  elapsedSeconds: number;
  timerRunning: boolean;

  // Execution
  lastExecutionResult: ExecutionResult | null;
  executionCount: number;

  // Hints
  hintsUsed: number; // 0-4
  hints: string[]; // accumulated hints
  solutionRevealed: boolean;

  // Submission
  submittedCode: string | null;
  evaluation: EvaluationReport | null;

  // Follow-up
  conversationHistory: ConversationMessage[];
  followUpQuestionsAsked: number;

  // Scoring
  scoringReport: ScoringReport | null;
  sessionSummary: SessionSummary | null;

  // Metadata
  sessionStartTime: number; // timestamp
  lastPersistedAt: number; // timestamp

  // Error
  error: string | null;
}

/* ─── Error Types ────────────────────────────────────────── */

export interface InterviewError {
  type:
    | "config"
    | "generation"
    | "execution"
    | "evaluation"
    | "followup"
    | "scoring"
    | "persistence";
  message: string;
  retryable: boolean;
  timestamp: number;
}

/* ─── Component Props ────────────────────────────────────── */

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "javascript" | "typescript";
  boilerplate: string;
  readOnly?: boolean;
}

/* ─── Timer Hook Return ──────────────────────────────────── */

export interface UseTimerReturn {
  elapsedSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isWarning: boolean; // remaining <= 300s (5 min)
  isExpired: boolean;
  pause: () => void;
  resume: () => void;
  formatTime: (seconds: number) => string; // MM:SS
}
