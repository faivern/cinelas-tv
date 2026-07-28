import { useEffect, useRef, type ReactNode } from "react";
import { isTopmostDialog } from "../../../../lib/tv/dialogs";

type Props = {
  label: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Bottom-sheet for a detail-page section (episodes, providers, credits…).
 * The hero backdrop stays visible above the sheet as a still frame.
 * role="dialog" gets the spatial-nav focus trap and BACK→Escape synthesis
 * from backButton.ts for free.
 */
export default function TvSectionOverlay({ label, onClose, children }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // A dialog stacked on top (region picker, confirm dialog) owns this
      // Escape — closing the sheet underneath it would dump the user out.
      if (!isTopmostDialog(rootRef.current)) return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  // Pull focus off the menu button that opened the sheet. Section content can
  // arrive async (skeletons carry no focusables), so retry on DOM changes
  // until something focusable renders.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusFirst = () => {
      if (panel.contains(document.activeElement)) return true;
      const first = panel.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!first) return false;
      first.focus();
      return true;
    };
    if (focusFirst()) return;
    const observer = new MutationObserver(() => {
      if (focusFirst()) observer.disconnect();
    });
    observer.observe(panel, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-end"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-black/60" />
      <div
        ref={panelRef}
        className="relative max-h-[80dvh] w-full overflow-y-auto rounded-t-2xl
          border-t border-white/10 bg-background/95 px-[calc(var(--tv-safe-x)+1rem)] pb-10 pt-4"
      >
        {children}
      </div>
    </div>
  );
}
