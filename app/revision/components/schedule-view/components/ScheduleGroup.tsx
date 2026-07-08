"use client";

import Link from "next/link";
import type { ScheduleGroupProps } from "../types";

export function ScheduleGroup({
  title,
  items,
  emptyMessage,
  badgeColor,
}: ScheduleGroupProps) {
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
