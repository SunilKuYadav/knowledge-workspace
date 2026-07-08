"use client";

import Link from "next/link";
import type { CodingInterviewButtonProps } from "./types";

/**
 * Reusable button/link component that navigates to the coding interview page
 * with the appropriate context parameters.
 */
export default function CodingInterviewButton({
  source,
  id,
  title,
  category,
  tags,
  concepts,
  difficulty,
  variant = "button",
}: CodingInterviewButtonProps) {
  const params = new URLSearchParams();
  params.set("source", source);

  if (id) params.set("id", id);
  if (title) params.set("title", title);
  if (category) params.set("category", category);
  if (tags?.length) params.set("tags", tags.join(","));
  if (concepts?.length) params.set("concepts", concepts.join(","));
  if (difficulty) params.set("difficulty", difficulty);

  const href = `/coding-interview?${params.toString()}`;

  if (variant === "card") {
    return (
      <Link
        href={href}
        className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all block"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            💻
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Coding Interview
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Practice with AI-generated problems
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
    >
      💻 Coding Interview
    </Link>
  );
}
