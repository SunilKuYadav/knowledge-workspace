"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markTopicInProgressAction } from "@/app/self-test/actions/status-actions";

interface MarkInProgressButtonProps {
  topicId: string;
  status: string;
}

/**
 * Button to mark a topic as "in-progress".
 * Only visible when the topic status is "not-started".
 * Disables during the request to prevent duplicate submissions.
 * Shows an error message on failure.
 */
export default function MarkInProgressButton({
  topicId,
  status,
}: MarkInProgressButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hide button when status is not "not-started" (req 1.2)
  if (status !== "not-started") {
    return null;
  }

  async function handleClick() {
    setLoading(true);
    setError(null);

    const result = await markTopicInProgressAction(topicId);

    if (result.success) {
      // Refresh the page to reflect the updated status badge (req 1.3)
      router.refresh();
    } else {
      // Re-enable button and show error (req 1.4)
      setError(result.error ?? "Could not update topic status");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Updating..." : "▶ Mark In-Progress"}
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}
