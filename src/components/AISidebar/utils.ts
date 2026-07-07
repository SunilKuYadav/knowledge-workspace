/**
 * Heuristic to detect if a user's prompt is a general question (not specific
 * to the current problem/topic). General questions shouldn't be saved to the
 * item's folder.
 */
export function detectGeneralQuestion(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const generalPhrases = [
    "what is",
    "what are",
    "how does",
    "how do",
    "explain the difference",
    "compare",
    "define",
    "tell me about",
    "in general",
    "generally",
    "what's the difference between",
  ];
  const specificPhrases = [
    "this problem",
    "this topic",
    "this solution",
    "this code",
    "the approach",
    "my solution",
    "my notes",
    "this concept",
    "for this",
    "here",
    "above",
  ];

  const hasSpecificReference = specificPhrases.some((phrase) =>
    lower.includes(phrase),
  );
  if (hasSpecificReference) return false;

  const hasGeneralPhrase = generalPhrases.some((phrase) =>
    lower.includes(phrase),
  );
  if (hasGeneralPhrase) return true;

  return false;
}
