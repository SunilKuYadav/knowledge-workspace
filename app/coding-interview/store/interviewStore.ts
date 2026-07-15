"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  InterviewState,
  InterviewPhase,
  InterviewSource,
  GeneratedProblem,
  EvaluationReport,
  ConversationMessage,
  ScoringReport,
  SessionSummary,
} from "../lib/types";
import { DEFAULT_DURATION } from "../lib/constants";
import {
  loadPersistedState,
  persistState,
  clearPersistedState,
} from "./persistence";

/* ─── Store Actions Interface ────────────────────────────── */

export interface InterviewActions {
  // Phase management
  setPhase: (phase: InterviewPhase) => void;

  // Editor
  setCode: (code: string) => void;

  // Problem
  setProblem: (problem: GeneratedProblem) => void;

  // Timer
  tickTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;

  // Hints
  addHint: (hint: string) => void;

  // Evaluation
  setEvaluation: (evaluation: EvaluationReport) => void;

  // Follow-up
  addConversationMessage: (message: ConversationMessage) => void;

  // Scoring
  setScore: (report: ScoringReport) => void;

  // Summary
  setSummary: (summary: SessionSummary) => void;

  // Error
  setError: (error: string | null) => void;

  // Session
  clearSession: () => void;
}

/* ─── Combined Store Type ────────────────────────────────── */

export type InterviewStore = InterviewState & InterviewActions;

/* ─── Default State ──────────────────────────────────────── */

export const defaultInterviewState: InterviewState = {
  // Configuration
  phase: "initializing",
  source: "practice" as InterviewSource,
  context: null,
  language: "typescript",
  difficulty: null,
  duration: DEFAULT_DURATION,

  // Problem
  problem: null,

  // Editor
  code: "",
  boilerplate: "",
  harness: "",

  // Timer
  elapsedSeconds: 0,
  timerRunning: false,

  // Execution
  lastExecutionResult: null,
  executionCount: 0,

  // Hints
  hintsUsed: 0,
  hints: [],
  solutionRevealed: false,

  // Submission
  submittedCode: null,
  evaluation: null,

  // Follow-up
  conversationHistory: [],
  followUpQuestionsAsked: 0,

  // Scoring
  scoringReport: null,
  sessionSummary: null,

  // Metadata
  sessionStartTime: Date.now(),
  lastPersistedAt: Date.now(),

  // Error
  error: null,
};

/**
 * Flag to suppress persistence during clearSession().
 * Prevents the auto-persist subscriber from saving the reset state.
 */
let _suppressPersistence = false;

/* ─── Resolve Initial State (restore from sessionStorage if fresh) ─── */

function getInitialState(): InterviewState {
  const restored = loadPersistedState();
  if (restored) {
    console.log(
      "[interviewStore] restored persisted state, phase:",
      restored.phase,
    );
    return { ...restored, lastPersistedAt: Date.now() };
  }
  console.log("[interviewStore] no persisted state, using defaults");
  return {
    ...defaultInterviewState,
    sessionStartTime: Date.now(),
    lastPersistedAt: Date.now(),
  };
}

/* ─── Store Creation ─────────────────────────────────────── */

export const useInterviewStore = create<InterviewStore>()(
  subscribeWithSelector((set) => ({
    ...getInitialState(),

    setPhase: (phase: InterviewPhase) => set({ phase }),

    setCode: (code: string) => set({ code }),

    setProblem: (problem: GeneratedProblem) =>
      set({
        problem,
        boilerplate: problem.boilerplate,
        code: problem.boilerplate,
        harness: problem.harness || "",
      }),

    tickTimer: () =>
      set((state) => ({
        elapsedSeconds: state.elapsedSeconds + 1,
      })),

    pauseTimer: () => set({ timerRunning: false }),

    resumeTimer: () => set({ timerRunning: true }),

    addHint: (hint: string) =>
      set((state) => ({
        hints: [...state.hints, hint],
        hintsUsed: state.hintsUsed + 1,
      })),

    setEvaluation: (evaluation: EvaluationReport) => set({ evaluation }),

    addConversationMessage: (message: ConversationMessage) =>
      set((state) => ({
        conversationHistory: [...state.conversationHistory, message],
        followUpQuestionsAsked:
          message.role === "interviewer"
            ? state.followUpQuestionsAsked + 1
            : state.followUpQuestionsAsked,
      })),

    setScore: (report: ScoringReport) => set({ scoringReport: report }),

    setSummary: (summary: SessionSummary) => set({ sessionSummary: summary }),

    setError: (error: string | null) => set({ error }),

    clearSession: () => {
      _suppressPersistence = true;
      clearPersistedState();
      set({
        ...defaultInterviewState,
        // Use a terminal phase that won't trigger doGenerate() in useInterviewSession
        phase: "ended",
        sessionStartTime: Date.now(),
        lastPersistedAt: Date.now(),
      });
      // Re-enable persistence after the synchronous set completes
      _suppressPersistence = false;
    },
  })),
);

/* ─── Auto-persist on every state change ─────────────────── */

// Subscribe to all state changes and persist to sessionStorage.
// This runs after every set() call in the store.
useInterviewStore.subscribe((state) => {
  // Skip persistence when session is being cleared
  if (_suppressPersistence) return;

  // Don't persist terminal/ended state
  if (state.phase === "ended") return;

  // Extract only the data fields (exclude action functions) for persistence
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    setPhase: _1,
    setCode: _2,
    setProblem: _3,
    tickTimer: _4,
    pauseTimer: _5,
    resumeTimer: _6,
    addHint: _7,
    setEvaluation: _8,
    addConversationMessage: _9,
    setScore: _10,
    setSummary: _11,
    setError: _12,
    clearSession: _13,
    ...data
  } = state;
  /* eslint-enable @typescript-eslint/no-unused-vars */

  persistState(data as InterviewState);
});
