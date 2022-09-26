/**
 * JSON schema instruction for problem parsing output.
 */
export const PROBLEM_PARSE_SCHEMA = `Return ONLY valid JSON (no markdown, no explanation) with these fields:
- title (string, required): The problem name
- platform (string, one of: leetcode, codeforces, gfg)
- difficulty (string, one of: easy, medium, hard)
- companies (array of strings): companies that ask this problem
- patterns (array of strings): algorithmic patterns used
- url (string): problem URL if mentioned

If a field cannot be determined, omit it from the response.
Return ONLY the JSON object, nothing else.`;
