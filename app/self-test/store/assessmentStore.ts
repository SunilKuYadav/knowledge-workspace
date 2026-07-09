"use client";

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  AssessmentPhaseType,
  AssessmentQuestion,
  AssessmentRecord,
  DifficultyLevel,
  FeedbackReport,
  PhaseResult,
  QuestionEvaluation,
} from "../lib/types";
import { PHASE_ORDER } from "../lib/constants";

/* ─── State Interface ────────────────────────────────────── */

export interface AssessmentSessionState {
  // Session identity
  sessionId: string | null;
  topicId: string | null;
  status:
    | "idle"
    | "starting"
    | "in-phase"
    | "evaluating"
    | "phase-summary"
    | "early-exit"
    | "generating-feedback"
    | "summary"
    | "error";

  // Phase tracking
  currentPhaseIndex: number;
  currentPhaseType: AssessmentPhaseType | null;
  currentDifficulty: DifficultyLevel;

  // Questions for current phase
  currentQuestions: AssessmentQuestion[];
  currentQuestionIndex: number;

  // Answer input
  currentAnswer: string;

  // Evaluation state
  currentEvaluation: QuestionEvaluation | null;
  isEvaluating: boolean;

  // Phase results accumulated across session
  phaseResults: PhaseResult[];

  // Final report
  feedbackReport: FeedbackReport | null;
  confidenceScore: number | null;

  // Loading/error
  isGenerating: boolean;
  error: string | null;
}

/* ─── Actions Interface ──────────────────────────────────── */

export interface AssessmentSessionActions {
  startSession: (topicId: string, initialDifficulty: DifficultyLevel) => void;
  resumeSession: (record: AssessmentRecord) => void;
  setQuestions: (questions: AssessmentQuestion[]) => void;
  setAnswer: (answer: string) => void;
  submitEvaluation: (evaluation: QuestionEvaluation) => void;
  nextQuestion: () => void;
  completePhase: (phaseScore: number) => void;
  advanceToNextPhase: (difficulty: DifficultyLevel) => void;
  setFeedbackReport: (report: FeedbackReport, confidence: number) => void;
  setError: (error: string | null) => void;
  setGenerating: (loading: boolean) => void;
  reset: () => void;
}

/* ─── Combined Store Type ────────────────────────────────── */

export type AssessmentStore = AssessmentSessionState & AssessmentSessionActions;

/* ─── Default State ──────────────────────────────────────── */

export const defaultAssessmentState: AssessmentSessionState = {
  sessionId: null,
  topicId: null,
  status: "idle",

  currentPhaseIndex: 0,
  currentPhaseType: null,
  currentDifficulty: "medium",

  currentQuestions: [],
  currentQuestionIndex: 0,

  currentAnswer: "",

  currentEvaluation: null,
  isEvaluating: false,

  phaseResults: [],

  feedbackReport: null,
  confidenceScore: null,

  isGenerating: false,
  error: null,
};

/* ─── Store Creation ─────────────────────────────────────── */

export const useAssessmentStore = create<AssessmentStore>()((set) => ({
  ...defaultAssessmentState,

  startSession: (topicId: string, initialDifficulty: DifficultyLevel) =>
    set({
      sessionId: uuidv4(),
      topicId,
      status: "starting",
      currentPhaseIndex: 0,
      currentPhaseType: PHASE_ORDER[0],
      currentDifficulty: initialDifficulty,
      currentQuestions: [],
      currentQuestionIndex: 0,
      currentAnswer: "",
      currentEvaluation: null,
      isEvaluating: false,
      phaseResults: [],
      feedbackReport: null,
      confidenceScore: null,
      isGenerating: false,
      error: null,
    }),

  resumeSession: (record: AssessmentRecord) => {
    const phaseIndex = record.phases.length;
    const lastPhase = record.phases[record.phases.length - 1];
    const difficulty = lastPhase
      ? lastPhase.difficulty
      : record.initialDifficulty;

    set({
      sessionId: record.id,
      topicId: record.topicId,
      status: "in-phase",
      currentPhaseIndex: phaseIndex,
      currentPhaseType: phaseIndex < PHASE_ORDER.length ? PHASE_ORDER[phaseIndex] : null,
      currentDifficulty: difficulty,
      currentQuestions: [],
      currentQuestionIndex: 0,
      currentAnswer: "",
      currentEvaluation: null,
      isEvaluating: false,
      phaseResults: record.phases,
      feedbackReport: null,
      confidenceScore: null,
      isGenerating: false,
      error: null,
    });
  },

  setQuestions: (questions: AssessmentQuestion[]) =>
    set({
      currentQuestions: questions,
      currentQuestionIndex: 0,
      status: "in-phase",
    }),

  setAnswer: (answer: string) => set({ currentAnswer: answer }),

  submitEvaluation: (evaluation: QuestionEvaluation) =>
    set({
      currentEvaluation: evaluation,
      isEvaluating: false,
      status: "evaluating",
    }),

  nextQuestion: () =>
    set((state) => ({
      currentQuestionIndex: state.currentQuestionIndex + 1,
      currentAnswer: "",
      currentEvaluation: null,
      status: "in-phase",
    })),

  completePhase: (_phaseScore: number) =>
    set({
      status: "phase-summary",
    }),

  advanceToNextPhase: (difficulty: DifficultyLevel) =>
    set((state) => {
      const nextIndex = state.currentPhaseIndex + 1;
      return {
        currentPhaseIndex: nextIndex,
        currentPhaseType:
          nextIndex < PHASE_ORDER.length ? PHASE_ORDER[nextIndex] : null,
        currentDifficulty: difficulty,
        currentQuestions: [],
        currentQuestionIndex: 0,
        currentAnswer: "",
        currentEvaluation: null,
        status: "starting",
      };
    }),

  setFeedbackReport: (report: FeedbackReport, confidence: number) =>
    set({
      feedbackReport: report,
      confidenceScore: confidence,
      status: "summary",
    }),

  setError: (error: string | null) =>
    set(
      error !== null
        ? { status: "error", error }
        : { error: null }
    ),

  setGenerating: (loading: boolean) => set({ isGenerating: loading }),

  reset: () => set({ ...defaultAssessmentState }),
}));
