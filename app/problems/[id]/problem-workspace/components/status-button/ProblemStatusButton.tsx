"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { updateProblemStatus } from "@/app/problems/[id]/actions";

type ProblemStatus = "not-started" | "attempted" | "solved";

interface ProblemStatusButtonProps {
  problemId: string;
  currentStatus: ProblemStatus;
  onStatusChanged: (status: ProblemStatus) => void;
}

const STATUS_OPTIONS: { value: ProblemStatus; label: string; icon: string; color: string }[] = [
  {
    value: "not-started",
    label: "Not Started",
    icon: "○",
    color: "text-zinc-500 dark:text-zinc-400",
  },
  {
    value: "attempted",
    label: "Attempted",
    icon: "◐",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    value: "solved",
    label: "Solved",
    icon: "●",
    color: "text-green-600 dark:text-green-400",
  },
];

export default function ProblemStatusButton({
  problemId,
  currentStatus,
  onStatusChanged,
}: ProblemStatusButtonProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ProblemStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentOption = STATUS_OPTIONS.find((o) => o.value === status)!;

  const handleSelect = (newStatus: ProblemStatus) => {
    if (newStatus === status) {
      setOpen(false);
      return;
    }
    setOpen(false);
    startTransition(async () => {
      const result = await updateProblemStatus(problemId, newStatus);
      if (result.success) {
        setStatus(newStatus);
        onStatusChanged(newStatus);
      }
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 ${currentOption.color}`}
        title="Update problem status"
      >
        <span>{currentOption.icon}</span>
        <span>{isPending ? "Updating..." : currentOption.label}</span>
        <svg
          className="w-3 h-3 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-20 w-40 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${
                option.value === status
                  ? "bg-zinc-100 dark:bg-zinc-800 font-medium"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
              } ${option.color}`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
              {option.value === status && (
                <svg
                  className="w-3.5 h-3.5 ml-auto"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
