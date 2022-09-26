/**
 * JSON schema instructions for review session responses.
 */

export const REVIEW_QUESTIONS_SCHEMA = `Return ONLY a valid JSON array with this exact structure (no additional text, no markdown):
[
  {
    "type": "conceptual|code|debug|edge-case|application|comparison",
    "question": "The question text...",
    "expectedAnswer": "A concise expected answer or key points the response should cover",
    "difficulty": "basic|intermediate|advanced"
  }
]`;

export const EVALUATION_SCHEMA = `Return ONLY valid JSON with this exact structure (no additional text, no markdown):
{
  "score": 4,
  "mistakes": ["Mistake 1", "Mistake 2"],
  "correctAnswer": "The ideal answer...",
  "keyInsights": ["Insight 1", "Insight 2"],
  "feedback": "Brief encouraging feedback explaining what was good and what to improve"
}`;

export const SESSION_SUMMARY_SCHEMA = `Return ONLY valid JSON with this exact structure (no additional text, no markdown):
{
  "recommendedConfidence": 4,
  "allMistakes": ["Consolidated mistake 1", "Consolidated mistake 2"],
  "focusAreas": ["Area to focus on 1", "Area to focus on 2"],
  "summary": "Brief encouraging summary of performance"
}`;
