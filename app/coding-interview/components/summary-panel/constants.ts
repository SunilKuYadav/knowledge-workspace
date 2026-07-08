export function getPriorityBadge(priority: "high" | "medium" | "low") {
  switch (priority) {
    case "high":
      return {
        label: "High",
        className:
          "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      };
    case "medium":
      return {
        label: "Medium",
        className:
          "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
      };
    case "low":
      return {
        label: "Low",
        className:
          "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      };
  }
}
