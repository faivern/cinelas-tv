import { Check, ChevronDown, Clock, Eye, Heart, ListPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useUser } from "../../../hooks/user/useUser";
import { useSignInModal } from "../../../context/SignInModalContext";
import { useMediaEntryByTmdbId } from "../../../hooks/mediaEntries/useMediaEntries";
import {
  useCreateMediaEntry,
  useUpdateMediaEntry,
} from "../../../hooks/mediaEntries/useMediaEntryMutations";
import type { WatchStatus } from "../../../types/mediaEntry";
import { isTvMode } from "../../../lib/tv/tvMode";

type Props = {
  mediaId: number;
  mediaType: string;
  variant?: "web" | "tv" | "tv-menu";
  className?: string;
};

const LABELS: Record<WatchStatus, string> = isTvMode()
  ? { WantToWatch: "Watch Later", Watching: "Watching", Favorites: "Favorites" }
  : { WantToWatch: "Want to Watch", Watching: "Watching", Favorites: "Favorites" };

const ORDER: WatchStatus[] = ["WantToWatch", "Watching", "Favorites"];
const ICONS: Record<WatchStatus, typeof Clock> = {
  WantToWatch: Clock,
  Watching: Eye,
  Favorites: Heart,
};

export default function StatusPicker({
  mediaId,
  mediaType,
  variant = "web",
  className,
}: Props) {
  const { data: user } = useUser();
  const { openSignInModal } = useSignInModal();
  const { data: entry, isLoading: entryLoading } = useMediaEntryByTmdbId(
    mediaId,
    mediaType,
  );
  const createEntry = useCreateMediaEntry();
  const updateEntry = useUpdateMediaEntry();

  const currentStatus = entry?.status ?? null;
  const busy = createEntry.isPending || updateEntry.isPending;

  const isTv = variant === "tv" || variant === "tv-menu";
  // TV hero collapses Watch Later + Favorites behind a single "Add to List"
  // toggle so the dropdown stays short; sub-options expand inline on demand.
  const isMenuList = variant === "tv-menu";
  // TV keeps the hero lean: two compact entries, no "Watching" for now.
  const order = isTv ? ORDER.filter((s) => s !== "Watching") : ORDER;

  const handleClick = async (status: WatchStatus) => {
    if (!user) {
      openSignInModal();
      return;
    }
    if (busy || entryLoading) return;
    if (status === currentStatus) {
      toast(`Already added as ${LABELS[status]}`);
      return;
    }

    try {
      if (entry) {
        await updateEntry.mutateAsync({
          id: entry.id,
          data: { status },
          silent: true,
        });
      } else {
        await createEntry.mutateAsync({
          tmdbId: mediaId,
          mediaType,
          status,
          silent: true,
        });
      }
      toast.success(`Added as ${LABELS[status]}`);
    } catch {
      // Mutation hooks handle their own error toasts.
    }
  };

  if (isMenuList) {
    return (
      <TvMenuListPicker
        order={order}
        currentStatus={currentStatus}
        busy={busy || entryLoading}
        onSelect={handleClick}
        className={className}
      />
    );
  }

  const containerClass = isTv ? "flex gap-3" : "grid grid-cols-3 gap-2";

  return (
    <div className={`${containerClass} ${className ?? ""}`}>
      {order.map((status) => {
        const Icon = ICONS[status];
        const active = currentStatus === status;
        const baseClass = isTv
          ? "flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-medium shadow-lg backdrop-blur-sm transition-transform focus-visible:scale-105"
          : "flex items-center justify-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl py-2 md:py-3 px-2 md:px-3 text-xs md:text-sm font-medium shadow-md border border-slate-600/50 transition-all duration-200 hover:scale-105 hover:cursor-pointer";
        const activeClass = isTv
          ? "bg-white text-black"
          : "bg-accent-primary text-white border-accent-primary";
        const idleClass = isTv
          ? "bg-white/15 text-white focus-visible:bg-white/25"
          : "bg-action-primary text-white hover:bg-action-hover";

        return (
          <button
            key={status}
            type="button"
            onClick={() => handleClick(status)}
            // Never `disabled`: a disabled element can't hold focus, so the
            // D-pad focus would drop to <body> mid-mutation and get yanked
            // back to the hero's autofocus target. Guarded in handleClick.
            aria-disabled={busy || entryLoading}
            aria-pressed={active}
            className={`${baseClass} ${active ? activeClass : idleClass} ${
              busy || entryLoading ? "opacity-70 cursor-wait" : ""
            }`}
          >
            {active ? (
              <Check className={isTv ? "size-4" : "size-3.5 md:size-4"} strokeWidth={3} />
            ) : (
              <Icon className={isTv ? "size-4" : "size-3.5 md:size-4"} />
            )}
            <span>{active ? `Added — ${LABELS[status]}` : LABELS[status]}</span>
          </button>
        );
      })}
    </div>
  );
}

function TvMenuListPicker({
  order,
  currentStatus,
  busy,
  onSelect,
  className,
}: {
  order: WatchStatus[];
  currentStatus: WatchStatus | null;
  busy: boolean;
  onSelect: (status: WatchStatus) => Promise<void> | void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstSubRef = useRef<HTMLButtonElement>(null);
  const prevExpanded = useRef(false);

  useEffect(() => {
    if (expanded && !prevExpanded.current) {
      firstSubRef.current?.focus();
    } else if (!expanded && prevExpanded.current) {
      toggleRef.current?.focus();
    }
    prevExpanded.current = expanded;
  }, [expanded]);

  const currentLabel = currentStatus ? LABELS[currentStatus] : null;

  const handleSelect = async (status: WatchStatus) => {
    await onSelect(status);
    setExpanded(false);
  };

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-disabled={busy}
        className="focus-fill flex w-full shrink-0 items-center justify-between rounded-lg bg-white/10 px-4 py-2
          text-sm font-medium text-white shadow-lg transition-colors
          focus-visible:bg-white focus-visible:text-black"
      >
        <span className="flex items-center gap-3">
          {currentStatus ? (
            <Check className="size-4" strokeWidth={3} />
          ) : (
            <ListPlus className="size-4" />
          )}
          {currentLabel ? `In List — ${currentLabel}` : "Add to List"}
        </span>
        <ChevronDown
          className={`size-4 opacity-60 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded &&
        order.map((status, i) => {
          const Icon = ICONS[status];
          const active = currentStatus === status;
          return (
            <button
              key={status}
              ref={i === 0 ? firstSubRef : undefined}
              type="button"
              onClick={() => handleSelect(status)}
              aria-pressed={active}
              aria-disabled={busy}
              className={`focus-fill ml-6 flex shrink-0 items-center gap-3 rounded-lg px-4 py-2 text-sm
                font-medium shadow-md transition-colors focus-visible:bg-white focus-visible:text-black ${
                  active ? "bg-white/25 text-white" : "bg-white/5 text-white/90"
                } ${busy ? "opacity-70 cursor-wait" : ""}`}
            >
              {active ? (
                <Check className="size-4" strokeWidth={3} />
              ) : (
                <Icon className="size-4" />
              )}
              <span>{active ? `Added — ${LABELS[status]}` : LABELS[status]}</span>
            </button>
          );
        })}
    </div>
  );
}
