"use client";

import Link from "next/link";
import type { CategorizedItem } from "../lib/types";

interface ScheduleViewProps {
  categorizedItems: CategorizedItem[];
}

export function ScheduleView({ categorizedItems }: ScheduleViewProps) {
  const overdue = categorizedItems.filter((c) => c.category === "overdue");
  const dueToday = categorizedItems.filter((c) => c.category === "due-today");
  const upcoming = categorizedItems.filter((c) => c.category === "upcoming");

  return (
    <div className="space-y-8">
      <ScheduleGroup
        title="Overdue"
        items={overdue}
        emptyMessage="No overdue items"
        badgeColor="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
      />
      <ScheduleGroup
        title="Due Today"
        items={dueToday}
        emptyMessage="Nothing due today"
        badgeColor="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
      />
      <ScheduleGroup
        title="Upcoming"
        items={upcoming}
        emptyMessage="No upcoming reviews"
        badgeColor="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
      />
    </div>
  );
}

function ScheduleGroup({
  title,
  items,
  emptyMessage,
  badgeColor,
}: {
  title: string;
  items: CategorizedItem[];
  emptyMessage: string;
  badgeColor: string;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded ${badgeColor}`}
        >
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((ci) => {
            const href =
              ci.item.itemType === "topic"
                ? `/topics/${ci.item.itemId}`
                : `/problems/${ci.item.itemId}`;
            return (
              <li
                key={`${ci.item.itemType}-${ci.item.itemId}`}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center justify-between"
              >
                <div>
                  <Link
                    href={href}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {ci.item.itemId}
                  </Link>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {ci.item.itemType} · confidence {ci.item.confidence}/5
                  </p>
                </div>
                <span className="text-xs text-zinc-400">
                  {ci.item.nextReview.split("T")[0]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
