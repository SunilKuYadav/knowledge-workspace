/**
 * JSON schema instruction for topic parsing output.
 */
export const TOPIC_PARSE_SCHEMA = `Return ONLY valid JSON (no markdown, no explanation) with these fields:
- title (string, required): The topic name
- category (string, one of: dsa, system-design, database, networking, os, oop)
- difficulty (string, one of: easy, medium, hard)
- tags (array of strings): relevant tags

If a field cannot be determined, omit it from the response.
Return ONLY the JSON object, nothing else.`;
