import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import type { WatchProviderRegion } from "../../types/tmdb";

type Props = {
  regions: WatchProviderRegion[];
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
};

/**
 * Full-screen region picker for the TV build. A multi-column grid keeps
 * D-pad travel short compared to a single scrolling list of ~250 regions.
 * role="dialog" gets the spatial-nav focus trap and BACK→Escape synthesis
 * from backButton.ts for free.
 */
export default function TvRegionPicker({
  regions,
  selected,
  onSelect,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  // Land focus on the current region so a quick confirm is one press away.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const target =
      panel.querySelector<HTMLElement>('[aria-checked="true"]') ??
      panel.querySelector<HTMLElement>("button");
    target?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select region"
      className="fixed inset-0 z-(--z-modal) flex flex-col bg-background/95 backdrop-blur-sm"
    >
      <h1 className="shrink-0 px-[calc(var(--tv-safe-x)+1rem)] pb-4 pt-10 text-3xl font-light text-white">
        Select region
      </h1>
      <div
        ref={panelRef}
        role="radiogroup"
        aria-label="Region"
        className="grid flex-1 grid-cols-4 content-start gap-1 overflow-y-auto
          px-[calc(var(--tv-safe-x)+1rem)] pb-10 xl:grid-cols-5"
      >
        {regions.map((r) => {
          const isActive = r.iso_3166_1 === selected;
          return (
            <button
              key={r.iso_3166_1}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(r.iso_3166_1)}
              className={`focus-fill flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm
                transition-colors hover:bg-white hover:text-neutral-900
                focus-visible:bg-white focus-visible:text-neutral-900
                ${isActive ? "text-text-h1 font-semibold" : "text-subtle"}`}
            >
              <span
                aria-hidden="true"
                className={`fi fi-${r.iso_3166_1.toLowerCase()} shrink-0`}
              />
              <span className="flex-1 truncate">{r.english_name}</span>
              {isActive && <Check className="size-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
