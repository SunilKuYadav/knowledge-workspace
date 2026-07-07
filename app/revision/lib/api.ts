import type {
  CategorizedItem,
  ReviewQuestion,
  EvaluationResult,
  SessionSummary,
  AnswerRecord,
  GeneratableContent,
} from "./types";

/**
 * Generates AI review questions for a given revision item.
 */
export async function generateReviewQuestions(
  item: CategorizedItem,
): Promise<{
  questions?: ReviewQuestion[];
  error?: string;
  rawResponse?: string;
}> {
  const res = await fetch("/api/ai/review-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "generate",
      itemId: item.item.itemId,
      itemType: item.item.itemType,
      confidence: item.item.confidence,
    }),
  });

  if (!res.ok) {
    return {
      error: "Failed to generate review questions. Is the AI service running?",
    };
  }

  const data = await res.json();
  if (!data.questions || data.questions.length === 0) {
    const debugInfo = data.rawResponse
      ? `\n\nAI responded but parsing failed. Raw: "${data.rawResponse}"`
      : "";
    return { error: `No questions generated. Try again.${debugInfo}` };
  }

  return { questions: data.questions };
}

/**
 * Evaluates the user's response to a question.
 */
export async function evaluateResponse(
  item: CategorizedItem,
  question: string,
  userResponse: string,
  questionType: string,
): Promise<{ result?: EvaluationResult; error?: string }> {
  const res = await fetch("/api/ai/review-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "evaluate",
      itemId: item.item.itemId,
      itemType: item.item.itemType,
      question,
      userResponse,
      questionType,
    }),
  });

  if (!res.ok) {
    return { error: "Failed to evaluate response." };
  }

  const result: EvaluationResult = await res.json();
  return { result };
}

/**
 * Gets a session summary after all questions are answered.
 */
export async function getSessionSummary(
  item: CategorizedItem,
  answers: AnswerRecord[],
): Promise<SessionSummary | null> {
  try {
    const res = await fetch("/api/ai/review-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "session-summary",
        itemId: item.item.itemId,
        itemType: item.item.itemType,
        answers,
      }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Non-critical: summary generation failed
  }
  return null;
}

/**
 * Streams a hint for the current question.
 * Returns the full hint text via callback updates.
 */
export async function streamHint(
  item: CategorizedItem,
  question: string,
  questionType: string,
  onChunk: (accumulated: string) => void,
): Promise<void> {
  const res = await fetch("/api/ai/review-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "hint",
      itemId: item.item.itemId,
      itemType: item.item.itemType,
      question,
      questionType,
    }),
  });

  if (res.ok && res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      onChunk(accumulated);
    }
  } else {
    onChunk("Unable to get hint right now.");
  }
}

/**
 * Generates content (notes, mistakes, patterns, solution, flashcards)
 * based on the review session Q&A and existing content.
 * Streams the generated content via callback.
 */
export async function generateContentFromSession(
  item: CategorizedItem,
  answers: AnswerRecord[],
  contentType: GeneratableContent,
  onChunk: (accumulated: string) => void,
): Promise<void> {
  const res = await fetch("/api/ai/review-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "generate-content",
      itemId: item.item.itemId,
      itemType: item.item.itemType,
      answers,
      contentType,
    }),
  });

  if (res.ok && res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      onChunk(accumulated);
    }
  } else {
    onChunk("Unable to generate content right now.");
  }
}
