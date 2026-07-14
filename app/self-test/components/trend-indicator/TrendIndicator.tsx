"use client";

import type { TrendIndicator as TrendIndicatorType } from "../../lib/types";

interface TrendIndicatorProps {
  trend: TrendIndicatorType;
}

const TREND_CONFIG: Record<
  TrendIndicatorType,
  { label: string; arrow: string; classes: string }
> = {
  improving: {
    label: "Improving",
    arrow: "↑",
    classes:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  stable: {
    label: "Stable",
    arrow: "→",
    classes:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  declining: {
    label: "Declining",
    arrow: "↓",
    classes:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function TrendIndicator({ trend }: TrendIndicatorProps) {
  const config = TREND_CONFIG[trend];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.classes}`}
    >
      <span aria-hidden="true">{config.arrow}</span>
      {config.label}
    </span>
  );
}
