"use client";

import { useProblemWorkspace } from "./useProblemWorkspace";
import { OverviewTab } from "./components/OverviewTab";
import { DescriptionTab } from "./components/description-tab";
import { PracticePanel } from "./components/practice-panel";
import { NotesTab } from "./components/notes-tab";
import { VariationsTab } from "./components/variations-tab";
import { SolutionTab } from "./components/solution-tab";
import ProblemGenerateButton from "./components/generate-button";
import ProblemRegenerateButton from "./components/regenerate-button";
import { TABS } from "./constants";
import type { ProblemWorkspaceProps } from "./types";
import type { ProblemDescription } from "@/types";
import { useCallback, useEffect } from "react";
import { useProblemEvaluation } from "@/src/providers/ProblemEvaluationProvider";

export default function ProblemWorkspace(props: ProblemWorkspaceProps) {
  const { problem, revision } = props;

  const {
    activeTab,
    setActiveTab,
    desc,
    setDesc,
    code,
    setCode,
    notes,
    setNotes,
    solution,
    generating,
    genError,
    saveStatus,
    noteGenContent,
    isGenNote,
    variationLoading,
    executionResult,
    isExecuting,
    descStreamContent,
    variationStreamContent,
    handleCancelDescription,
    handleCancelNote,
    handleCancelVariation,
    handleGenerateDescription,
    handleSaveNotes,
    handleGenerateNote,
    handleRegenerateNotes,
    isRegeneratingNotes,
    handleGenerateVariation,
    handleRunCode,
    evaluation,
    isEvaluating,
    handleEvaluateSolution,
    handleOverwriteSolution,
    hint,
    isGettingHint,
    hintStreamContent,
    handleGetHint,
    handleCancelHint,
    handleDismissHint,
    practiceTarget,
    handleSwitchPracticeTarget,
    pendingSolution,
    handleConfirmSaveSolution,
    handleDismissPendingSolution,
  } = useProblemWorkspace(props);

  // Bridge evaluation data to the shared context for AISidebar
  const { publishEvaluation, registerSaveHandlers } = useProblemEvaluation();

  // Publish evaluation to shared context whenever it changes
  useEffect(() => {
    if (evaluation && evaluation.overallScore > 0) {
      publishEvaluation(evaluation, code, {
        title: problem.title,
        patterns: problem.patterns,
        difficulty: problem.difficulty,
      });
    }
  }, [evaluation, code, problem, publishEvaluation]);

  // Register save handlers so sidebar can save notes/solutions back
  useEffect(() => {
    registerSaveHandlers({
      onSaveNotes: (newNotes: string) => {
        const merged = notes
          ? `${notes}\n\n---\n\n${newNotes}`
          : newNotes;
        setNotes(merged);
      },
      onSaveSolution: (newCode: string) => {
        setCode(newCode);
      },
    });
  }, [registerSaveHandlers, notes, setNotes, setCode]);

  /** Called when description is generated via the unified Generate button. */
  const handleDescGenerated = useCallback(
    (description: ProblemDescription) => {
      setDesc(description);
      if (description.boilerplate && !code.trim()) {
        setCode(description.boilerplate);
      }
      setActiveTab("description");
    },
    [setDesc, setCode, setActiveTab, code],
  );

  /** Called when notes are generated via the unified Generate button. */
  const handleNotesGenerated = useCallback(
    (generatedNotes: string) => {
      setNotes(generatedNotes);
      setActiveTab("notes");
    },
    [setNotes, setActiveTab],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="flex items-center border-b border-zinc-200 dark:border-zinc-700 px-4 shrink-0"
        role="tablist"
      >
        <div className="flex flex-1 flex-wrap items-end gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              }`}
            >
              {tab.label}
              {tab.key === "variations" &&
                desc?.variations &&
                desc.variations.length > 0 && (
                  <span className="ml-1.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                    {desc.variations.length}
                  </span>
                )}
            </button>
          ))}

          {/* AI Generate button */}
          <ProblemGenerateButton
            problem={problem}
            hasDescription={!!desc}
            hasNotes={!!notes}
            hasSolution={!!solution}
            solutionCode={solution}
            onDescriptionGenerated={handleDescGenerated}
            onNotesGenerated={handleNotesGenerated}
          />
        </div>

        {/* Regenerate button for active tab */}
        <div className="flex items-center gap-2 shrink-0">
          <ProblemRegenerateButton
            problem={problem}
            activeTab={activeTab}
            hasDescription={!!desc}
            hasNotes={!!notes}
            hasSolution={!!solution}
            solutionCode={solution}
            onDescriptionRegenerated={handleDescGenerated}
            onNotesRegenerated={handleNotesGenerated}
          />
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "overview" && (
          <OverviewTab
            problem={problem}
            description={desc}
            revision={revision}
            hasSolution={!!solution}
            hasNotes={!!notes}
            variationCount={desc?.variations?.length || 0}
          />
        )}

        {activeTab === "description" && (
          <DescriptionTab
            desc={desc}
            generating={generating}
            genError={genError}
            descStreamContent={descStreamContent}
            handleGenerateDescription={handleGenerateDescription}
            handleCancelDescription={handleCancelDescription}
          />
        )}

        {activeTab === "practice" && (
          <PracticePanel
            problem={problem}
            desc={desc}
            code={code}
            setCode={setCode}
            generating={generating}
            genError={genError}
            isExecuting={isExecuting}
            isGenNote={isGenNote}
            noteGenContent={noteGenContent}
            variationLoading={variationLoading}
            executionResult={executionResult}
            evaluation={evaluation}
            isEvaluating={isEvaluating}
            handleGenerateDescription={handleGenerateDescription}
            handleRunCode={handleRunCode}
            handleGenerateNote={handleGenerateNote}
            handleGenerateVariation={handleGenerateVariation}
            handleCancelNote={handleCancelNote}
            handleEvaluateSolution={handleEvaluateSolution}
            hint={hint}
            isGettingHint={isGettingHint}
            hintStreamContent={hintStreamContent}
            handleGetHint={handleGetHint}
            handleCancelHint={handleCancelHint}
            handleDismissHint={handleDismissHint}
            practiceTarget={practiceTarget}
            onSwitchPracticeTarget={handleSwitchPracticeTarget}
            pendingSolution={pendingSolution}
            onConfirmSaveSolution={handleConfirmSaveSolution}
            onDismissPendingSolution={handleDismissPendingSolution}
          />
        )}

        {activeTab === "solution" && (
          <SolutionTab
            problemId={problem.id}
            solution={solution}
            saveStatus={saveStatus}
            handleOverwriteSolution={handleOverwriteSolution}
            onPracticeVariation={(variationId, variationTitle, difficulty) => {
              handleSwitchPracticeTarget({
                type: "variation",
                variationId,
                title: variationTitle,
                difficulty,
              });
              setActiveTab("practice");
            }}
          />
        )}

        {activeTab === "notes" && (
          <NotesTab
            problemId={problem.id}
            notes={notes}
            code={code}
            saveStatus={saveStatus}
            isGenNote={isGenNote}
            handleSaveNotes={handleSaveNotes}
            handleGenerateNote={handleGenerateNote}
            handleCancelNote={handleCancelNote}
            setNotes={setNotes}
            handleRegenerateNotes={handleRegenerateNotes}
            isRegeneratingNotes={isRegeneratingNotes}
          />
        )}

        {activeTab === "variations" && (
          <VariationsTab
            desc={desc}
            variationLoading={variationLoading}
            variationStreamContent={variationStreamContent}
            handleGenerateVariation={handleGenerateVariation}
            handleCancelVariation={handleCancelVariation}
            onDescUpdated={setDesc}
            onPracticeVariation={(variationId, variationTitle, difficulty) => {
              handleSwitchPracticeTarget({
                type: "variation",
                variationId,
                title: variationTitle,
                difficulty,
              });
              setActiveTab("practice");
            }}
          />
        )}
      </div>
    </div>
  );
}
