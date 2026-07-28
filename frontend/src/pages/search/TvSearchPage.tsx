/**
 * Search page for the TV build, Netflix/YouTube-TV-style split screen:
 * a D-pad on-screen keyboard on the left (plus genre shortcuts below it),
 * and a 6-wide poster grid on the right showing trending picks until the
 * user types, then the top search hits. No <input> element — keys are real
 * buttons, so the Android IME never pops and the existing global spatial
 * navigation handles all focus movement. The TV navbar stays visible above
 * so opening search feels like a mode change, not a page jump — the split
 * layout is sized to the remaining viewport (100dvh minus header + safe-y).
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Delete } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "../../hooks/useSearch";
import { useGenres } from "../../hooks/genres/useGenres";
import { getTrendingMedia } from "../../api/trending.api";
import { getDiscoverGenre } from "../../api/genres.api";
import { mediaUrl } from "../../utils/urlBuilder";
import type { DetailMedia, MediaType, TrendingMedia } from "../../types/tmdb";

const TMDB_IMG = "https://image.tmdb.org/t/p";
const KEYS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
const GRID_SIZE = 32; // 8 rows x 4 columns

type GridItem = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string;
};

function toGridItems(items: TrendingMedia[]): GridItem[] {
  // Dedupe: TMDB trending pages can repeat entries (page 2 re-serving page 1
  // titles), and duplicate React keys corrupt the grid's reconciliation,
  // leaving stale tiles behind when the array is swapped for search hits.
  const seen = new Set<string>();
  const out: GridItem[] = [];
  for (const m of items) {
    if (!m.poster_path || (m.media_type !== "movie" && m.media_type !== "tv"))
      continue;
    const key = `${m.media_type}-${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: m.id,
      media_type: m.media_type,
      title: m.title || m.name || "",
      poster_path: m.poster_path,
    });
    if (out.length === GRID_SIZE) break;
  }
  return out;
}

export default function TvSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Local state is the typing source of truth — rapid key presses (on-screen
  // or physical) need functional updates, and react-router's setSearchParams
  // functional form still reads render-stale params, dropping characters.
  // The URL is synced in the debounce below for back-navigation restore.
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [selectedGenre, setSelectedGenre] = useState<{
    id: number;
    name: string;
    mediaType: MediaType;
  } | null>(null);
  const { results, search, loading, error, hasSearched, clearSearch } =
    useSearch();

  useEffect(() => {
    const t = setTimeout(() => {
      const q = query.trim();
      setSearchParams(q ? { q } : {}, { replace: true });
      if (q) search(q);
      else clearSearch();
    }, 300);
    return () => clearTimeout(t);
  }, [query, search, clearSearch, setSearchParams]);

  // Physical/emulator keyboard support: printable keys type, Backspace
  // deletes. The on-screen keys stay the primary path for the remote.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        setQuery((q) => q.slice(0, -1));
      } else if (e.key.length === 1 && /[\p{L}\p{N} ]/u.test(e.key)) {
        e.preventDefault();
        setQuery((q) => q + e.key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Recommended" fill for the idle grid: two pages of daily trending
  // (20/page; the backend only exposes /day) so the poster grid is full even
  // after person entries drop out.
  const { data: recommended } = useQuery({
    queryKey: ["tv-search", "recommended"],
    queryFn: async () => {
      const [p1, p2] = await Promise.all([
        getTrendingMedia("all", "day", 1),
        getTrendingMedia("all", "day", 2),
      ]);
      return toGridItems([...p1, ...p2]);
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: genres } = useGenres();

  // Popular picks for the currently seeded genre. Two pages fill the 32-slot
  // grid; discover is popularity-sorted by default so page 1+2 = top 40.
  const { data: genrePicks } = useQuery({
    queryKey: [
      "tv-search",
      "genre-picks",
      selectedGenre?.mediaType,
      selectedGenre?.id,
    ],
    queryFn: async () => {
      const [p1, p2] = await Promise.all([
        getDiscoverGenre({
          mediaType: selectedGenre!.mediaType,
          genreId: selectedGenre!.id,
          page: 1,
        }),
        getDiscoverGenre({
          mediaType: selectedGenre!.mediaType,
          genreId: selectedGenre!.id,
          page: 2,
        }),
      ]);
      const merged: TrendingMedia[] = [...p1.results, ...p2.results].map(
        (m: DetailMedia) => ({
          ...m,
          media_type: selectedGenre!.mediaType,
        }) as unknown as TrendingMedia,
      );
      return toGridItems(merged);
    },
    enabled: !!selectedGenre,
    staleTime: 5 * 60 * 1000,
  });

  const showingHits = hasSearched && query.trim().length > 0;
  const hits = useMemo(
    () => toGridItems(results as TrendingMedia[]),
    [results],
  );
  const showingGenre = !showingHits && !!selectedGenre;
  const gridItems = showingHits
    ? hits
    : showingGenre
      ? (genrePicks ?? [])
      : (recommended ?? []);

  const keyClass =
    "focus-ring-target flex items-center justify-center rounded-lg bg-white/5 " +
    "text-xl font-semibold uppercase text-text-h1 transition-colors " +
    "focus-visible:bg-white/20";

  return (
    <main className="flex h-[calc(100dvh-var(--tv-navbar-height)-var(--tv-safe-y))] gap-[3vw] overflow-hidden pb-[var(--tv-safe-y)]">
      {/* Left: keyboard (space/delete on top), genre shortcuts */}
      <aside className="flex w-[24vw] shrink-0 flex-col">
        <div className="grid grid-cols-6 gap-2">
          <button
            type="button"
            aria-label="Space"
            onClick={() => setQuery((q) => q + " ")}
            className={`${keyClass} col-span-3 py-2 text-base normal-case`}
          >
            Space
          </button>
          <button
            type="button"
            aria-label="Delete last character"
            onClick={() => setQuery((q) => q.slice(0, -1))}
            className={`${keyClass} col-span-3 py-2`}
          >
            <Delete className="size-5" />
          </button>
          {KEYS.map((key, i) => (
            <button
              key={key}
              type="button"
              data-tv-autofocus={i === 0 ? true : undefined}
              aria-label={`Key ${key}`}
              onClick={() => setQuery((q) => q + key)}
              className={`${keyClass} aspect-square`}
            >
              {key}
            </button>
          ))}
        </div>

        {(genres?.length ?? 0) > 0 && (
          <nav aria-label="Genres" className="mt-6 flex-1 overflow-y-auto">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
              Genres
            </h2>
            <ul>
              {genres!.map((g) => {
                const mediaType: MediaType = g.supportedMediaTypes?.includes(
                  "movie",
                )
                  ? "movie"
                  : "tv";
                const active = selectedGenre?.id === g.id;
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setSelectedGenre(
                          active ? null : { id: g.id, name: g.name, mediaType },
                        )
                      }
                      className={`focus-fill block w-full rounded-lg px-3 py-2 text-left text-lg text-text-h1 transition-colors focus-visible:bg-white focus-visible:text-black ${
                        active ? "bg-white/15" : ""
                      }`}
                    >
                      {g.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </aside>

      {/* Right: recommended picks / top hits, 6-wide poster grid */}
      {/* px buffer + compensating negative margin: the scrollport clips at
          its edges, which would cut the focus ring on the outer columns. */}
      <section className="-mx-2 flex-1 overflow-y-auto px-2">
        {/* The heading doubles as the search readout: typed text replaces
            the "Recommended for you" placeholder. */}
        <h1 className="mb-4 truncate text-2xl font-bold text-text-h1">
          {query ? (
            <span className="uppercase tracking-wide">
              {query}
              <span className="ml-0.5 animate-pulse font-normal text-accent-primary">
                |
              </span>
            </span>
          ) : showingGenre ? (
            `Popular in ${selectedGenre!.name}`
          ) : (
            "Recommended for you"
          )}
        </h1>

        {error && <p className="py-16 text-xl text-red-400">{error}</p>}

        {!error && showingHits && !loading && hits.length === 0 && (
          <p className="py-16 text-xl text-subtle">
            No results for "{query.trim()}"
          </p>
        )}

        {!error && gridItems.length > 0 && (
          <div className="grid grid-cols-4 gap-4 pb-8">
            {gridItems.map((item) => (
              <Link
                key={`${item.media_type}-${item.id}`}
                to={mediaUrl(item.media_type, item.id, item.title)}
                aria-label={item.title}
                className="focus-ring-target overflow-hidden rounded-xl bg-white/5"
              >
                <img
                  src={`${TMDB_IMG}/w342${item.poster_path}`}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[2/3] w-full object-cover"
                />
              </Link>
            ))}
          </div>
        )}

        {!error && gridItems.length === 0 && (loading || !showingHits) && (
          <div className="grid grid-cols-4 gap-4 pb-8">
            {Array.from({ length: GRID_SIZE }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-xl bg-white/5"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
