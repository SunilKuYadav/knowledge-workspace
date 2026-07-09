import { z } from "zod";

/* ─── Enums & Literals ───────────────────────────────────── */

export const AssessmentPhaseTypeSchema = z.enum([
  "conceptual",
  "mcq",
  "applied",
  "code-challenge",
]);
export type AssessmentPhaseType = z.infer<typeof AssessmentPhaseTypeSchema>;

export const DifficultyLevelSchema = z.enum(["easy", "medium", "hard"]);
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

export const AssessmentStatusSchema = z.enum(["in-progress", "completed"]);
export type AssessmentStatus = z.infer<typeof AssessmentStatusSchema>;

export const TrendIndicatorSchema = z.enum([
  "improving",
  "declining",
  "stable",
]);
export type TrendIndicator = z.infer<typeof TrendIndicatorSchema>;

/* ─── Question Types ─────────────────────────────────────── */

export const ConceptualQuestionSchema = z.object({
  type: z.literal("conceptual"),
  question: z.string(),
  expectedAnswer: z.string(),
});
export type ConceptualQuestion = z.infer<typeof ConceptualQuestionSchema>;

export const MCQQuestionSchema = z.object({
  type: z.literal("mcq"),
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
  distractorExplanations: z.array(z.string()).length(3),
});
export type MCQQuestion = z.infer<typeof MCQQuestionSchema>;

export const AppliedQuestionSchema = z.object({
  type: z.literal("applied"),
  question: z.string(),
  scenario: z.string(),
  expectedAnswer: z.string(),
});
export type AppliedQuestion = z.infer<typeof AppliedQuestionSchema>;

export const CodeChallengeQuestionSchema = z.object({
  type: z.literal("code-challenge"),
  question: z.string(),
  problemStatement: z.string(),
  inputFormat: z.string(),
  outputFormat: z.string(),
  examples: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        explanation: z.string(),
      })
    )
    .min(1)
    .max(3),
});
export type CodeChallengeQuestion = z.infer<typeof CodeChallengeQuestionSchema>;

export const AssessmentQuestionSchema = z.discriminatedUnion("type", [
  ConceptualQuestionSchema,
  MCQQuestionSchema,
  AppliedQuestionSchema,
  CodeChallengeQuestionSchema,
]);
export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;

/* ─── Evaluation ─────────────────────────────────────────── */

export const QuestionEvaluationSchema = z.object({
  score: z.number().int().min(0).max(10),
  feedback: z.string().max(500),
  mistakes: z.array(z.string()).max(5),
  keyInsights: z.array(z.string()).max(3),
  expectedAnswer: z.string().optional(),
});
export type QuestionEvaluation = z.infer<typeof QuestionEvaluationSchema>;

/* ─── Phase Result ───────────────────────────────────────── */

export const PhaseResultSchema = z.object({
  phaseType: AssessmentPhaseTypeSchema,
  questions: z.array(AssessmentQuestionSchema),
  userAnswers: z.array(z.string()),
  evaluations: z.array(QuestionEvaluationSchema),
  phaseScore: z.number().min(0).max(10),
  difficulty: DifficultyLevelSchema,
});
export type PhaseResult = z.infer<typeof PhaseResultSchema>;

/* ─── Feedback Report ────────────────────────────────────── */

export const FeedbackReportSchema = z.object({
  overallConfidence: z.number().min(1).max(5),
  phaseScores: z.object({
    conceptual: z.number().min(0).max(10),
    mcq: z.number().min(0).max(10),
    applied: z.number().min(0).max(10),
    "code-challenge": z.number().min(0).max(10),
  }),
  strengths: z.array(z.string()).min(1).max(5),
  weaknesses: z.array(z.string()).min(1).max(5),
  studyRecommendations: z
    .array(
      z.object({
        recommendation: z.string(),
        targetSection: z.string(),
      })
    )
    .min(2)
    .max(5),
  suggestedContentUpdates: z.array(
    z.object({
      artifact: z.string(),
      gap: z.string(),
      suggestion: z.string(),
    })
  ),
});
export type FeedbackReport = z.infer<typeof FeedbackReportSchema>;

/* ─── Assessment Record (persisted) ─────────────────────── */

export const AssessmentRecordSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string(),
  status: AssessmentStatusSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  experienceLevel: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  phases: z.array(PhaseResultSchema),
  feedbackReport: FeedbackReportSchema.optional(),
  confidenceScore: z.number().min(1).max(5).optional(),
  initialDifficulty: DifficultyLevelSchema,
});
export type AssessmentRecord = z.infer<typeof AssessmentRecordSchema>;

/* ─── Assessment History File ────────────────────────────── */

export const AssessmentHistorySchema = z.object({
  topicId: z.string(),
  assessments: z.array(AssessmentRecordSchema).max(50),
});
export type AssessmentHistory = z.infer<typeof AssessmentHistorySchema>;
