/**
 * JSON schema instruction for quiz question output.
 */
export const QUIZ_SCHEMA = `Return ONLY a valid JSON array with this exact structure (no additional text):
[
  {
    "question": "What is...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "The correct answer is A because..."
  }
]`;
