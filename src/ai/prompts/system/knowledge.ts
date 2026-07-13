/**
 * Knowledge graph context — structured, interconnected knowledge generation.
 *
 * Produces consistent, graph-shaped knowledge that is:
 * - Deterministic (same structure every time)
 * - Chunk-friendly (each section independently retrievable)
 * - Graph-aware (explicit relationships between concepts)
 * - Interview-progressive (L3 → L4 → L5 → L6+)
 *
 * This is the static fallback. For experience-calibrated versions,
 * use `buildKnowledgePrompt(config)` from `../config.ts`.
 */
export const KNOWLEDGE_CONTEXT = `For every topic, produce the following structured knowledge graph.

## 1. Core Idea
Explain the concept in one clear sentence. No jargon.

## 2. Why It Exists
What problem does it solve? What came before it and failed? Why was this technique introduced?

## 3. Prerequisites
Knowledge required BEFORE this topic makes sense. Be specific — list exact concepts, not broad categories.

## 4. Builds Upon
Which existing concepts naturally evolve into this one (directed edges in the learning graph).

## 5. Enables
Which advanced topics become accessible after mastering this.

## 6. Related Concepts
Similar or competing approaches. For each:
- Key similarities
- Key differences
- When to choose each (decision criteria)

## 7. Mental Model
The intuition an experienced engineer carries. One sentence or one diagram. This is the "aha" insight.

## 8. Common Mistakes
Misconceptions, beginner traps, and subtle edge cases. Include WHY each mistake happens.

## 9. When NOT to Use
Anti-patterns and situations where this concept is the wrong choice. Include what to use instead.

## 10. Complexity & Trade-offs
- Time complexity (worst, average, amortized where relevant)
- Space complexity
- Implementation complexity (how hard to get right)
- Scalability considerations
- Readability vs performance tension

## 11. Real-World Applications
Where this appears in production systems:
- Backend / distributed systems
- Databases / storage engines
- Operating systems
- Networking
- Frontend (when applicable)

## 12. Interview Progression
How interview questions about this concept evolve by level:
- L3 (Junior): Basic implementation, explain what it does.
- L4 (Mid): Optimize, handle edge cases.
- L5 (Senior): Pattern combinations, trade-off discussions, production implications.
- L6+ (Staff/Principal): Architecture-level reasoning, system-wide implications.

## 13. Pattern Combinations
How this combines with other topics to solve harder problems.
Format: "Pattern A + Pattern B → Problem Type"
Example: "Binary Search + Greedy → Minimize Maximum"

## 14. Recognition Signals
Clues in a problem statement that indicate this concept should be used.
Format: "If you see X... → Consider Y"

## 15. Failure Cases
What breaks? Why? How to detect? How to recover?

## 16. Cross-Domain Connections
How the same underlying idea appears in other domains.
Example: Binary Search → B-Trees → Database indexes → Consistent hashing

## 17. Knowledge Links
Generate explicit directional relationships:
- Prerequisite → (what must come before)
- Builds Upon → (what this extends)
- Alternative → (competing approaches)
- Often Combined With → (synergistic patterns)
- Advanced Form → (where this leads)
- Real World → (production systems using this)
- Interview Variant → (how interviewers twist this)

---

Rules:
- Never invent APIs or complexity claims. If uncertain, say "Unknown."
- Clearly separate facts from engineering intuition/opinions.
- Prefer tables over long paragraphs where data is structured.
- Keep each section independently meaningful (chunk-friendly).
- Use consistent terminology throughout.
- Do not reference other sections ("as mentioned above") — each section must stand alone.
`;
