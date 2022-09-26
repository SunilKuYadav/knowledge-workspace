'use client';

import { useState, useCallback } from 'react';
import type { ReviewQuestion, EvaluationResult, AnswerRecord, SessionSummary } from '@/app/revision/lib/types';

interface SelfTestButtonProps {
  itemId: string;
  itemType: 'topic' | 'problem';
  confidence: number;
}

type Phase = 'closed' | 'generating' | 'answering' | 'evaluating' | 'feedback' | 'summary';

export default function SelfTestButton({ itemId, itemType, confidence }: SelfTestButtonProps) {
  const [phase, setPhase] = useState<Phase>('closed');
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [hint, setHint] = useState('');
  const [hintLoading, setHintLoading] = useState(false);
  const [error, setError] = useState('');

  const startTest = useCallback(async () => {
    setPhase('generating');
    setError('');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSessionSummary(null);
    setHint('');
    setUserResponse('');
    setEvaluation(null);

    try {
      const res = await fetch('/api/ai/review-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          itemId,
          itemType,
          confidence,
        }),
      });

      if (!res.ok) {
        setError('Failed to generate questions. Is the AI service running?');
        setPhase('closed');
        return;
      }

      const data = await res.json();
      if (!data.questions || data.questions.length === 0) {
        setError('No questions generated. Try again.');
        setPhase('closed');
        return;
      }

      setQuestions(data.questions);
      setPhase('answering');
    } catch {
      setError('Connection failed. Please try again.');
      setPhase('closed');
    }
  }, [itemId, itemType, confidence]);

  const submitAnswer = useCallback(async () => {
    if (!userResponse.trim()) return;
    setPhase('evaluating');
    setError('');

    const currentQuestion = questions[currentQuestionIndex];

    try {
      const res = await fetch('/api/ai/review-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          itemId,
          itemType,
          question: currentQuestion.question,
          userResponse: userResponse.trim(),
          questionType: currentQuestion.type,
        }),
      });

      if (!res.ok) {
        setError('Failed to evaluate response.');
        setPhase('answering');
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

      setPhase('feedback');
    } catch {
      setError('Connection failed during evaluation.');
      setPhase('answering');
    }
  }, [userResponse, questions, currentQuestionIndex, itemId, itemType]);

  const nextQuestion = useCallback(async () => {
    const nextIdx = currentQuestionIndex + 1;
    setHint('');
    setUserResponse('');
    setEvaluation(null);

    if (nextIdx >= questions.length) {
      // Get summary
      setPhase('evaluating');
      try {
        const res = await fetch('/api/ai/review-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'session-summary',
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
      setPhase('summary');
    } else {
      setCurrentQuestionIndex(nextIdx);
      setPhase('answering');
    }
  }, [currentQuestionIndex, questions.length, itemId, itemType, answers]);

  const requestHint = useCallback(async () => {
    if (hintLoading) return;
    setHintLoading(true);
    setHint('');

    const currentQuestion = questions[currentQuestionIndex];

    try {
      const res = await fetch('/api/ai/review-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hint',
          itemId,
          itemType,
          question: currentQuestion.question,
          questionType: currentQuestion.type,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setHint(accumulated);
        }
      } else {
        setHint('Unable to get hint right now.');
      }
    } catch {
      setHint('Unable to get hint right now.');
    } finally {
      setHintLoading(false);
    }
  }, [hintLoading, questions, currentQuestionIndex, itemId, itemType]);

  const close = () => {
    setPhase('closed');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSessionSummary(null);
    setHint('');
    setUserResponse('');
    setEvaluation(null);
    setError('');
  };

  // ─── Button only (closed state) ───
  if (phase === 'closed') {
    return (
      <div>
        <button
          onClick={startTest}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          🧠 Self Test
        </button>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
        )}
      </div>
    );
  }

  // ─── Active test session (inline panel) ───
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              🧠 Self Test
            </span>
            {questions.length > 0 && (
              <span className="text-xs text-zinc-400">
                Question {currentQuestionIndex + 1}/{questions.length}
              </span>
            )}
          </div>
          <button
            onClick={close}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg"
            aria-label="Close self test"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        {questions.length > 0 && (
          <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${((currentQuestionIndex + (phase === 'feedback' || phase === 'summary' ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Generating */}
        {phase === 'generating' && (
          <div className="text-center py-10">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Generating questions...</p>
          </div>
        )}

        {/* Answering */}
        {phase === 'answering' && questions[currentQuestionIndex] && (
          <div>
            <div className="mb-4">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                {questions[currentQuestionIndex].type}
              </span>
            </div>
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-4">
              {questions[currentQuestionIndex].question}
            </p>

            {hint && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Hint</p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{hint}</p>
              </div>
            )}

            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              placeholder="Type your answer..."
              rows={4}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <div className="flex items-center justify-between mt-3">
              <button
                onClick={requestHint}
                disabled={hintLoading}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
              >
                {hintLoading ? 'Loading hint...' : '💡 Get a hint'}
              </button>
              <button
                onClick={submitAnswer}
                disabled={!userResponse.trim()}
                className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {/* Evaluating */}
        {phase === 'evaluating' && (
          <div className="text-center py-10">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Evaluating...</p>
          </div>
        )}

        {/* Feedback */}
        {phase === 'feedback' && evaluation && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-sm font-bold ${evaluation.score >= 7 ? 'text-green-600' : evaluation.score >= 4 ? 'text-yellow-600' : 'text-red-600'}`}>
                Score: {evaluation.score}/10
              </span>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{evaluation.feedback}</p>
            </div>

            {evaluation.correctAnswer && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Correct Answer</p>
                <p className="text-sm text-blue-800 dark:text-blue-300">{evaluation.correctAnswer}</p>
              </div>
            )}

            {evaluation.mistakes.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Mistakes</p>
                <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300 space-y-0.5">
                  {evaluation.mistakes.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}

            {evaluation.keyInsights.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Key Insights</p>
                <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300 space-y-0.5">
                  {evaluation.keyInsights.map((k, i) => <li key={i}>{k}</li>)}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={nextQuestion}
                className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                {currentQuestionIndex >= questions.length - 1 ? 'See Summary' : 'Next Question'}
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        {phase === 'summary' && (
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Test Complete 🎉
            </h3>

            {/* Score overview */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {answers.map((a, i) => (
                <div key={i} className="text-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Q{i + 1}</p>
                  <p className={`text-sm font-bold ${a.score >= 7 ? 'text-green-600' : a.score >= 4 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {a.score}/10
                  </p>
                </div>
              ))}
            </div>

            {sessionSummary && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{sessionSummary.summary}</p>

                {sessionSummary.focusAreas.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Focus Areas</p>
                    <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300 space-y-0.5">
                      {sessionSummary.focusAreas.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={close}
                className="px-4 py-2 rounded-md text-sm font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
