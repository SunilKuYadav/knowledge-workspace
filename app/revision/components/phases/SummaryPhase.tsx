'use client';

import { useState, useCallback } from 'react';
import { MarkdownRenderer } from '@/src/components/MarkdownRenderer';
import type { CategorizedItem, AnswerRecord, SessionSummary, GeneratableContent } from '../../lib/types';
import { generateContentFromSession } from '../../lib/api';

interface SummaryPhaseProps {
  currentItem: CategorizedItem;
  answers: AnswerRecord[];
  sessionSummary: SessionSummary | null;
  isPending: boolean;
  onFinish: (confidence: 1 | 2 | 3 | 4 | 5) => void;
}

interface GeneratedContent {
  type: GeneratableContent;
  content: string;
  loading: boolean;
  error?: string;
}

export function SummaryPhase({
  currentItem,
  answers,
  sessionSummary,
  isPending,
  onFinish,
}: SummaryPhaseProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [generatedContents, setGeneratedContents] = useState<Record<string, GeneratedContent>>({});

  const handleGenerate = useCallback(async (contentType: GeneratableContent) => {
    setGeneratedContents((prev) => ({
      ...prev,
      [contentType]: { type: contentType, content: '', loading: true },
    }));

    try {
      await generateContentFromSession(
        currentItem,
        answers,
        contentType,
        (accumulated) => {
          setGeneratedContents((prev) => ({
            ...prev,
            [contentType]: { type: contentType, content: accumulated, loading: false },
          }));
        }
      );
    } catch {
      setGeneratedContents((prev) => ({
        ...prev,
        [contentType]: { type: contentType, content: '', loading: false, error: 'Failed to generate content.' },
      }));
    }
  }, [currentItem, answers]);

  const contentButtons: { type: GeneratableContent; label: string; icon: string }[] = [
    { type: 'notes', label: 'Update Notes', icon: '📝' },
    { type: 'mistakes', label: 'Generate Mistakes', icon: '❌' },
    { type: 'patterns', label: 'Generate Patterns', icon: '🔄' },
    { type: 'solution', label: 'Generate Solution', icon: '✅' },
    { type: 'flashcards', label: 'Generate Flashcards', icon: '🃏' },
  ];

  return (
    <div className="space-y-6">
      {/* Full Q&A Review */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Session Review: {currentItem.item.itemId}
        </h3>

        <div className="space-y-3">
          {answers.map((a, i) => (
            <div
              key={i}
              className="rounded-md border border-zinc-100 dark:border-zinc-800 overflow-hidden"
            >
              {/* Question header - clickable */}
              <button
                onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 shrink-0">
                    Q{i + 1}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shrink-0">
                    {a.questionType}
                  </span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                    {a.question}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span
                    className={`text-sm font-bold ${
                      a.score >= 4
                        ? 'text-green-600 dark:text-green-400'
                        : a.score === 3
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {a.score}/5
                  </span>
                  <span className="text-zinc-400 text-xs">
                    {expandedQuestion === i ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* Expanded details */}
              {expandedQuestion === i && (
                <div className="p-4 space-y-4 border-t border-zinc-100 dark:border-zinc-800">
                  {/* Question */}
                  <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">
                      Question
                    </p>
                    <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                      <MarkdownRenderer>{a.question}</MarkdownRenderer>
                    </div>
                  </div>

                  {/* User answer */}
                  <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">
                      Your Answer
                    </p>
                    <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                      {a.response}
                    </div>
                  </div>

                  {/* Correct answer */}
                  <div>
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase mb-1">
                      Correct Answer
                    </p>
                    <div className="p-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                        <MarkdownRenderer>{a.correctAnswer}</MarkdownRenderer>
                      </div>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase mb-1">
                      Feedback
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{a.feedback}</p>
                  </div>

                  {/* Mistakes */}
                  {a.mistakes.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase mb-1">
                        Mistakes
                      </p>
                      <ul className="space-y-1 pl-4">
                        {a.mistakes.map((m, mi) => (
                          <li key={mi} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc">
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key insights */}
                  {a.keyInsights.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase mb-1">
                        Key Insights
                      </p>
                      <ul className="space-y-1 pl-4">
                        {a.keyInsights.map((ins, ii) => (
                          <li key={ii} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc">
                            {ins}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Session Summary */}
      {sessionSummary && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            AI Summary
          </h3>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4">
            {sessionSummary.summary}
          </p>

          {sessionSummary.allMistakes.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                All Mistakes This Session
              </h4>
              <ul className="space-y-1 pl-4">
                {sessionSummary.allMistakes.map((m, i) => (
                  <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sessionSummary.focusAreas.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                🎯 Focus Areas for Next Review
              </h4>
              <ul className="space-y-1 pl-4">
                {sessionSummary.focusAreas.map((f, i) => (
                  <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Generate Content Section */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Generate Study Material
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          Generate content based on this session&apos;s Q&amp;A and your existing notes. Each button generates that specific content type incorporating existing material.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {contentButtons.map(({ type, label, icon }) => {
            const generated = generatedContents[type];
            const isLoading = generated?.loading;
            return (
              <button
                key={type}
                onClick={() => handleGenerate(type)}
                disabled={isLoading}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  generated?.content
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>{icon}</span>
                {isLoading ? 'Generating...' : label}
                {generated?.content && !isLoading && <span className="text-green-500">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Generated content display */}
        {Object.values(generatedContents).map((gen) => {
          if (!gen.content && !gen.error) return null;
          return (
            <div key={gen.type} className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                  {gen.type === 'flashcards' ? '🃏 Flashcards' : `📄 ${gen.type}`}
                </h4>
                {gen.content && (
                  <button
                    onClick={() => navigator.clipboard.writeText(gen.content)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Copy to clipboard
                  </button>
                )}
              </div>
              {gen.error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{gen.error}</p>
              ) : (
                <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-4 max-h-80 overflow-y-auto">
                  <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                    <MarkdownRenderer>{gen.content}</MarkdownRenderer>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confidence rating */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          Rate your confidence to update the schedule:
          {sessionSummary && (
            <span className="ml-2 text-xs text-zinc-400">
              (AI suggests: {sessionSummary.recommendedConfidence}/5)
            </span>
          )}
        </h4>
        <div className="flex gap-2">
          {([1, 2, 3, 4, 5] as const).map((level) => (
            <button
              key={level}
              onClick={() => onFinish(level)}
              disabled={isPending}
              className={`flex-1 py-3 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
                level <= 2
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800'
                  : level === 3
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800'
              } ${
                sessionSummary && level === sessionSummary.recommendedConfidence
                  ? 'ring-2 ring-blue-500'
                  : ''
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-1 text-xs text-zinc-400">
          <span>Forgot</span>
          <span>Perfect</span>
        </div>
      </div>
    </div>
  );
}
