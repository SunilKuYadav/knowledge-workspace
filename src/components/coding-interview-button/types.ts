/** Compact variation info passed to the coding interview button. */
export interface VariationInfo {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  category?: string;
  tags?: string[];
  status: "not-started" | "attempted" | "solved";
}

export interface CodingInterviewButtonProps {
  source: "problem" | "topic" | "revision" | "practice" | "interview";
  id?: string;
  title?: string;
  category?: string;
  tags?: string[];
  concepts?: string[];
  difficulty?: "easy" | "medium" | "hard";
  /** Solve status of the main problem (when source="problem") */
  problemStatus?: "not-started" | "attempted" | "solved";
  /** Variations with their solve states (when source="problem") */
  variations?: VariationInfo[];
  /** Problem titles to avoid generating (when source="topic") — from practice suggestions */
  avoidProblems?: string[];
  variant?: "button" | "card";
}
