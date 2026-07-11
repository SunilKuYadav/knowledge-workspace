"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { InterviewModule } from "./index";
import type {
  InterviewModuleProps,
  InterviewContext,
  InterviewSource,
  VariationSummary,
} from "./lib/types";

function InterviewPageContent() {
  const searchParams = useSearchParams();

  const source = (searchParams.get("source") || "practice") as InterviewSource;
  const language = (searchParams.get("language") || "typescript") as
    "javascript" | "typescript";
  const difficulty = searchParams.get("difficulty") as
    "easy" | "medium" | "hard" | null;
  const duration = searchParams.get("duration")
    ? parseInt(searchParams.get("duration")!, 10)
    : undefined;

  // Build context from search params
  let context: InterviewContext | undefined;

  if (source === "problem") {
    const id = searchParams.get("id");
    const title = searchParams.get("title");
    const category = searchParams.get("category") || "";
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
    const problemStatus = searchParams.get("problemStatus") as
      "not-started" | "attempted" | "solved" | null;

    // Parse variations from JSON-encoded param
    let variations: VariationSummary[] | undefined;
    const variationsParam = searchParams.get("variations");
    if (variationsParam) {
      try {
        variations = JSON.parse(variationsParam) as VariationSummary[];
      } catch {
        // Ignore malformed variations param
      }
    }

    if (id && title) {
      context = {
        source: "problem",
        id,
        title,
        category,
        tags,
        ...(problemStatus && { problemStatus }),
        ...(variations?.length && { variations }),
      };
    }
  } else if (source === "topic") {
    const id = searchParams.get("id");
    const title = searchParams.get("title");
    const concepts =
      searchParams.get("concepts")?.split(",").filter(Boolean) || [];

    // Parse avoidProblems — practice problem titles to exclude
    let avoidProblems: string[] | undefined;
    const avoidParam = searchParams.get("avoidProblems");
    if (avoidParam) {
      try {
        avoidProblems = JSON.parse(avoidParam) as string[];
      } catch {
        // Ignore malformed param
      }
    }

    if (id && title) {
      context = {
        source: "topic",
        id,
        title,
        concepts,
        ...(avoidProblems?.length && { avoidProblems }),
      };
    }
  } else if (source === "revision") {
    const sessionId = searchParams.get("sessionId") || "";
    const topicIds =
      searchParams.get("topicIds")?.split(",").filter(Boolean) || [];
    if (sessionId) {
      context = { source: "revision", sessionId, topicIds };
    }
  }

  const props: InterviewModuleProps = {
    source,
    language,
    ...(context && { context }),
    ...(difficulty && { difficulty }),
    ...(duration && { duration }),
  };

  return <InterviewModule {...props} />;
}

export default function CodingInterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="mt-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Loading interview...
            </p>
          </div>
        </div>
      }
    >
      <InterviewPageContent />
    </Suspense>
  );
}
