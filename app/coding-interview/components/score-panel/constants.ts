import type { ScoringReport } from "../../lib/types";

export const DIMENSION_LABELS: Record<string, string> = {
  communication: "Communication",
  codingAbility: "Coding Ability",
  problemSolving: "Problem Solving",
  algorithmSelection: "Algorithm Selection",
  complexityAnalysis: "Complexity Analysis",
  edgeCaseCoverage: "Edge Case Coverage",
  codeQuality: "Code Quality",
};

export function getReadinessBadge(readiness: ScoringReport["readiness"]) {
  switch (readiness) {
    case "not ready":
      return {
        label: "Not Ready",
        className:
          "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      };
    case "needs practice":
      return {
        label: "Needs Practice",
        className:
          "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
      };
    case "almost ready":
      return {
        label: "Almost Ready",
        className:
          "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
      };
    case "ready":
      return {
        label: "Ready",
        className:
          "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      };
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}
