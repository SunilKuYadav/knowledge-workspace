import type { ZodSchema } from "zod";

/**
 * Safely parses a JSON string and validates it against a Zod schema.
 * Returns the validated data or null if parsing/validation fails.
 */
export function parseJsonSafe<T>(raw: string, schema: ZodSchema<T>): T | null {
  try {
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Serializes data to a formatted JSON string.
 */
export function serializeJson<T>(data: T): string {
  return JSON.stringify(data, null, 2);
}
