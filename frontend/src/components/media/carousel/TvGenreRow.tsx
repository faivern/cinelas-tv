/**
 * TV focus row for genres, following the TvFocusRow design: the focused
 * card sits at the left edge expanded to a 16:9 landscape backdrop,
 * followed by portrait cards, with half-width blurred peek/upcoming edge
 * cards. Same 32vh row geometry as the media rows to keep row continuity.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import TitleMid from "../title/TitleMid";
import { genreUrl } from "../../../utils/urlBuilder";
import { getGenreColor } from "../../../theme/genreColors";
import { usePreloadImages } from "../../../hooks/images/usePreloadImages";
import { useRowFocusMemory } from "../../../lib/tv/useRowFocusMemory";
import type { EnrichedGenre, MediaType } from "../../../types/tmdb";

const PORTRAITS_AFTER_FOCUS = 3;
// Window slots: blurred peek + focused landscape + portraits + blurred upcoming.
const WINDOW = PORTRAITS_AFTER_FOCUS + 3;
const TMDB_IMG = "https://image.tmdb.org/t/p/w780";

// Shared row geometry with TvFocusRow: one height, widths from aspect ratios.
const H = "h-[32vh]";
const W_LANDSCAPE = "w-[calc(32vh*16/9)]";
const W_PORTRAIT = "w-[calc(32vh*2/3)]";
const W_HALF = "w-[calc(32vh*1/3)]";

type Props = {
  genres: EnrichedGenre[];
  loading?: boolean;
};

export default function TvGenreRow({ genres, loading = false }: Props) {
  // Focused index survives unmount/remount so back-navigation restores the
  // row to the card the user left from.
  const { focusedIndex, setFocusedIndex, hasLooped, setHasLooped } =
    useRowFocusMemory("genres");

  const backdropUrls = useMemo(
    () =>
      genres
        .filter((g) => g.backdropPath)
        .map((g) => `${TMDB_IMG}${g.backdropPath}`),
    [genres]
  );
  usePreloadImages(backdropUrls);

  if (loading) {
    return (
      <div data-tv-row className="px-page mt-8">
        <TitleMid>Genres</TitleMid>
        <div className={`flex gap-4 overflow-hidden ${H}`}>
          <div className={`${W_LANDSCAPE} h-full rounded-2xl bg-white/5 animate-pulse shrink-0`} />
          {Array.from({ length: PORTRAITS_AFTER_FOCUS }).map((_, i) => (
            <div key={i} className={`${W_PORTRAIT} h-full rounded-2xl bg-white/5 animate-pulse shrink-0`} />
          ))}
        </div>
      </div>
    );
  }

  if (!genres.length) return null;

  const focus = Math.min(focusedIndex, Math.max(genres.length - 1, 0));
  // The row loops forward: past the last card it continues with the first
  // one instead of ending. The very start renders clean — no wrapped peek
  // card left of the first item — but once the row has looped once, the
  // left edge wraps as well, so Left on the first card jumps to the last.
  // Loops only when the list fills the whole window — fewer items than
  // slots would render the same card twice.
  const loop = genres.length >= WINDOW;
  const start =
    loop && focus === 0 && hasLooped
      ? genres.length - 1
      : Math.max(focus - 1, 0);
  // One extra card past the portraits: the half-shown, blurred upcoming card.
  const size = loop
    ? WINDOW - (focus === start ? 1 : 0)
    : Math.min(focus + PORTRAITS_AFTER_FOCUS + 1, genres.length - 1) - start + 1;
  const focusSlot = focus === start ? 0 : 1;
  const indices = Array.from({ length: size }, (_, j) => (start + j) % genres.length);

  return (
    <div data-tv-row className="px-page mt-8">
      <TitleMid>Genres</TitleMid>
      <div className="flex gap-4 overflow-hidden px-3 py-3 -mx-3">
        {indices.map((index, j) => {
          const genre = genres[index];
          const role =
            j === focusSlot
              ? "landscape"
              : j < focusSlot
                ? "peek"
                : j > focusSlot + PORTRAITS_AFTER_FOCUS
                  ? "upcoming"
                  : "portrait";
          const isEdge = role === "peek" || role === "upcoming";
          const width =
            role === "landscape" ? W_LANDSCAPE : isEdge ? W_HALF : W_PORTRAIT;
          // Fade the outer side of the edge cards so they smudge into the
          // background instead of ending in a hard cut.
          const edgeMask =
            role === "peek"
              ? "[mask-image:linear-gradient(to_left,black_20%,transparent_95%)] [-webkit-mask-image:linear-gradient(to_left,black_20%,transparent_95%)]"
              : role === "upcoming"
                ? "[mask-image:linear-gradient(to_right,black_20%,transparent_95%)] [-webkit-mask-image:linear-gradient(to_right,black_20%,transparent_95%)]"
                : "";
          const defaultMediaType: MediaType = genre.supportedMediaTypes?.includes("movie")
            ? "movie"
            : "tv";
          const hasBackdrop = !!genre.backdropPath;

          return (
            <Link
              key={genre.id}
              to={genreUrl(genre.id, genre.name, defaultMediaType)}
              onFocus={() => {
                // A last → first transition means the row just looped; from
                // then on the left edge wraps as well.
                if (focus === genres.length - 1 && index === 0) {
                  setHasLooped(true);
                }
                setFocusedIndex(index);
              }}
              aria-label={genre.name}
              className={`group flex flex-col shrink-0 ${width} 
                transition-[width] duration-300 ease-out`}
            >
              <div
                className={`focus-ring-target relative w-full ${H} rounded-2xl overflow-hidden
                  border border-[var(--border)] bg-[var(--component-primary)] shadow-lg
                  ${edgeMask}`}
              >
                {hasBackdrop ? (
                  <img
                    src={`${TMDB_IMG}${genre.backdropPath}`}
                    alt=""
                    className={`absolute inset-0 w-full h-full object-cover ${
                      isEdge
                        ? `blur-sm opacity-60 scale-110 ${
                            role === "peek" ? "object-right" : "object-left"
                          }`
                        : ""
                    }`}
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div
                    className={`absolute inset-0 ${getGenreColor(genre.id)} ${
                      isEdge ? "opacity-60" : ""
                    }`}
                  />
                )}
                {!isEdge && (
                  <div
                    className={`absolute inset-0 ${hasBackdrop ? "bg-black/40" : "bg-black/10"}`}
                  />
                )}
                {role === "landscape" ? (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-4 pt-12 z-10">
                    <h3 className="text-2xl font-bold text-white truncate">
                      {genre.name}
                    </h3>
                  </div>
                ) : (
                  !isEdge && (
                    <div className="relative z-10 h-full w-full flex items-center justify-center text-center px-4">
                      <h3 className="max-w-full text-2xl font-semibold text-white text-shadow-lg truncate">
                        {genre.name}
                      </h3>
                    </div>
                  )
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
