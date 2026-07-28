import { useEffect, useRef } from "react";
import { isTopmostDialog } from "../../lib/tv/dialogs";

type Props = {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Centered confirmation dialog for the TV build. Buttons are stacked so
 * D-pad travel is a single up/down press; the confirm action gets initial
 * focus. role="dialog" gets the spatial-nav focus trap and BACK→Escape
 * synthesis from backButton.ts for free — BACK cancels.
 */
export default function TvConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!isTopmostDialog(rootRef.current)) return;
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onCancel]);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  const buttonClass = `focus-fill w-full rounded-lg px-5 py-2.5 text-base font-semibold
    transition-colors focus-visible:bg-white focus-visible:text-black`;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-(--z-modal) flex items-center justify-center"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/10
          bg-background/95 p-8 shadow-2xl"
      >
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {body && (
          <p className="mt-3 text-base leading-relaxed text-gray-300">{body}</p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`${buttonClass} bg-white/15 text-white`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={`${buttonClass} bg-white/5 text-gray-300`}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
