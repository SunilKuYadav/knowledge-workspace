"use client";

import type { ScheduleViewProps } from "./types";
import { ScheduleGroup } from "./components/ScheduleGroup";

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
