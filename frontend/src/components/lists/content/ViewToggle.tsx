import type { ViewMode } from "../../../types/lists.view";
import { LayoutGrid, List } from "lucide-react";

type ViewToggleProps = {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
};

export default function ViewToggle({
  viewMode,
  onChange,
  className = "",
}: ViewToggleProps) {
  return (
    <div
      className={`inline-flex rounded-lg bg-[var(--action-primary)] p-1 ${className}`}
      role="radiogroup"
      aria-label="View mode"
    >
      <button
        type="button"
        role="radio"
        aria-checked={viewMode === "list"}
        onClick={() => onChange("list")}
        className={`p-3 rounded-md transition-colors ${
          viewMode === "list"
            ? "bg-[var(--action-hover)] text-[var(--text-h1)]"
            : "text-[var(--subtle)] hover:text-[var(--text-h1)]"
        }`}
        aria-label="List view"
      >
        <List className="size-3.5" />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={viewMode === "grid"}
        onClick={() => onChange("grid")}
        className={`p-3 rounded-md transition-colors ${
          viewMode === "grid"
            ? "bg-[var(--action-hover)] text-[var(--text-h1)]"
            : "text-[var(--subtle)] hover:text-[var(--text-h1)]"
        }`}
        aria-label="Grid view"
      >
        <LayoutGrid className="size-3.5" />
      </button>
    </div>
  );
}
