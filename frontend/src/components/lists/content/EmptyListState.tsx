import { Film, List, Plus, Tv } from "lucide-react";
type EmptyListStateProps = {
  type: "status" | "list";
  title?: string;
  onAddMedia?: () => void;
};

export default function EmptyListState({
  type,
  title,
  onAddMedia,
}: EmptyListStateProps) {
  const isStatusView = type === "status";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-[var(--action-primary)] flex items-center justify-center mb-6">
        {isStatusView ? (
          <div className="flex gap-2 text-[var(--subtle)]">
            <Film className="size-6" />
            <Tv className="size-6" />
          </div>
        ) : (
          <List className="size-[30px] text-[var(--subtle)]" />
        )}
      </div>

      <h3 className="text-xl font-semibold text-[var(--text-h1)] mb-2">
        {isStatusView
          ? `No ${title?.toLowerCase() || "media"} yet`
          : `${title || "This list"} is empty`}
      </h3>

      <p className="text-[var(--subtle)] text-sm max-w-sm mb-6">
        {isStatusView
          ? "Start tracking movies and TV shows by adding them to your watchlist."
          : "Add movies and TV shows to this list to organize your collection."}
      </p>

      {onAddMedia && (
        <button
          onClick={onAddMedia}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-accent-primary/80 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="size-3.5" />
          Add Media
        </button>
      )}
    </div>
  );
}
