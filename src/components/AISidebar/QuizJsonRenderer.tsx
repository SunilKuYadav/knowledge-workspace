'use client';

/**
 * Renders JSON output (quiz, flashcards, similar) in a readable format.
 * Falls back to formatted code block if parsing fails.
 */
export function QuizJsonRenderer({ output }: { output: string }) {
  try {
    const parsed = JSON.parse(output);

    // Quiz questions format: { questions: [...] }
    if (parsed.questions && Array.isArray(parsed.questions)) {
      return (
        <div className="space-y-4">
          {parsed.questions.map((q: { question: string; options: string[]; correctIndex: number; explanation: string }, i: number) => (
            <div key={i} className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {i + 1}. {q.question}
              </p>
              <ul className="space-y-0.5 pl-4">
                {q.options.map((opt: string, j: number) => (
                  <li
                    key={j}
                    className={`text-xs ${j === q.correctIndex ? 'text-green-700 dark:text-green-400 font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}
                  >
                    {String.fromCharCode(65 + j)}. {opt}
                    {j === q.correctIndex && ' ✓'}
                  </li>
                ))}
              </ul>
              {q.explanation && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 italic pl-4">
                  {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Flashcards format: { cards: [...] }
    if (parsed.cards && Array.isArray(parsed.cards)) {
      return (
        <div className="space-y-3">
          {parsed.cards.map((card: { front: string; back: string }, i: number) => (
            <div key={i} className="rounded border border-zinc-200 dark:border-zinc-700 p-2.5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">Q</p>
              <p className="text-sm text-zinc-900 dark:text-zinc-100 mb-2">{card.front}</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">A</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{card.back}</p>
            </div>
          ))}
        </div>
      );
    }

    // Similar problems format: { suggestions: [...] }
    if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      return (
        <div className="space-y-2">
          {parsed.suggestions.map((s: { title: string; url?: string; reason?: string }, i: number) => (
            <div key={i} className="text-sm">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{s.title}</p>
              {s.reason && <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.reason}</p>}
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  {s.url}
                </a>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Fallback: formatted JSON
    return (
      <pre className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words font-mono">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  } catch {
    // Not valid JSON, show as raw text
    return (
      <pre className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words font-mono">
        {output}
      </pre>
    );
  }
}
