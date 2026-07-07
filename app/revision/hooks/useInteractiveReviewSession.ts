"use client";

import { useState, useTransition, useCallback } from "react";
import type {
  CategorizedItem,
  ReviewQuestion,
  EvaluationResult,
  AnswerRecord,
  SessionSummary,
  SessionPhase,
} from "../lib/types";
import {
  generateReviewQuestions,
  evaluateResponse,
  getSessionSummary,
  streamHint,
} from "../lib/api";
import { rateRevision } from "../actions";

interface UseInteractiveReviewSessionReturn {
  // State
  currentItemIndex: number;
  currentItem: CategorizedItem;
  phase: SessionPhase;
  questions: ReviewQuestion[];
  currentQuestionIndex: number;
  userResponse: string;
  evaluation: EvaluationResult | null;
  answers: AnswerRecord[];
  sessionSummary: SessionSummary | null;
  hint: string;
  hintLoading: boolean;
  error: string;
  isPending: boolean;
  itemsCompleted: number;
  allSessionComplete: boolean;

  // Actions
  setUserResponse: (value: string) => void;
  startReview: () => Promise<void>;
  submitAnswer: () => Promise<void>;
  nextQuestion: () => Promise<void>;
  requestHint: () => Promise<void>;
  finishItemReview: (confidence: 1 | 2 | 3 | 4 | 5) => void;
}

export function useInteractiveReviewSession(
  dueItems: CategorizedItem[],
): UseInteractiveReviewSessionReturn {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userResponse, setUserResponse] = useState("");
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(
    null,
  );
  const [hint, setHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [itemsCompleted, setItemsCompleted] = useState(0);
  const [allSessionComplete, setAllSessionComplete] = useState(false);

  const currentItem = dueItems[currentItemIndex];

  const startReview = useCallback(async () => {
    if (!currentItem) return;
    setPhase("generating");
    setError("");
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSessionSummary(null);
    setHint("");

    try {
      const data = await generateReviewQuestions(currentItem);
      if (data.error) {
        setError(data.error);
        setPhase("idle");
        return;
      }
      setQuestions(data.questions!);
      setPhase("answering");
    } catch {
      setError("Connection failed. Please check your AI service.");
      setPhase("idle");
    }
  }, [currentItem]);

  const submitAnswer = useCallback(async () => {
    if (!userResponse.trim() || !currentItem) return;
    setPhase("evaluating");
    setError("");

    const currentQuestion = questions[currentQuestionIndex];

    try {
      const data = await evaluateResponse(
        currentItem,
        currentQuestion.question,
        userResponse.trim(),
        currentQuestion.type,
      );

      if (data.error) {
        setError(data.error);
        setPhase("answering");
        return;
      }

      const result = data.result!;
      setEvaluation(result);

      setAnswers((prev) => [
        ...prev,
        {
          question: currentQuestion.question,
          questionType: currentQuestion.type,
          response: userResponse.trim(),
          score: result.score,
          mistakes: result.mistakes,
          keyInsights: result.keyInsights,
          feedback: result.feedback,
          correctAnswer: result.correctAnswer,
        },
      ]);

      setPhase("feedback");
    } catch {
      setError("Connection failed during evaluation.");
      setPhase("answering");
    }
  }, [userResponse, currentItem, questions, currentQuestionIndex]);

  const nextQuestion = useCallback(async () => {
    const nextIdx = currentQuestionIndex + 1;
    setHint("");
    setUserResponse("");
    setEvaluation(null);

    if (nextIdx >= questions.length) {
      setPhase("evaluating");
      const summary = await getSessionSummary(currentItem, answers);
      if (summary) setSessionSummary(summary);
      setPhase("summary");
    } else {
      setCurrentQuestionIndex(nextIdx);
      setPhase("answering");
    }
  }, [currentQuestionIndex, questions.length, currentItem, answers]);

  const requestHint = useCallback(async () => {
    if (!currentItem || hintLoading) return;
    setHintLoading(true);
    setHint("");

    const currentQuestion = questions[currentQuestionIndex];

    try {
      await streamHint(
        currentItem,
        currentQuestion.question,
        currentQuestion.type,
        (accumulated) => setHint(accumulated),
      );
    } catch {
      setHint("Unable to get hint right now.");
    } finally {
      setHintLoading(false);
    }
  }, [currentItem, hintLoading, questions, currentQuestionIndex]);

  const finishItemReview = useCallback(
    (confidence: 1 | 2 | 3 | 4 | 5) => {
      if (!currentItem) return;
      startTransition(async () => {
        await rateRevision(
          currentItem.item.itemId,
          currentItem.item.itemType,
          confidence,
        );

        setItemsCompleted((c) => c + 1);
        const nextItemIdx = currentItemIndex + 1;

        if (nextItemIdx >= dueItems.length) {
          setAllSessionComplete(true);
        } else {
          setCurrentItemIndex(nextItemIdx);
          setPhase("idle");
          setQuestions([]);
          setCurrentQuestionIndex(0);
          setAnswers([]);
          setSessionSummary(null);
          setUserResponse("");
          setEvaluation(null);
          setHint("");
          setError("");
        }
      });
    },
    [currentItem, currentItemIndex, dueItems.length, startTransition],
  );

  return {
    currentItemIndex,
    currentItem,
    phase,
    questions,
    currentQuestionIndex,
    userResponse,
    evaluation,
    answers,
    sessionSummary,
    hint,
    hintLoading,
    error,
    isPending,
    itemsCompleted,
    allSessionComplete,
    setUserResponse,
    startReview,
    submitAnswer,
    nextQuestion,
    requestHint,
    finishItemReview,
  };
}
