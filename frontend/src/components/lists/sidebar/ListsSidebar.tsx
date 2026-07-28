import type { List } from "../../../types/list";
import type { WatchStatus } from "../../../types/mediaEntry";
import type { ActiveView } from "../../../types/lists.view";
import WatchStatusTabs from "./WatchStatusTabs";
import ListNavItem from "./ListNavItem";
import { Plus } from "lucide-react";

type ListsSidebarProps = {
  lists: List[];
  activeView: ActiveView;
  selectedStatus: WatchStatus;
  selectedListId: number | null;
  statusCounts: {
    WantToWatch: number;
    Watching: number;
    Favorites: number;
  };
  onStatusChange: (status: WatchStatus) => void; // Also switches to status view
  onListSelect: (listId: number) => void; // Also switches to list view
  onCreateList: () => void;
  onEditList: (list: List) => void;
  onDeleteList: (list: List) => void;
  isLoading?: boolean;
};

export default function ListsSidebar({
  lists,
  activeView,
  selectedStatus,
  selectedListId,
  statusCounts,
  onStatusChange,
  onListSelect,
  onCreateList,
  onEditList,
  onDeleteList,
  isLoading,
}: ListsSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Watch Status Section */}
      <div className="px-4 py-4 border-b border-[var(--border)]/50">
        <button
          onClick={() => onStatusChange(selectedStatus)}
          className={`text-sm font-semibold mb-3 text-left w-full transition-colors ${
            activeView === "status"
              ? "text-[var(--text-h1)]"
              : "text-[var(--subtle)] hover:text-[var(--text-h1)]"
          }`}
        >
          My Tracking
        </button>
        <WatchStatusTabs
          selectedStatus={selectedStatus}
          onStatusChange={onStatusChange}
          counts={statusCounts}
          isActive={activeView === "status"}
        />
      </div>

      {/* Custom Lists Section */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-sm font-semibold text-left transition-colors ${
              activeView === "list"
                ? "text-[var(--text-h1)]"
                : "text-[var(--subtle)]"
            }`}
          >
            My Lists
          </span>
          <button
            onClick={onCreateList}
            className="p-2.5 text-[var(--subtle)] hover:text-accent-primary hover:bg-[var(--action-hover)] rounded-lg transition-colors"
            aria-label="Create new list"
          >
            <Plus className="size-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 bg-[var(--action-primary)] rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <p className="text-sm text-[var(--subtle)] text-center py-4">
            No lists yet. Create one!
          </p>
        ) : (
          <div className="space-y-1">
            {lists.map((list) => (
              <ListNavItem
                key={list.id}
                list={list}
                isSelected={activeView === "list" && selectedListId === list.id}
                onSelect={() => onListSelect(list.id)}
                onEdit={() => onEditList(list)}
                onDelete={() => onDeleteList(list)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
