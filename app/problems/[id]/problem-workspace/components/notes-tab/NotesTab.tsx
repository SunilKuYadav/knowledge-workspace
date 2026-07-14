"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import { getStructuredSolutions } from "@/app/problems/[id]/actions";

export interface NotesTabProps {
  problemId: string;
  notes: string;
  code: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  isGenNote: boolean;
  handleSaveNotes: () => void;
  handleGenerateNote: () => void;
  handleCancelNote: () => void;
  /** Update notes state from parent (for inline editing) */
  setNotes: (notes: string) => void;
  /** Regenerate general note combining all solution notes */
  handleRegenerateNotes: () => void;
  isRegeneratingNotes: boolean;
}

interface SolutionNote {
  solutionId: string;
  solutionNumber: number;
  score?: number;
  savedAt: string;
  note: string;
}

export function NotesTab({
  problemId,
  notes,
  code,
  saveStatus,
  isGenNote,
  handleSaveNotes,
  handleGenerateNote,
  handleCancelNote,
  setNotes,
  handleRegenerateNotes,
  isRegeneratingNotes,
}: NotesTabProps) {
  const [solutionNotes, setSolutionNotes] = useState<SolutionNote[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["general"]),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [, startTransition] = useTransition();

  // Load solution notes
  useEffect(() => {
    startTransition(async () => {
      const solutions = await getStructuredSolutions(problemId);
      const notesFromSolutions: SolutionNote[] = solutions
        .map((s, idx) => ({
          solutionId: s.id,
          solutionNumber: idx + 1,
          score: s.score,
          savedAt: s.savedAt,
          note: s.note || "",
        }))
        .filter((n) => n.note.trim().length > 0);
      setSolutionNotes(notesFromSolutions);
    });
  }, [problemId, notes]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartEdit = useCallback(() => {
    setEditContent(notes);
    setIsEditing(true);
  }, [notes]);

  const handleSaveEdit = useCallback(() => {
    setNotes(editContent);
    setIsEditing(false);
    // Trigger save after state update
    setTimeout(() => handleSaveNotes(), 0);
  }, [editContent, setNotes, handleSaveNotes]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent("");
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getScoreColor = (score?: number) => {
    if (score === undefined) return "text-zinc-500";
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-blue-600 dark:text-blue-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const hasAnyContent = notes.trim() || solutionNotes.length > 0;

  if (!hasAnyContent && !isGenNote) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-zinc-500 dark:text-zinc-400 mb-2">
            No notes yet.
          </p>
          <p className="text-sm text-zinc-400 mb-4">
            Solve the problem first, then generate a note from your solution.
          </p>
          <button
            onClick={handleGenerateNote}
            disabled={isGenNote || !code.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            ✨ Generate Note from Code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          All Notes
        </h3>
        <div className="flex items-center gap-3">
          {isGenNote ? (
            <button
              onClick={handleCancelNote}
              className="text-xs text-red-600 dark:text-red-400 hover:underline"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handleGenerateNote}
              disabled={!code.trim()}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
            >
              ✨ Generate
            </button>
          )}
          <button
            onClick={handleRegenerateNotes}
            disabled={isRegeneratingNotes || solutionNotes.length === 0}
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
            title="Regenerate general note from all solution notes"
          >
            {isRegeneratingNotes ? "Regenerating..." : "🔄 Regenerate"}
          </button>
        </div>
      </div>

      {/* Solution-attached notes */}
      {solutionNotes.length > 0 && (
        <div className="space-y-2">
          {solutionNotes
            .slice()
            .reverse()
            .map((sn) => {
              const isExpanded = expandedSections.has(sn.solutionId);
              return (
                <div
                  key={sn.solutionId}
                  className="rounded-lg border border-indigo-200 dark:border-indigo-800 overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(sn.solutionId)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-3.5 h-3.5 text-indigo-400 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                      <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        📝 Solution #{sn.solutionNumber}
                      </span>
                      {sn.score !== undefined && (
                        <span className={`text-xs font-semibold ${getScoreColor(sn.score)}`}>
                          ({sn.score}/100)
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">
                      {formatDate(sn.savedAt)}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 py-3 border-t border-indigo-100 dark:border-indigo-800/50">
                      <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                        <MarkdownRenderer>{sn.note}</MarkdownRenderer>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* General notes section */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            onClick={() => toggleSection("general")}
            className="flex items-center gap-2 text-left"
          >
            <svg
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform shrink-0 ${expandedSections.has("general") ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              📄 General Notes
            </span>
          </button>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                ✏️ Edit
              </button>
            )}
            <button
              onClick={handleSaveNotes}
              disabled={saveStatus === "saving"}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              {saveStatus === "saved" ? "✓ Saved" : "Save"}
            </button>
          </div>
        </div>
        {expandedSections.has("general") && (
          <div className="border-t border-zinc-100 dark:border-zinc-700/50">
            {isEditing ? (
              <div className="p-4 space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[300px] p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm font-mono text-zinc-800 dark:text-zinc-200 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  spellCheck={false}
                  placeholder="Write your notes in Markdown..."
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : notes.trim() ? (
              <div className="px-4 py-3">
                <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                  <MarkdownRenderer>{notes}</MarkdownRenderer>
                </div>
              </div>
            ) : (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-zinc-400">
                  No general notes yet. Click Edit to write or Generate to create from your code.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
