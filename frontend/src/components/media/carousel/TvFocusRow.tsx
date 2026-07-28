/**
 * Netflix-style focus row for the TV build. Always four cards on screen:
 * the focused card sits furthest left expanded to a landscape backdrop,
 * followed by three portrait posters. D-pad right/left shifts the window
 * (the row is the carousel) so the focused card never leaves the left edge
 * and there is no vertical grid to scroll through. The previously passed
 * card (left) and the upcoming card (right) are rendered half-width and
 * blurred so the row reads as a continuous strip, and the left edge keeps
 * a spatial-navigation target to move focus back to.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Poster from "../shared/Poster";
import RatingPill from "../../ui/RatingPill";
import TitleMid from "../title/TitleMid";
import Logo from "../shared/EnhancedTitle";
import { mediaUrl, collectionUrl } from "../../../utils/urlBuilder";
import { useMediaLogo } from "../../../hooks/images/useMediaLogo";
import { usePrefetchMediaLogos } from "../../../hooks/images/usePrefetchMediaLogos";
import { useCardDetails } from "../../../hooks/media/useMediaCardDetails";
import { useRowFocusMemory } from "../../../lib/tv/useRowFocusMemory";
import genreMap, { resolveGenreIds } from "../../../utils/genreMap";
import { avgCollectionRating } from "../../../utils/avgCollectionRating";
import type { MediaGridItem } from "../../../api/media.api";
import type { DetailMedia, MediaType, TrendingMedia } from "../../../types/tmdb";

type RowItem = MediaGridItem | TrendingMedia;

function getParts(item: RowItem): DetailMedia[] | undefined {
  return (item as { parts?: DetailMedia[] }).parts;
}

// Collections have no logo art of their own on TMDB, so the earliest released
// movie stands in as the franchise face (Star Wars → Episode IV's logo).
function firstReleasedPart(parts?: DetailMedia[]): DetailMedia | undefined {
  if (!parts?.length) return undefined;
  const released = parts
    .filter((p) => p.release_date)
    .sort((a, b) => a.release_date!.localeCompare(b.release_date!));
  return released[0] ?? parts[0];
}

function collectionGenres(parts: DetailMedia[]): string[] {
  const counts = new Map<number, number>();
  for (const p of parts)
    for (const id of p.genre_ids ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => genreMap[id])
    .filter(Boolean)
    .slice(0, 3);
}

const PORTRAITS_AFTER_FOCUS = 3;
// Window slots: blurred peek + focused landscape + portraits + blurred upcoming.
const WINDOW = PORTRAITS_AFTER_FOCUS + 3;
const TMDB_IMG = "https://image.tmdb.org/t/p";

// Cards snap between widths deliberately — animating width relayouts the row
// every frame, the main jank source on the Chromecast's WebView.
// Shared row geometry: one height, widths derived from aspect ratios.
// 32vh (not 34) so peek + landscape + 3 portraits + upcoming + gaps fit
// inside the px-page + tv-safe-x padded container on a 16:9 screen.
const H = "h-[32vh]";
const W_LANDSCAPE = "w-[calc(32vh*16/9)]";
const W_PORTRAIT = "w-[calc(32vh*2/3)]";
// Half a portrait: used for the blurred passed/upcoming edge cards.
const W_HALF = "w-[calc(32vh*1/3)]";

/**
 * True once `value` has been stable for `delay` ms. Used to hold back the
 * per-card API calls (logo, runtime details) while the D-pad is scanning the
 * row — holding "right" would otherwise fire two requests per keypress.
 */
function useSettled<T>(value: T, delay = 250): boolean {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return settled === value;
}

function formatRuntime(minutes?: number): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function FocusedCardBadges({
  media_type,
  item,
  itemTitle,
  isCollection,
}: {
  media_type?: MediaType;
  item: RowItem;
  itemTitle: string;
  isCollection?: boolean;
}) {
  const parts = isCollection ? getParts(item) : undefined;
  // Not gated on the settle debounce: the row prefetches logos ahead of the
  // focus, so this is a cache read and the logo shows the moment focus lands.
  const { data: logoPath } = useMediaLogo(
    parts ? "movie" : media_type,
    parts ? firstReleasedPart(parts)?.id : item.id,
  );
  const collectionAvg = parts ? avgCollectionRating(parts) : null;
  const rating = parts
    ? collectionAvg
      ? parseFloat(collectionAvg)
      : undefined
    : item.vote_average;

  return (
    <>
      {rating != null && rating > 0 && (
        <RatingPill
          rating={rating}
          className="absolute top-3 left-3 z-10"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-4 pt-12">
        {logoPath ? (
          <Logo
            path={logoPath}
            alt={itemTitle}
            className="max-h-14 w-auto max-w-[60%] animate-[fadeIn_0.3s_ease-in-out]"
            sizes="30vw"
            priority
          />
        ) : (
          <h3 className="text-2xl font-bold text-white truncate">{itemTitle}</h3>
        )}
      </div>
    </>
  );
}

function FocusedCardInfo({
  media_type,
  item,
  year,
  active,
  isCollection,
}: {
  media_type?: MediaType;
  item: RowItem;
  year: string;
  active: boolean;
  isCollection?: boolean;
}) {
  const parts = isCollection ? getParts(item) : undefined;
  const { data: details } = useCardDetails(active ? media_type : undefined, item.id);
  // Movies show formatted runtime; TV shows show the season count. Collections
  // show the franchise's total watch time (parts carry runtime via the
  // backend's collection enrichment) — per-episode runtime is noisy and less
  // useful for browsing shelves.
  const runtime = parts
    ? formatRuntime(parts.reduce((sum, p) => sum + (p.runtime ?? 0), 0))
    : media_type === "movie"
      ? formatRuntime(details?.runtime ?? undefined)
      : details?.number_of_seasons
        ? `${details.number_of_seasons} season${details.number_of_seasons === 1 ? "" : "s"}`
        : null;
  // Items sourced from MediaEntry (My List) don't carry genre_ids — fall back
  // to the details payload we're already fetching for runtime.
  const genres = parts
    ? collectionGenres(parts)
    : item.genre_ids?.length
      ? resolveGenreIds(item.genre_ids, item.original_language)
          .map((id) => genreMap[id])
          .filter(Boolean)
          .slice(0, 3)
      : (details?.genres ?? []).map((g) => g.name).slice(0, 3);
  const genreText = genres.join(", ");
  const fixedText = (
    [year, parts && runtime ? `${runtime} total` : runtime].filter(
      Boolean,
    ) as string[]
  ).join("  •  ");

  return (
    <div className="mt-3 px-1">
      {(genreText || fixedText) && (
        <div className="flex items-baseline text-sm text-white/80">
          {genreText && <span className="truncate">{genreText}</span>}
          {genreText && fixedText && (
            <span className="shrink-0 whitespace-pre">{"  •  "}</span>
          )}
          {fixedText && (
            <span className="shrink-0 whitespace-pre">{fixedText}</span>
          )}
        </div>
      )}
      {item.overview && (
        <p className="mt-1 text-sm text-white/60 line-clamp-2">
          {item.overview}
        </p>
      )}
    </div>
  );
}

interface TvFocusRowProps {
  media_type?: MediaType;
  items: RowItem[];
  loading?: boolean;
  error?: string | null;
  title?: string;
  showRank?: boolean;
  variant?: "media" | "collection";
}

export default function TvFocusRow({
  media_type,
  items,
  loading = false,
  error = null,
  title,
  showRank = false,
  variant = "media",
}: TvFocusRowProps) {
  // Focused index survives unmount/remount so back-navigation restores the
  // row to the card the user left from.
  const { focusedIndex, setFocusedIndex, hasLooped, setHasLooped } =
    useRowFocusMemory(title ?? `trending-${media_type}-${variant}`);
  const focus = Math.min(focusedIndex, Math.max(items.length - 1, 0));
  const settled = useSettled(focus);

  // Warm the neighbours' landscape backdrops so the focused card's image is
  // already in the HTTP cache by the time a D-pad step expands it. Two steps
  // ahead keeps a lead while holding right on the D-pad.
  useEffect(() => {
    // Wrap-around neighbours: the row loops, so its ends are adjacent.
    for (const offset of [1, 2, -1]) {
      const neighbour = items[(focus + offset + items.length) % items.length];
      if (neighbour?.backdrop_path) {
        new Image().src = `${TMDB_IMG}/w780${neighbour.backdrop_path}`;
      }
    }
  }, [focus, items]);

  // Warm a sliding window of logos around the focus (API path + image bytes),
  // so the focused card's logo is a pure cache hit instead of two roundtrips.
  // Collection rows warm the earliest released movie of each franchise — the
  // logo the focused card will render.
  const LOGOS_AHEAD = 6;
  const logoWindow = useMemo(() => {
    if ((!media_type && variant !== "collection") || items.length === 0) return [];
    const count = Math.min(items.length, LOGOS_AHEAD + 2);
    const windowItems = Array.from(
      { length: count },
      (_, j) => items[(focus - 1 + j + items.length) % items.length],
    );
    if (variant !== "collection") return windowItems;
    return windowItems
      .map((it) => firstReleasedPart(getParts(it)))
      .filter((p): p is DetailMedia => p != null);
  }, [media_type, variant, items, focus]);
  usePrefetchMediaLogos(variant === "collection" ? "movie" : media_type ?? "movie", logoWindow);

  const displayTitle =
    title || `Trending ${media_type === "movie" ? "Movies" : "TV Shows"}`;

  if (error) {
    return (
      <div data-tv-row className="px-page mt-8">
        <TitleMid>{displayTitle}</TitleMid>
        <div className="text-red-400 text-center py-8 bg-red-500/10 rounded-lg border border-red-500/20">
          <p className="text-lg font-medium">Failed to load media</p>
          <p className="text-sm mt-1 opacity-75">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div data-tv-row className="px-page mt-8">
        <TitleMid>{displayTitle}</TitleMid>
        <div className={`flex gap-4 overflow-hidden ${H}`}>
          <div className={`${W_LANDSCAPE} h-full rounded-2xl bg-white/5 animate-pulse shrink-0`} />
          {Array.from({ length: PORTRAITS_AFTER_FOCUS }).map((_, i) => (
            <div key={i} className={`${W_PORTRAIT} h-full rounded-2xl bg-white/5 animate-pulse shrink-0`} />
          ))}
        </div>
      </div>
    );
  }

  // The row loops forward: past the last card it continues with the first
  // one instead of ending. The very start renders clean — no wrapped peek
  // card left of the first item — but once the row has looped once, the
  // left edge wraps as well, so Left on the first card jumps to the last.
  // Loops only when the list fills the whole window — fewer items than
  // slots would render the same card twice.
  const loop = items.length >= WINDOW;
  const start =
    loop && focus === 0 && hasLooped
      ? items.length - 1
      : Math.max(focus - 1, 0);
  // One extra card past the portraits: the half-shown, blurred upcoming card.
  const size = loop
    ? WINDOW - (focus === start ? 1 : 0)
    : Math.min(focus + PORTRAITS_AFTER_FOCUS + 1, items.length - 1) - start + 1;
  const focusSlot = focus === start ? 0 : 1;
  const indices = Array.from({ length: size }, (_, j) => (start + j) % items.length);

  return (
    <div data-tv-row className="px-page mt-8">
      <TitleMid>{displayTitle}</TitleMid>
      <div className="flex gap-4 overflow-hidden px-3 py-3 -mx-3">
        {indices.map((index, j) => {
          const item = items[index];
          const rawTitle = item.title || item.name || "No title";
          const itemTitle =
            variant === "collection"
              ? rawTitle.replace(/\s+collection$/i, "")
              : rawTitle;
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
          const year = (item.release_date || item.first_air_date || "").slice(0, 4);
          const backdrop = item.backdrop_path
            ? `${TMDB_IMG}/w780${item.backdrop_path}`
            : null;

          return (
            <Link
              key={item.id}
              to={
                variant === "collection"
                  ? collectionUrl(item.id, itemTitle)
                  : mediaUrl(media_type ?? "movie", item.id, itemTitle)
              }
              data-tv-row-entry={j === focusSlot ? true : undefined}
              onFocus={() => {
                // A last → first transition means the row just looped; from
                // then on the left edge wraps as well.
                if (focus === items.length - 1 && index === 0) {
                  setHasLooped(true);
                }
                setFocusedIndex(index);
              }}
              aria-label={itemTitle}
              className={`group flex flex-col shrink-0 ${width}`}
            >
              <div
                className={`focus-ring-target relative w-full ${H} rounded-2xl overflow-hidden
                  border border-[var(--border)] bg-[var(--component-primary)] shadow-lg
                  ${edgeMask}`}
              >
                {role === "landscape" && backdrop ? (
                  <img
                    src={backdrop}
                    alt={itemTitle}
                    className="w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <Poster
                    path={item.poster_path ?? undefined}
                    alt={itemTitle}
                    useCustomSize
                    className={`w-full h-full ${
                      isEdge
                        ? `blur-sm opacity-60 scale-110 ${
                            role === "peek" ? "object-right" : "object-left"
                          }`
                        : ""
                    }`}
                    priority={role === "landscape"}
                  />
                )}

                {role === "landscape" && (
                  <FocusedCardBadges
                    media_type={media_type}
                    item={item}
                    itemTitle={itemTitle}
                    isCollection={variant === "collection"}
                  />
                )}

                {showRank && !isEdge && (
                  <span
                    className={`absolute bottom-0 right-0 pb-2 pr-3 z-10 leading-none select-none
                      text-transparent drop-shadow-[0_0_8px_rgba(0,0,0,0.6)]
                      ${role === "landscape" ? "bg-gradient-to-br from-accent-primary to-accent-secondary bg-clip-text" : ""}`}
                    style={{
                      fontFamily: "Poppins, sans-serif",
                      fontWeight: 700,
                      fontSize: role === "landscape" ? "5rem" : "3.5rem",
                      WebkitTextStroke: "2px var(--accent-primary)",
                      paintOrder: "stroke fill",
                    }}
                  >
                    {index + 1}
                  </span>
                )}
              </div>

              {role === "landscape" && (
                <FocusedCardInfo
                  media_type={media_type}
                  item={item}
                  year={year}
                  active={settled}
                  isCollection={variant === "collection"}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
