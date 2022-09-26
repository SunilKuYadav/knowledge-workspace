/**
 * JSON context — strict JSON output instructions for structured responses.
 */
export const JSON_CONTEXT = `When JSON is requested:
- Return ONLY valid JSON.
- Do not include markdown code fences.
- Do not include explanations outside the JSON.
- Follow the schema exactly.
`;
