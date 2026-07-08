/**
 * Prompt configuration types and Zod schemas.
 *
 * Allows users to configure their experience level and customize
 * AI prompt calibration across all actions.
 */

import { z } from "zod";

// ─── Experience Levels ──────────────────────────────────────────────────────

export const EXPERIENCE_LEVELS = [5, 10, 15] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const ExperienceLevelSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
]);

// ─── Prompt Action Keys ─────────────────────────────────────────────────────

export const PROMPT_ACTION_KEYS = [
  "identity",
  "teaching",
  "interview",
  "dsa",
  "systemDesign",
  "revision",
  "codingInterview",
] as const;

export type PromptActionKey = (typeof PROMPT_ACTION_KEYS)[number];

// ─── Override Schema ────────────────────────────────────────────────────────

export const PromptOverrideSchema = z.object({
  /** Additional instructions to append to the system prompt for this action */
  append: z.string().optional(),
  /** If set, completely replaces the system prompt for this action */
  replace: z.string().optional(),
});

export type PromptOverride = z.infer<typeof PromptOverrideSchema>;

// ─── Full Config Schema ─────────────────────────────────────────────────────

export const PromptConfigSchema = z.object({
  experienceLevel: ExperienceLevelSchema.default(5),
  targetRole: z.string().default("Senior Engineer (L4/L5)"),
  targetCompanies: z
    .array(z.string())
    .default(["Google", "Meta", "Microsoft", "Amazon", "Apple"]),
  overrides: z
    .record(z.string(), PromptOverrideSchema)
    .default({})
    .transform((val) => {
      // Only keep valid action keys
      const result: Partial<Record<PromptActionKey, z.infer<typeof PromptOverrideSchema>>> = {};
      for (const key of PROMPT_ACTION_KEYS) {
        if (key in val) {
          result[key] = val[key];
        }
      }
      return result as Record<string, z.infer<typeof PromptOverrideSchema>>;
    }),
});

export type PromptConfig = {
  experienceLevel: ExperienceLevel;
  targetRole: string;
  targetCompanies: string[];
  overrides: Partial<Record<PromptActionKey, PromptOverride>>;
};

// ─── Default Config ─────────────────────────────────────────────────────────

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  experienceLevel: 5,
  targetRole: "Senior Engineer (L4/L5)",
  targetCompanies: ["Google", "Meta", "Microsoft", "Amazon", "Apple"],
  overrides: {},
};

// ─── Experience Level Presets ───────────────────────────────────────────────

export interface ExperiencePreset {
  level: ExperienceLevel;
  label: string;
  description: string;
  targetRole: string;
  interviewBar: string;
  teachingDepth: string;
}

export const EXPERIENCE_PRESETS: ExperiencePreset[] = [
  {
    level: 5,
    label: "5 Years Experience",
    description: "Mid-level engineer targeting Senior (L4/L5) roles",
    targetRole: "Senior Engineer (L4/L5)",
    interviewBar:
      "L4/L5 at top-tier companies. Focus on solid fundamentals, clean code, and demonstrating growth potential.",
    teachingDepth:
      "Build strong foundations with clear explanations. Bridge from textbook knowledge to practical application. Emphasize pattern recognition and systematic problem-solving approaches.",
  },
  {
    level: 10,
    label: "10 Years Experience",
    description: "Senior engineer targeting Staff (L5/L6) roles",
    targetRole: "Senior/Staff Engineer (L5/L6)",
    interviewBar:
      "L5/L6 at Google/Meta/Microsoft. Expects optimal solutions with trade-off articulation, system-level thinking, and production depth.",
    teachingDepth:
      "Teach from first principles at senior depth. Include production considerations, failure modes, and the nuanced understanding that separates senior from mid-level. Challenge assumptions proactively.",
  },
  {
    level: 15,
    label: "15 Years Experience",
    description: "Staff+ engineer targeting Principal (L6/L7) roles",
    targetRole: "Principal/Distinguished Engineer (L6/L7)",
    interviewBar:
      "L6/L7 at Google/Meta/Microsoft. Expects problem-space framing, hidden requirement identification, architectural breadth, and the ability to drive ambiguous problems to clarity.",
    teachingDepth:
      "Assume deep expertise. Focus on architectural thinking, cross-system implications, organizational impact, and the subtle judgment calls that define principal-level engineers. Skip fundamentals entirely.",
  },
];
