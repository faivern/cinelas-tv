/**
 * Full-screen "Can't reach the Cinelas server" overlay for mid-session
 * outages, visually matching public/error.html (which only covers the
 * initial-load failure — Capacitor errorPath never fires for XHR failures).
 *
 * role="dialog" + aria-modal scopes spatial navigation inside, so the D-pad
 * can't reach the stale page behind. Escape (hardware BACK arrives as a
 * synthesized Escape, see lib/tv/backButton.ts) is swallowed so BACK doesn't
 * exit the app mid-outage. On recovery every active query is refetched so the
 * rows repopulate without a reload.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { probeNow, useServerDown } from "../../lib/connection/serverStatus";

export default function ServerDownOverlay() {
  const down = useServerDown();
  const wasDown = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (wasDown.current && !down) {
      void queryClient.refetchQueries({ type: "active" });
    }
    wasDown.current = down;
  }, [down, queryClient]);

  useEffect(() => {
    if (!down) return;
    // Pull focus off the page so spatial nav's auto-focus lands on the
    // overlay's retry button instead of staying behind it.
    (document.activeElement as HTMLElement | null)?.blur?.();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [down]);

  if (!down) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Server unreachable"
      className="fixed inset-0 z-[9995] flex flex-col items-center justify-center bg-background px-8 text-center select-none"
    >
      <div
        aria-hidden
        className="text-[9rem] font-extrabold leading-none tracking-tighter text-accent-primary/10"
      >
        · · ·
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-h1">
        Can&apos;t reach the Cinelas server
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-subtle">
        The server looks offline. Make sure it&apos;s powered on and connected
        — we&apos;ll keep trying in the background.
      </p>
      <button
        type="button"
        data-tv-autofocus=""
        onClick={() => void probeNow()}
        className="focus-ring-target mt-8 rounded-lg border border-accent-primary/20 bg-accent-primary/10 px-7 py-3 text-base font-medium text-accent-primary"
      >
        Try again
      </button>
      <div className="mt-5 text-xs text-subtle opacity-70">
        Retrying automatically…
      </div>
    </div>
  );
}
