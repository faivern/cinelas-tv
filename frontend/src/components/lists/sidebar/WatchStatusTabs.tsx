import { Tab } from "@headlessui/react";
import type { WatchStatus } from "../../../types/mediaEntry";
import { Clock, Eye, Heart } from "lucide-react";
type WatchStatusTabsProps = {
  selectedStatus: WatchStatus;
  onStatusChange: (status: WatchStatus) => void;
  counts: {
    WantToWatch: number;
    Watching: number;
    Favorites: number;
  };
  isActive?: boolean; // Whether status view is currently active (vs custom list view)
};

const TABS: { status: WatchStatus; label: string; icon: React.ReactNode }[] = [
  { status: "WantToWatch", label: "Want to Watch", icon: <Clock /> },
  { status: "Watching", label: "Watching", icon: <Eye /> },
  { status: "Favorites", label: "Favorites", icon: <Heart /> },
];

export default function WatchStatusTabs({
  selectedStatus,
  onStatusChange,
  counts: _counts,
  isActive = true,
}: WatchStatusTabsProps) {
  // Only show selection when status view is active; -1 means no selection
  const selectedIndex = isActive
    ? TABS.findIndex((t) => t.status === selectedStatus)
    : -1;

  return (
    <Tab.Group
      selectedIndex={selectedIndex}
      onChange={(index) => onStatusChange(TABS[index].status)}
    >
      <Tab.List className="flex flex-col gap-1">
        {TABS.map((tab) => (
          <Tab
            key={tab.status}
            className={({ selected }) =>
              `flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors    ${
                selected && isActive
                  ? "bg-accent-primary/20 text-accent-primary"
                  : "text-[var(--subtle)] hover:bg-[var(--action-hover)] hover:text-[var(--text-h1)]"
              }`
            }
          >
            <span className="flex items-center gap-2">
              <span className="text-xs">{tab.icon}</span>
              {tab.label}
            </span>
          </Tab>
        ))}
      </Tab.List>
    </Tab.Group>
  );
}
