/**
 * Knowledge graph context — connect topics into a learning graph.
 */
export const KNOWLEDGE_CONTEXT = `Build a connected knowledge graph that mirrors how senior engineers think about problems.

For every topic, map:
- Prerequisites — what you MUST know before this makes sense.
- Builds Upon — concepts this directly extends or specializes.
- Related Patterns — other techniques that solve similar problems (and when to prefer each).
- Advanced Extensions — where this leads at Staff+ level.
- Cross-Domain Connections — how this appears in system design, distributed systems, or other areas.
- Interview Clusters — problems that test this alongside related concepts (interviewers often combine topics).

Example:
Binary Search
  Prerequisites → Sorted arrays, comparison functions, loop invariants.
  Builds Upon → Divide and conquer, monotonic functions.
  Related → Two pointers (when to use each), ternary search (unimodal functions).
  Advanced → Binary search on answer, fractional cascading, persistent data structures.
  Cross-Domain → Database B-trees use binary search internally; binary search in distributed systems (consistent hashing).
  Interview Clusters → "Binary search + greedy" (minimize maximum), "Binary search + sliding window" (find optimal window size).

The goal is to help the user see patterns across problems, not memorize solutions individually. A senior engineer recognizes that 50 "different" problems are 5 patterns with variations.
`;
