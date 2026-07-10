export { TopicSchema } from "./Topic";
export type { Topic } from "./Topic";

export { ProblemSchema, ProblemFrequencySchema, ComplexitySchema } from "./Problem";
export type { Problem, ProblemFrequency, Complexity } from "./Problem";

export { SemanticDescriptionSchema, TargetLevelSchema } from "./SemanticDescription";
export type { SemanticDescription, TargetLevel } from "./SemanticDescription";

export {
  ProblemDescriptionSchema,
  ProblemVariationSchema,
  VariationPracticeEntrySchema,
  TestCaseSchema,
} from "./ProblemDescription";
export type {
  ProblemDescription,
  ProblemVariation,
  VariationPracticeEntry,
  TestCase as ProblemTestCase,
} from "./ProblemDescription";

export { ArtifactSchema, ARTIFACT_LABELS, ARTIFACT_ORDER } from "./Artifact";
export type { ArtifactType } from "./Artifact";

export {
  ConfidenceSchema,
  RevisionEntrySchema,
  RevisionDataSchema,
} from "./Revision";
export type { RevisionEntry, RevisionData } from "./Revision";

export { FlashcardSchema, FlashcardDeckSchema } from "./Flashcard";
export type { Flashcard, FlashcardDeck } from "./Flashcard";

export { StudyPlanSchema, StudyPlanItemSchema } from "./StudyPlan";
export type { StudyPlan, StudyPlanItem } from "./StudyPlan";

export type { FilesystemError, AIError, GitError } from "./errors";

export {
  PromptConfigSchema,
  ExperienceLevelSchema,
  PromptOverrideSchema,
  EXPERIENCE_LEVELS,
  PROMPT_ACTION_KEYS,
  DEFAULT_PROMPT_CONFIG,
  EXPERIENCE_PRESETS,
} from "./PromptConfig";
export type {
  PromptConfig,
  ExperienceLevel,
  PromptActionKey,
  PromptOverride,
  ExperiencePreset,
} from "./PromptConfig";
