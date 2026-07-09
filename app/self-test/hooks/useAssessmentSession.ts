"use client";

import { useCallback, useRef } from "react";
import type { Topic } from "@/src/types/Topic";
import type {
  AssessmentRecord,
  DifficultyLevel,
  PhaseResult,
  QuestionEvaluation,
} from "../lib/types";
import { EARLY_EXIT_THRESHOLD, PHASE_ORDER } from "../lib/constants";
import { computePhaseScore } from "../lib/scoring";
import { adjustDifficulty, deriveInitialDifficulty } from "../lib/difficulty";
import { useAssessmentStore } from "../store/assessmentStore";
import { useQuestionGeneration } from "./useQuestionGeneration";
import { useAnswerEvaluation } from "./useAnswerEvaluation";
import { useFeedbackReport } from "./useFeedbackReport";
import {
  checkpointPhaseAction,
  startAssessmentAction,
} from "../actions/assessment-actions";

/* ─── Helpers ────────────────────────────────────────────── */

/**
 * Extract questions answered incorrectly (score < 5) across all phase results.
 */
function extractIncorrectQuestions(phaseResults: PhaseResult[]): string[] {
  return phaseResults.flatMap((p) =>
    p.evaluations
      .map((e, i) => (e.score < 5 ? p.questions[i]?.question : null))
      .filter((q): q is string => q !== null)
  );
}

/**
 * Reduce difficulty by one level (for early-exit decline).
 * Uses adjustDifficulty with a score that triggers a decrease (score <= 4).
 */
function reduceDifficultyOneLevel(currentDifficulty: DifficultyLevel): DifficultyLevel {
  return adjustDifficulty(currentDifficulty, 0);
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useAssessmentSession(
  topicId: string,
  topic: Topic,
  artifacts: Record<string, string>
) {
  const store = useAssessmentStore();
  const { generateQuestions, isLoading: isGeneratingQuestions } =
    useQuestionGeneration();
  const { evaluateAnswer } = useAnswerEvaluation();
  const { generateReport } = useFeedbackReport();

  // Track the initial difficulty for the session (used for early-exit baseline)
  const initialDifficultyRef = useRef<DifficultyLevel>("medium");

  // Combine all artifacts into a single content string
  const combinedContent = Object.values(artifacts).join("\n\n");

  /**
   * Start a new assessment session.
   * Derives initial difficulty from topic confidence and experience level (Req 10.5, 3.4).
   */
  const startAssessment = useCallback(
    async (experienceLevel: 5 | 10 | 15) => {
      const initialDifficulty = deriveInitialDifficulty(
        topic.confidence,
        experienceLevel
      );

      // Track baseline difficulty for early-exit decline
      initialDifficultyRef.current = initialDifficulty;

      // Initialize store
      store.startSession(topicId, initialDifficulty);

      // Persist initial checkpoint
      const category = topic.category;
      const slug = topicId;

      const result = await startAssessmentAction(
        topicId,
        category,
        slug,
        experienceLevel,
        initialDifficulty
      );

      if (!result.success) {
        // Continue in memory, show warning
        console.warn("Failed to checkpoint session start:", result.error);
      }

      // Generate questions for first phase (no previous context for first phase)
      store.setGenerating(true);
      const questions = await generateQuestions({
        topicTitle: topic.title,
        category: topic.category,
        tags: topic.tags,
        phaseType: PHASE_ORDER[0],
        difficulty: initialDifficulty,
        experienceLevel,
        content: combinedContent,
      });

      store.setGenerating(false);

      if (questions) {
        store.setQuestions(questions);
      } else {
        store.setError("Failed to generate questions. Please retry.");
      }
    },
    [topicId, topic, combinedContent, store, generateQuestions]
  );

  /**
   * Resume an existing in-progress session.
   * Adjusts difficulty based on last completed phase (Req 10.1-10.3).
   * Passes previous phase scores and incorrect questions for context (Req 10.4).
   */
  const resumeAssessment = useCallback(
    async (record: AssessmentRecord, experienceLevel: 5 | 10 | 15) => {
      // Track the baseline difficulty from the persisted record
      initialDifficultyRef.current = record.initialDifficulty;

      store.resumeSession(record);

      // Generate questions for the next phase
      const phaseIndex = record.phases.length;
      if (phaseIndex >= PHASE_ORDER.length) {
        // All phases already done, go to feedback
        store.setGenerating(true);
        await generateReport(
          record.phases,
          topic.title,
          topic.category,
          experienceLevel
        );
        store.setGenerating(false);
        return;
      }

      const phaseType = PHASE_ORDER[phaseIndex];
      const lastPhase = record.phases[record.phases.length - 1];
      // Adjust difficulty based on last phase performance (Req 10.1-10.3, 10.6, 10.7)
      const difficulty = lastPhase
        ? adjustDifficulty(lastPhase.difficulty, lastPhase.phaseScore)
        : record.initialDifficulty;

      store.setGenerating(true);
      const questions = await generateQuestions({
        topicTitle: topic.title,
        category: topic.category,
        tags: topic.tags,
        phaseType,
        difficulty,
        experienceLevel,
        content: combinedContent,
        // Pass previous phase scores for context (Req 10.4)
        previousPhaseScores: record.phases.map((p) => ({
          phaseType: p.phaseType,
          score: p.phaseScore,
        })),
        // Pass incorrect questions from previous phases (Req 10.4)
        incorrectQuestions: extractIncorrectQuestions(record.phases),
      });

      store.setGenerating(false);

      if (questions) {
        store.setQuestions(questions);
      } else {
        store.setError("Failed to generate questions. Please retry.");
      }
    },
    [store, topic, combinedContent, generateQuestions, generateReport]
  );

  /**
   * Submit an answer for the current question.
   */
  const submitAnswer = useCallback(
    async (answer: string) => {
      const { currentQuestions, currentQuestionIndex } =
        useAssessmentStore.getState();
      const question = currentQuestions[currentQuestionIndex];

      if (!question) return;

      store.setAnswer(answer);

      try {
        const evaluation = await evaluateAnswer(question, answer, {
          topicTitle: topic.title,
          category: topic.category,
          content: combinedContent,
        });

        if (evaluation) {
          store.submitEvaluation(evaluation);
        } else {
          store.setError("Failed to evaluate answer.");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Evaluation failed";
        store.setError(message);
      }
    },
    [store, topic, combinedContent, evaluateAnswer]
  );

  /**
   * Move to the next question in the current phase.
   */
  const nextQuestion = useCallback(() => {
    store.nextQuestion();
  }, [store]);

  /**
   * Complete the current phase: compute score, build PhaseResult, handle early exit.
   */
  const completePhase = useCallback(
    async (
      evaluations: QuestionEvaluation[],
      userAnswers: string[],
      experienceLevel: 5 | 10 | 15
    ) => {
      const state = useAssessmentStore.getState();
      const phaseScore = computePhaseScore(evaluations);

      const phaseResult: PhaseResult = {
        phaseType: state.currentPhaseType!,
        questions: state.currentQuestions,
        userAnswers,
        evaluations,
        phaseScore,
        difficulty: state.currentDifficulty,
      };

      // Add to accumulated phase results
      const updatedResults = [...state.phaseResults, phaseResult];
      useAssessmentStore.setState({ phaseResults: updatedResults });

      // Complete phase in store
      store.completePhase(phaseScore);

      // Check early exit for conceptual phase (Req 3.5)
      if (
        state.currentPhaseType === "conceptual" &&
        phaseScore < EARLY_EXIT_THRESHOLD
      ) {
        useAssessmentStore.setState({ status: "early-exit" });
        return;
      }

      // Checkpoint the phase
      const category = topic.category;
      const slug = topicId;

      const checkpointRecord: AssessmentRecord = {
        id: state.sessionId!,
        topicId,
        status: "in-progress",
        startedAt: new Date().toISOString(),
        experienceLevel,
        phases: updatedResults,
        initialDifficulty: initialDifficultyRef.current,
      };

      const checkpointResult = await checkpointPhaseAction(
        topicId,
        category,
        slug,
        checkpointRecord
      );

      if (!checkpointResult.success) {
        console.warn("Failed to checkpoint phase:", checkpointResult.error);
      }
    },
    [store, topicId, topic]
  );

  /**
   * Advance to the next phase after phase summary.
   * Adjusts difficulty based on phase performance (Req 10.1-10.3, 10.6, 10.7).
   * Passes previous phase scores and incorrect questions (Req 10.4).
   */
  const advancePhase = useCallback(
    async (experienceLevel: 5 | 10 | 15) => {
      const state = useAssessmentStore.getState();
      const currentPhaseIndex = state.currentPhaseIndex;
      const nextPhaseIndex = currentPhaseIndex + 1;

      // Check if all phases are done
      if (nextPhaseIndex >= PHASE_ORDER.length) {
        // Session complete — trigger feedback generation
        useAssessmentStore.setState({ status: "generating-feedback" });
        store.setGenerating(true);

        await generateReport(
          state.phaseResults,
          topic.title,
          topic.category,
          experienceLevel
        );

        store.setGenerating(false);
        return;
      }

      // Compute difficulty for next phase based on performance (Req 10.1-10.3)
      const lastResult = state.phaseResults[state.phaseResults.length - 1];
      const nextDifficulty = lastResult
        ? adjustDifficulty(state.currentDifficulty, lastResult.phaseScore)
        : state.currentDifficulty;

      store.advanceToNextPhase(nextDifficulty);

      // Generate questions for next phase with full context (Req 10.4)
      store.setGenerating(true);
      const questions = await generateQuestions({
        topicTitle: topic.title,
        category: topic.category,
        tags: topic.tags,
        phaseType: PHASE_ORDER[nextPhaseIndex],
        difficulty: nextDifficulty,
        experienceLevel,
        content: combinedContent,
        // Pass previous phase scores for AI context (Req 10.4)
        previousPhaseScores: state.phaseResults.map((p) => ({
          phaseType: p.phaseType,
          score: p.phaseScore,
        })),
        // Pass incorrect questions so AI can target weak areas (Req 10.4)
        incorrectQuestions: extractIncorrectQuestions(state.phaseResults),
      });

      store.setGenerating(false);

      if (questions) {
        store.setQuestions(questions);
      } else {
        store.setError("Failed to generate questions. Please retry.");
      }
    },
    [store, topic, combinedContent, generateQuestions, generateReport]
  );

  /**
   * Handle early-exit decline: user chooses to continue despite low score.
   * Reduces difficulty by one level from the baseline (Req 3.6).
   * Passes previous phase context (scores + incorrect questions) to AI (Req 10.4).
   */
  const declineEarlyExit = useCallback(
    async (experienceLevel: 5 | 10 | 15) => {
      const state = useAssessmentStore.getState();
      const nextPhaseIndex = state.currentPhaseIndex + 1;

      // Reduce difficulty one level from the baseline (Req 3.6)
      const reducedDifficulty = reduceDifficultyOneLevel(initialDifficultyRef.current);

      store.advanceToNextPhase(reducedDifficulty);

      // Generate questions for the MCQ phase with reduced difficulty
      store.setGenerating(true);
      const questions = await generateQuestions({
        topicTitle: topic.title,
        category: topic.category,
        tags: topic.tags,
        phaseType: PHASE_ORDER[nextPhaseIndex],
        difficulty: reducedDifficulty,
        experienceLevel,
        content: combinedContent,
        // Pass previous phase scores for AI context (Req 10.4)
        previousPhaseScores: state.phaseResults.map((p) => ({
          phaseType: p.phaseType,
          score: p.phaseScore,
        })),
        // Pass incorrect questions so AI can address weak areas (Req 10.4)
        incorrectQuestions: extractIncorrectQuestions(state.phaseResults),
      });

      store.setGenerating(false);

      if (questions) {
        store.setQuestions(questions);
      } else {
        store.setError("Failed to generate questions. Please retry.");
      }
    },
    [store, topic, combinedContent, generateQuestions]
  );

  return {
    // State
    ...store,
    isGeneratingQuestions,

    // Actions
    startAssessment,
    resumeAssessment,
    submitAnswer,
    nextQuestion,
    completePhase,
    advancePhase,
    declineEarlyExit,
  };
}
