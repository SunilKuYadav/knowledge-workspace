/**
 * Experience-level guidance for artifact generation.
 *
 * Provides per-artifact, per-level instructions that override or supplement
 * the static artifact templates. This ensures content depth, language,
 * and focus areas match what's actually useful for the user's target level.
 */

import type { ArtifactType } from "@/types";
import type { PromptConfig, ExperienceLevel } from "@/types/PromptConfig";

// ─── Level-Specific Guidance Per Artifact ───────────────────────────────────

interface LevelGuidance {
  depth: string;
  focus: string;
  avoid: string;
  interviewContext: string;
}

type ArtifactLevelMap = Record<ExperienceLevel, LevelGuidance>;

const NOTES_GUIDANCE: ArtifactLevelMap = {
  1: {
    depth: "Explain from scratch. Define every term. Use analogies a first-year engineer would understand.",
    focus: "Core concept clarity, step-by-step walkthroughs with small examples, visual diagrams, and building blocks needed before this topic makes sense.",
    avoid: "Do NOT assume knowledge of advanced patterns, proofs, or production-scale concerns. Skip amortized analysis unless you explain it from first principles.",
    interviewContext: "Frame the interview bar at L3/L4: a correct brute-force solution with basic edge case handling is a strong signal. Show what 'good enough' looks like.",
  },
  5: {
    depth: "Explain clearly with practical depth. Assume solid CS fundamentals but don't assume production experience.",
    focus: "Pattern recognition, optimization ladders (brute → better → optimal), clean implementation, and trade-off awareness. Include 'why this matters in real code.'",
    avoid: "Skip overly formal proofs (a brief correctness argument is fine). Don't overwhelm with Staff-level production concerns like GC pressure or NUMA.",
    interviewContext: "Frame the interview bar at L4/L5: optimal solution expected, clear communication of approach, ability to identify common edge cases without prompting.",
  },
  10: {
    depth: "First-principles depth with production rigor. Assume significant engineering experience.",
    focus: "Formal correctness arguments, production failure modes, performance at scale, subtle edge cases that trip up even experienced engineers, and system-level implications.",
    avoid: "Skip beginner explanations. Don't waste space on basic definitions unless the term is genuinely ambiguous in this context.",
    interviewContext: "Frame the interview bar at L5/L6: optimal solutions with proof of correctness, proactive edge case identification, trade-off articulation, and system-level thinking.",
  },
  15: {
    depth: "Principal/Distinguished engineer depth. Focus on architectural judgment and cross-system implications.",
    focus: "Problem-space framing, formal analysis, organizational impact of technical choices, migration paths, operational costs at scale, and connections to distributed systems theory.",
    avoid: "Skip ALL fundamentals. Never explain basic data structures, common algorithms, or standard patterns — the reader knows these. Focus only on the subtle, non-obvious aspects.",
    interviewContext: "Frame the interview bar at L6/L7: problem-space framing before solution, novel approaches, hidden requirement identification, and technical leadership signal.",
  },
};

const PATTERNS_GUIDANCE: ArtifactLevelMap = {
  1: {
    depth: "Introduce patterns as simple 'recipes' with very clear recognition signals.",
    focus: "The 3-4 most fundamental patterns for this topic. For each: what it looks like, a simple analogy, a heavily-commented template, and 2-3 easy practice problems to start with.",
    avoid: "Do NOT include advanced patterns, L6 follow-up variants, or company-specific targeting. Keep it focused and digestible.",
    interviewContext: "At L3/L4, recognizing ANY pattern and applying it correctly (even slowly) is a strong signal. The goal is building the habit of pattern recognition.",
  },
  5: {
    depth: "Cover the core patterns with enough depth to apply them confidently under interview pressure.",
    focus: "Recognition signals, clean templates, common mistakes when applying each pattern, the optimization path within each pattern, and 5-6 classic problems per pattern.",
    avoid: "Skip patterns that only appear in L6+ interviews unless they're foundational. Don't over-optimize for niche company-specific questions.",
    interviewContext: "At L4/L5, demonstrate you can recognize the pattern quickly, apply the template correctly, and handle the standard follow-up ('what about duplicates?').",
  },
  10: {
    depth: "Comprehensive pattern coverage including non-obvious applications and pattern combinations.",
    focus: "Pattern combinations (e.g., 'binary search + greedy'), non-obvious applications, when patterns break down, company-specific variants, and the judgment calls between similar patterns.",
    avoid: "Skip basic pattern introductions. The reader knows what sliding window is — focus on WHEN to use it vs alternatives and the subtle correctness issues.",
    interviewContext: "At L5/L6, distinguish yourself by identifying the non-obvious pattern, discussing alternatives you considered, and handling follow-ups that push toward system-level thinking.",
  },
  15: {
    depth: "Focus on pattern theory, novel applications, and cross-domain connections.",
    focus: "Why certain patterns exist from an information-theoretic perspective, connections to distributed systems problems, organizational patterns (how these map to system design), and open problems.",
    avoid: "Skip all standard pattern explanations. Focus entirely on the meta-level: when standard patterns fail, novel combinations, and architectural thinking about pattern selection.",
    interviewContext: "At L6/L7, the signal is in problem FRAMING — choosing how to decompose the problem determines the pattern. Show the decision process, not just the result.",
  },
};

const OVERVIEW_GUIDANCE: ArtifactLevelMap = {
  1: {
    depth: "Write for someone encountering this concept for the first time in their career.",
    focus: "Crystal-clear 'what is this?' explanation, a memorable real-world analogy, and a learning roadmap showing what to study in what order. Keep it encouraging.",
    avoid: "No jargon without immediate definition. No references to advanced concepts as if they're obvious.",
    interviewContext: "Help the reader understand why this topic appears in interviews and what level of understanding is expected at L3/L4.",
  },
  5: {
    depth: "Concise introduction assuming CS education but not deep practical experience.",
    focus: "Clear conceptual explanation, where this is used in production, the key insight that makes it 'click,' and what aspects matter most for interviews.",
    avoid: "Skip overly detailed history or academic context. Focus on practical understanding.",
    interviewContext: "At L4/L5, you need to explain this topic clearly to an interviewer in under 2 minutes. The overview should build that ability.",
  },
  10: {
    depth: "Brief, dense overview for an experienced engineer refreshing or connecting to new contexts.",
    focus: "The non-obvious aspects, production considerations most engineers miss, and how this connects to system-level decisions.",
    avoid: "Skip basic 'what is it' if the concept is standard. Focus on what makes this topic interesting at depth.",
    interviewContext: "At L5/L6, the overview should surface what distinguishes a strong answer from an average one on this topic.",
  },
  15: {
    depth: "Executive summary for a principal engineer — what's the architectural significance?",
    focus: "Where this fits in the broader technical landscape, organizational implications of choosing this approach, and what's changing in the field.",
    avoid: "Skip everything that would be obvious to a 15-year veteran. Focus only on the highest-signal information.",
    interviewContext: "At L6/L7, the overview should frame how this topic connects to system-wide architectural decisions and technical strategy.",
  },
};

const MISTAKES_GUIDANCE: ArtifactLevelMap = {
  1: {
    depth: "Focus on the most common beginner mistakes with patient, clear explanations of what goes wrong.",
    focus: "Off-by-one errors, forgetting edge cases (empty/null), confusion between similar concepts, syntax-level bugs, and 'I forgot to...' mistakes. For each: WHY it happens, a before/after code fix, and a mental checklist to avoid it.",
    avoid: "Don't include subtle production-level mistakes or concurrency issues. Focus on the mistakes that will actually trip up someone in their first 1-2 years.",
    interviewContext: "At L3/L4, avoiding basic bugs (null checks, off-by-one, forgetting to return) is the bar. These mistakes cost hire votes at junior level.",
  },
  5: {
    depth: "Cover both implementation mistakes and conceptual misunderstandings that mid-level engineers hit.",
    focus: "Incorrect complexity assumptions, misapplied patterns, edge cases that seem minor but break solutions, and the gap between 'works on examples' and 'works on all inputs.'",
    avoid: "Skip pure beginner mistakes (forgetting semicolons, basic null checks). The reader knows those. Focus on the subtle ones.",
    interviewContext: "At L4/L5, the mistakes that hurt are: choosing the wrong data structure, missing a key edge case the interviewer expects, or not testing your solution mentally.",
  },
  10: {
    depth: "Focus on senior-level mistakes: subtle correctness issues, production pitfalls, and interview-specific traps.",
    focus: "Correctness bugs that pass most test cases but fail at scale, performance assumptions that break under production load, concurrency issues, and the mistakes interviewers deliberately test for at L5/L6.",
    avoid: "Skip basic implementation bugs. Focus on mistakes that require deep understanding to even recognize.",
    interviewContext: "At L5/L6, the mistakes that cost you are: assuming properties that don't hold at scale, not considering failure modes, and providing a correct but inelegant solution.",
  },
  15: {
    depth: "Focus on architectural mistakes and judgment errors that affect systems and organizations.",
    focus: "Wrong abstractions that cause tech debt, premature optimization that constrains evolution, architectural decisions that seem correct locally but fail at system scale, and interview mistakes that signal 'senior but not staff.'",
    avoid: "Skip all code-level mistakes. Focus entirely on design decisions, architectural judgment, and the subtle signals that separate Staff from Principal.",
    interviewContext: "At L6/L7, the mistakes that cost you are: optimizing for the wrong metric, not framing the problem space, and proposing solutions that don't account for organizational constraints.",
  },
};

const INTERVIEW_GUIDANCE: ArtifactLevelMap = {
  1: {
    depth: "Focus on building interview confidence from scratch. Cover what to expect and how to prepare.",
    focus: "The most common questions at L3/L4, what 'thinking out loud' looks like in practice, how to handle being stuck, and what interviewers are ACTUALLY evaluating (not just code correctness). Include 'good enough' answers.",
    avoid: "Don't include L6+ questions or 'what separates Staff from Principal' discussions. Don't intimidate — build confidence.",
    interviewContext: "Emphasize: asking clarifying questions is a GREEN flag, brute force is acceptable, and getting stuck is normal. Show what recovery looks like.",
  },
  5: {
    depth: "Practical interview prep with clear expectations for the Senior (L4/L5) bar.",
    focus: "Common questions, expected answer quality, the optimization path interviewers expect to see, and how to communicate your approach effectively. Include timing guidance.",
    avoid: "Skip Principal-level questions. Focus on nailing the Senior bar solidly rather than reaching for Staff-level depth.",
    interviewContext: "At L4/L5, demonstrate: structured approach, clear communication, handling standard follow-ups, and knowing when your solution is 'done.'",
  },
  10: {
    depth: "Comprehensive interview prep targeting the Staff (L5/L6) bar.",
    focus: "What separates L5 from L6, proactive trade-off discussion, handling ambiguity, and the follow-up question chains that probe for Staff-level depth.",
    avoid: "Skip basic interview mechanics. The reader knows how interviews work. Focus on the delta between 'solid Senior' and 'Staff-level.'",
    interviewContext: "At L5/L6, the signal is: driving the solution design, proposing alternatives unprompted, connecting to system-level concerns, and handling curveball follow-ups with composure.",
  },
  15: {
    depth: "Target the Principal (L6/L7) bar with emphasis on problem framing and technical leadership signal.",
    focus: "How to frame ambiguous problems, demonstrate architectural thinking, show cross-organizational impact, and the specific signals hiring committees look for at Principal+ level.",
    avoid: "Skip standard interview advice. Focus entirely on what makes a Principal-level interview different from Staff.",
    interviewContext: "At L6/L7, the signal is: identifying what SHOULD be asked (not just answering what IS asked), connecting to broader business impact, and demonstrating you'd elevate the team.",
  },
};

const IMPLEMENTATION_GUIDANCE: ArtifactLevelMap = {
  1: {
    depth: "Step-by-step implementation with heavy comments explaining every decision.",
    focus: "The simplest correct implementation first, then small incremental improvements. Every line should have a purpose the reader can understand. Include 'why this line exists.'",
    avoid: "No performance-optimized code that sacrifices readability. No advanced language features without explanation.",
    interviewContext: "In interviews at L3/L4, a clean, correct, readable solution beats a clever optimized one every time.",
  },
  5: {
    depth: "Clean implementation with optimization path and common variations.",
    focus: "A well-structured implementation, then the optimization path showing what changes for better performance. Include common interview variations and their implementation differences.",
    avoid: "Skip overly academic implementations. Focus on what you'd actually write on a whiteboard.",
    interviewContext: "At L4/L5, demonstrate you can write clean code quickly and iterate toward the optimal solution when prompted.",
  },
  10: {
    depth: "Production-quality implementation with formal correctness reasoning.",
    focus: "Implementations that handle real-world concerns: error cases, boundary conditions, performance characteristics. Include loop invariants or correctness arguments for non-trivial logic.",
    avoid: "Skip toy implementations. Everything should be something you'd put in production or present in a Staff-level interview.",
    interviewContext: "At L5/L6, your implementation should demonstrate production thinking: error handling, edge cases handled without prompting, and clear complexity awareness.",
  },
  15: {
    depth: "Implementation with focus on design decisions, extension points, and architectural fit.",
    focus: "Why this implementation approach was CHOSEN over alternatives, how it fits into a larger system, extension points for future requirements, and operational characteristics.",
    avoid: "Skip the implementation itself if it's standard. Focus on the design reasoning and system-level implications of implementation choices.",
    interviewContext: "At L6/L7, the implementation is secondary to the discussion of WHY this approach and how it evolves. Show system-level thinking through implementation choices.",
  },
};

const CHEATSHEET_GUIDANCE: ArtifactLevelMap = {
  1: {
    depth: "A friendly quick-reference that helps recall the basics under pressure.",
    focus: "Key definitions, the most important 'if X then do Y' rules, a simple template to start from, and 3-5 common pitfalls to avoid. Keep it scannable and encouraging.",
    avoid: "No dense tables of advanced operations. No assumed knowledge. Keep entries self-contained.",
    interviewContext: "Use this 10 minutes before an interview to remember: what this is, when to use it, and the one template that covers 80% of problems.",
  },
  5: {
    depth: "Dense quick-reference optimized for interview-day recall.",
    focus: "Complexity table, recognition signals, reusable templates, common pitfalls, and the key insight for each variation.",
    avoid: "No explanations — just the facts. If it needs explanation, it belongs in notes.",
    interviewContext: "Scan this right before the interview to have patterns and complexities fresh in working memory.",
  },
  10: {
    depth: "Senior-level reference card focusing on the non-obvious and easily confused.",
    focus: "Subtle complexity differences, edge cases that change the algorithm, the 'gotcha' in each approach, and quick decision trees for picking between similar approaches.",
    avoid: "Skip anything that's obvious to a 10-year engineer. Only include what's easy to forget or confuse under pressure.",
    interviewContext: "At L5/L6, the cheatsheet should focus on what distinguishes optimal from near-optimal and the subtle correctness conditions.",
  },
  15: {
    depth: "Architectural decision reference for system-level thinking.",
    focus: "When this approach breaks at scale, alternatives and their trade-offs, cross-system implications, and the 2-3 key judgment calls.",
    avoid: "Skip all implementation details. Focus purely on high-level decision guidance.",
    interviewContext: "At L6/L7, use this to recall the system-level framing and cross-domain connections that signal principal-level thinking.",
  },
};

const EXAMPLES_GUIDANCE: ArtifactLevelMap = {
  1: {
    depth: "Simple, well-commented examples that each illustrate ONE concept.",
    focus: "Start with the simplest possible example, then gradually add complexity. Each example should have a clear 'what we're demonstrating here' label and detailed comments.",
    avoid: "No examples that combine multiple concepts. No tricky edge cases in initial examples — introduce those separately.",
    interviewContext: "Practice implementing these examples from memory. At L3/L4, being able to code basic examples fluently is the foundation.",
  },
  5: {
    depth: "Practical examples showing the pattern in common interview scenarios.",
    focus: "Examples that map to real interview problems. Show the pattern applied to 3-4 different problem shapes, highlighting what changes and what stays the same.",
    avoid: "Skip trivial examples. Focus on the level of complexity you'd see in an actual L4/L5 interview.",
    interviewContext: "These examples represent the difficulty and patterns you'll encounter. Practice writing them from scratch in under 15 minutes each.",
  },
  10: {
    depth: "Advanced examples with focus on edge cases and optimization variations.",
    focus: "Examples that demonstrate the subtle differences between correct and subtly-wrong implementations, performance-critical variations, and non-obvious applications.",
    avoid: "Skip textbook examples. Focus on examples that reveal something non-obvious or commonly misunderstood.",
    interviewContext: "At L5/L6, these examples show the difference between 'correct' and 'production-correct.' Practice explaining the why behind each implementation choice.",
  },
  15: {
    depth: "Examples demonstrating system-level applications and architectural patterns.",
    focus: "How this concept manifests in large-scale systems, cross-cutting examples that connect to distributed systems, and examples that illustrate why simpler approaches break.",
    avoid: "Skip standalone algorithmic examples. Focus on examples in context — how this fits into real system architectures.",
    interviewContext: "At L6/L7, use these examples to demonstrate breadth: 'this same pattern appears in X, Y, and Z, and here's why.'",
  },
};

// ─── Guidance Lookup ────────────────────────────────────────────────────────

const GUIDANCE_MAP: Partial<Record<ArtifactType, ArtifactLevelMap>> = {
  notes: NOTES_GUIDANCE,
  patterns: PATTERNS_GUIDANCE,
  overview: OVERVIEW_GUIDANCE,
  mistakes: MISTAKES_GUIDANCE,
  interview: INTERVIEW_GUIDANCE,
  implementation: IMPLEMENTATION_GUIDANCE,
  cheatsheet: CHEATSHEET_GUIDANCE,
  examples: EXAMPLES_GUIDANCE,
};

/**
 * Returns experience-level guidance for a specific artifact type.
 * This guidance is injected into the artifact generation prompt to ensure
 * content depth matches what's actually useful at the user's level.
 */
export function getArtifactLevelGuidance(
  artifact: ArtifactType,
  config: PromptConfig,
): string {
  const guidanceMap = GUIDANCE_MAP[artifact];
  if (!guidanceMap) return "";

  const guidance = guidanceMap[config.experienceLevel];
  if (!guidance) return "";

  const companies = config.targetCompanies.join(", ");

  return `Target: ${config.targetRole} (${config.experienceLevel}+ YOE) at ${companies}

Content Depth: ${guidance.depth}

Focus On: ${guidance.focus}

Avoid: ${guidance.avoid}

Interview Context: ${guidance.interviewContext}`;
}
