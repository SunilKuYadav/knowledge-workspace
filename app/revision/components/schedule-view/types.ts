import type { CategorizedItem } from "../../lib/types";

export interface ScheduleViewProps {
  categorizedItems: CategorizedItem[];
}

export interface ScheduleGroupProps {
  title: string;
  items: CategorizedItem[];
  emptyMessage: string;
  badgeColor: string;
}
