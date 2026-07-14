/**
 * Artifact prompt: cheatsheet.md
 *
 * One-page last-minute revision cheat sheet. Dense, no fluff.
 */
export const CHEATSHEET_ARTIFACT_PROMPT = `Generate a one-page revision cheat sheet for this topic.

This is for last-minute interview revision. Every word must earn its place.

Structure:

# Quick reference
The single most important thing to remember about this topic in 1–2 sentences.

# Complexity table
| Operation | Time | Space |
All relevant operations in one table.

# Key properties / invariants
Bullet list — 5–8 essential truths about this topic.

# Recognition signals
How to instantly recognize when to use this in an interview problem.
Format: "If you see X → think Y"

# Templates
The most commonly needed pseudocode snippet(s), minimal and comment-free.

# Common pitfalls
5–7 one-line reminders of the most common mistakes.

# Mnemonics
Any memory aids, acronyms, or rules of thumb that help recall under pressure.

# Interview tips
3–5 tactical tips for performing well on this topic in a live interview.

Rules:
- NO lengthy explanations — this is a reference sheet, not a tutorial.
- Optimize for scanning, not reading.
- Use tables and bullet points exclusively.
- If something needs more than one line to explain, it belongs in notes.md instead.`;
