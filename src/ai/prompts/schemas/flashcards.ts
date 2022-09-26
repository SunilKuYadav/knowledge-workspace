/**
 * JSON schema instruction for flashcard output.
 */
export const FLASHCARDS_SCHEMA = `Return ONLY a valid JSON array with this exact structure (no additional text):
[
  {
    "front": "What is the time complexity of binary search?",
    "back": "O(log n) because the search space is halved with each comparison.",
    "tags": ["binary-search", "complexity"]
  }
]`;
