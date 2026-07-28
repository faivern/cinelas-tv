import { useEffect, useRef } from "react";
import type { MediaType } from "../../../../types/tmdb";
import { useVideo } from "../../../../hooks/useVideo";
import { autoplayTrailerUrl } from "../../../../utils/trailerEmbed";
import { keepScreenAwake, allowScreenSleep } from "../../../../lib/tv/keepAwake";

type Props = {
  mediaType: MediaType;
  id: number;
  title: string;
  onClose: () => void;
};

/**
 * Fullscreen trailer for the TV build. role="dialog" gets it the spatial-nav
 * focus trap and BACK→Escape synthesis from backButton.ts for free.
 */
export default function TvTrailerOverlay({ mediaType, id, title, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { videoUrl, loading } = useVideo(mediaType, id, true);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    keepScreenAwake();
    return () => allowScreenSleep();
  }, []);

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} trailer`}
      className="fixed inset-0 z-50 bg-black"
    >
      {videoUrl && (
        <iframe
          src={autoplayTrailerUrl(videoUrl)}
          title={`${title} Trailer`}
          className="h-full w-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
            <span className="text-lg text-gray-200">Loading trailer…</span>
          </div>
        </div>
      )}

      {!loading && !videoUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg bg-red-900/90 px-8 py-5 text-center">
            <p className="text-xl font-semibold text-white">No trailer available</p>
            <p className="mt-1 text-gray-300">This content doesn't have a trailer</p>
          </div>
        </div>
      )}

      <button
        ref={closeRef}
        type="button"
        data-tv-autofocus
        onClick={onClose}
        aria-label="Close trailer"
        className="absolute right-8 top-8 rounded-full bg-black/60 px-6 py-3 text-lg font-semibold text-white backdrop-blur-sm focus-visible:bg-black/90"
      >
        ✕ Close
      </button>
    </div>
  );
}
