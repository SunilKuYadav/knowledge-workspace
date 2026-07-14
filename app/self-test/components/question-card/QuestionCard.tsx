"use client";

import { useState } from "react";
import type { AssessmentQuestion } from "../../lib/types";
import { MCQOptions } from "../mcq-options/MCQOptions";
import { TextAnswer } from "../text-answer/TextAnswer";
import { CodeEditor } from "../code-editor/CodeEditor";

interface QuestionCardProps {
  question: AssessmentQuestion;
  onSubmit: (answer: string) => void;
  isEvaluating: boolean;
}

export function QuestionCard({
  question,
  onSubmit,
  isEvaluating,
}: QuestionCardProps) {
  const [selectedMCQIndex, setSelectedMCQIndex] = useState<number | null>(null);
  const [showMCQResult, setShowMCQResult] = useState(false);

  const handleMCQSubmit = () => {
    if (selectedMCQIndex === null) return;
    setShowMCQResult(true);
    onSubmit(String(selectedMCQIndex));
  };

  return (
    <div className="flex flex-col gap-4 p-5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      {/* Question text */}
      <div className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        {question.question}
      </div>

      {/* Answer input — dispatches by question type */}
      <div className="mt-2">
        {question.type === "mcq" && (
          <div className="flex flex-col gap-4">
            <MCQOptions
              question={question}
              selectedIndex={selectedMCQIndex}
              onSelect={setSelectedMCQIndex}
              showResult={showMCQResult}
              isCorrect={
                showMCQResult
                  ? selectedMCQIndex === question.correctIndex
                  : null
              }
            />
            {!showMCQResult && (
              <button
                type="button"
                onClick={handleMCQSubmit}
                disabled={selectedMCQIndex === null || isEvaluating}
                className="self-end px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Answer
              </button>
            )}
          </div>
        )}

        {(question.type === "conceptual" || question.type === "applied") && (
          <TextAnswer
            onSubmit={onSubmit}
            isEvaluating={isEvaluating}
            placeholder={
              question.type === "applied"
                ? "Describe your approach to this scenario..."
                : "Explain your understanding..."
            }
          />
        )}

        {question.type === "code-challenge" && (
          <CodeEditor
            question={question}
            onSubmit={onSubmit}
            isEvaluating={isEvaluating}
          />
        )}
      </div>
    </div>
  );
}
