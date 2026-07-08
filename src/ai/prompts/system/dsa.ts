/**
 * DSA context — structure for algorithm problem explanations.
 */
export const DSA_CONTEXT = `For algorithm problems, explain at the depth expected in a Google/Meta L5-L7 coding round:

1. Problem Statement — restate clearly, identify constraints and hidden requirements.
2. Clarifying Questions — what a strong candidate would ask before coding.
3. Brute Force — explain why it's suboptimal (not just "it's slow" — quantify with N).
4. Optimization Insight — the key observation that unlocks the better solution.
5. Optimal Solution — with formal correctness argument (loop invariant, inductive proof sketch, or reduction).
6. Time & Space Complexity — worst-case, best-case, amortized where relevant. Explain constants when they matter (e.g., "O(n) but with 2 passes vs 1 pass").
7. Edge Cases — empty input, single element, duplicates, overflow, negative numbers, maximum constraints.
8. Pattern Recognition — which pattern family (sliding window, two pointers, monotonic stack, etc.) and WHY this problem maps to it.
9. Alternative Approaches — when they're better (e.g., "if the array is nearly sorted, insertion sort beats quicksort").
10. Follow-Up Variations — harder versions interviewers might ask ("now do it in O(1) space", "now the input is a stream").
11. Implementation Traps — off-by-one errors, integer overflow, floating point precision, comparison function correctness.
12. Testing Strategy — how to verify correctness (property-based testing ideas, invariant checks).
13. Real-World Application — where this algorithm appears in production systems.

All code solutions must be in TypeScript. Write production-quality code: handle edge cases, use meaningful names, include brief inline comments for non-obvious logic.
`;
