"use client";

import { useState, useCallback } from "react";
import type {
  ReviewQuestion,
  EvaluationResult,
  AnswerRecord,
  SessionSummary,
} from "@/app/revision/lib/types";
import type { Phase } from "./types";

export function useSelfTestButton(
  itemId: string,
  itemType: "topic" | "problem",
  confidence: number,
) {
  const [phase, setPhase] = useState<Phase>("closed");
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

  const startTest = useCallback(async () => {
    setPhase("generating");
    setError("");
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSessionSummary(null);
    setHint("");
    setUserResponse("");
    setEvaluation(null);

    try {
      const res = await fetch("/api/ai/review-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          itemId,
          itemType,
          confidence,
        }),
      });

      if (!res.ok) {
        setError("Failed to generate questions. Is the AI service running?");
        setPhase("closed");
        return;
      }

      const data = await res.json();
      if (!data.questions || data.questions.length === 0) {
        setError("No questions generated. Try again.");
        setPhase("closed");
        return;
      }

      setQuestions(data.questions);
      setPhase("answering");
    } catch {
      setError("Connection failed. Please try again.");
      setPhase("closed");
    }
  }, [itemId, itemType, confidence]);

  const submitAnswer = useCallback(async () => {
    if (!userResponse.trim()) return;
    setPhase("evaluating");
    setError("");

    const currentQuestion = questions[currentQuestionIndex];

    try {
      const res = await fetch("/api/ai/review-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          itemId,
          itemType,
          question: currentQuestion.question,
          userResponse: userResponse.trim(),
          questionType: currentQuestion.type,
        }),
      });

      if (!res.ok) {
        setError("Failed to evaluate response.");
        setPhase("answering");
        return;
      }

      const result: EvaluationResult = await res.json();
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
  }, [userResponse, questions, currentQuestionIndex, itemId, itemType]);

  const nextQuestion = useCallback(async () => {
    const nextIdx = currentQuestionIndex + 1;
    setHint("");
    setUserResponse("");
    setEvaluation(null);

    if (nextIdx >= questions.length) {
      // Get summary
      setPhase("evaluating");
      try {
        const res = await fetch("/api/ai/review-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "session-summary",
            itemId,
            itemType,
            answers,
          }),
        });
        if (res.ok) {
          const summary = await res.json();
          setSessionSummary(summary);
        }
      } catch {
        // Non-critical
      }
      setPhase("summary");
    } else {
      setCurrentQuestionIndex(nextIdx);
      setPhase("answering");
    }
  }, [currentQuestionIndex, questions.length, itemId, itemType, answers]);

  const requestHint = useCallback(async () => {
    if (hintLoading) return;
    setHintLoading(true);
    setHint("");

    const currentQuestion = questions[currentQuestionIndex];

    try {
      const res = await fetch("/api/ai/review-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hint",
          itemId,
          itemType,
          question: currentQuestion.question,
          questionType: currentQuestion.type,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setHint(accumulated);
        }
      } else {
        setHint("Unable to get hint right now.");
      }
    } catch {
      setHint("Unable to get hint right now.");
    } finally {
      setHintLoading(false);
    }
  }, [hintLoading, questions, currentQuestionIndex, itemId, itemType]);

  const close = () => {
    setPhase("closed");
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSessionSummary(null);
    setHint("");
    setUserResponse("");
    setEvaluation(null);
    setError("");
  };

  return {
    phase,
    questions,
    currentQuestionIndex,
    userResponse,
    setUserResponse,
    evaluation,
    answers,
    sessionSummary,
    hint,
    hintLoading,
    error,
    startTest,
    submitAnswer,
    nextQuestion,
    requestHint,
    close,
  };
}
