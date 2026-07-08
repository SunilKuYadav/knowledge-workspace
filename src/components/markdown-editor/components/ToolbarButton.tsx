import type { ToolbarButtonProps } from "../types";

export function ToolbarButton({
  label,
  onClick,
  className = "",
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors ${className}`}
    >
      {label}
    </button>
  );
}
