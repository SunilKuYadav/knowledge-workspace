import type {
  ReviewQuestion,
  EvaluationResult,
  AnswerRecord,
  SessionSummary,
} from "@/app/revision/lib/types";

export interface SelfTestButtonProps {
  itemId: string;
  itemType: "topic" | "problem";
  confidence: number;
}

export type Phase =
  | "closed"
  | "generating"
  | "answering"
  | "evaluating"
  | "feedback"
  | "summary";

export type { ReviewQuestion, EvaluationResult, AnswerRecord, SessionSummary };
