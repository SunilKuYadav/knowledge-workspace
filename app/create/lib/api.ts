import type { TopicFormData, ProblemFormData, FormType } from "./types";

/**
 * Calls the AI parse-form endpoint to extract structured form data
 * from a natural language description.
 */
export async function parseFormWithAI(
  text: string,
  formType: FormType,
): Promise<TopicFormData | ProblemFormData> {
  const response = await fetch("/api/ai/parse-form", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.trim(), formType }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || "Failed to parse text");
  }

  return json.data;
}
