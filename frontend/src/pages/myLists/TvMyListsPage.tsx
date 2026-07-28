/**
 * "My List" page for the TV build. Read-only, shelf-based: one D-pad row
 * per non-empty watch status (Watching / Watch Later / Favorites). Splits by
 * media type when a group contains both movies and shows so TvFocusRow
 * (per-row media_type) stays homogeneous.
 */
import { useMemo } from "react";
import TvFocusRow from "../../components/media/carousel/TvFocusRow";
import { useUser } from "../../hooks/user/useUser";
import { useUserMediaEntries } from "../../hooks/mediaEntries/useMediaEntries";
import type { MediaEntry, WatchStatus } from "../../types/mediaEntry";
import type { TrendingMedia } from "../../types/tmdb";

function toRowItem(item: MediaEntry): TrendingMedia {
  return {
    id: item.tmdbId,
    title: item.title ?? undefined,
    name: item.title ?? undefined,
    poster_path: item.posterPath ?? null,
    backdrop_path: item.backdropPath ?? null,
    media_type: item.mediaType === "tv" ? "tv" : "movie",
    vote_average: item.voteAverage ?? undefined,
    overview: item.overview ?? undefined,
    release_date: item.releaseDate,
    first_air_date: item.firstAirDate,
  };
}

const STATUS_LABELS: Record<WatchStatus, string> = {
  Watching: "Watching",
  WantToWatch: "Watch Later",
  Favorites: "Favorites",
};

const STATUS_ORDER: WatchStatus[] = ["Watching", "WantToWatch", "Favorites"];

/** One shelf per media type present in the group; suffix the label only when
 *  both types exist so single-type groups keep clean names. */
function Shelves({
  items,
  baseTitle,
}: {
  items: MediaEntry[];
  baseTitle: string;
}) {
  const movies = items.filter((i) => i.mediaType !== "tv").map(toRowItem);
  const shows = items.filter((i) => i.mediaType === "tv").map(toRowItem);
  const bothPresent = movies.length > 0 && shows.length > 0;

  return (
    <>
      {movies.length > 0 && (
        <TvFocusRow
          media_type="movie"
          items={movies}
          title={bothPresent ? `${baseTitle} — Movies` : baseTitle}
        />
      )}
      {shows.length > 0 && (
        <TvFocusRow
          media_type="tv"
          items={shows}
          title={bothPresent ? `${baseTitle} — TV Shows` : baseTitle}
        />
      )}
    </>
  );
}

export default function TvMyListsPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: mediaEntries = [], isLoading: entriesLoading } =
    useUserMediaEntries();

  const entriesByStatus = useMemo(() => {
    const map: Record<WatchStatus, MediaEntry[]> = {
      Watching: [],
      WantToWatch: [],
      Favorites: [],
    };
    for (const e of mediaEntries) map[e.status].push(e);
    return map;
  }, [mediaEntries]);

  if (!user && !userLoading) {
    return (
      <main className="flex h-[60vh] items-center justify-center">
        <p className="text-lg text-gray-300">
          Pick a profile to see your list.
        </p>
      </main>
    );
  }

  const loading = userLoading || entriesLoading;
  const hasAnyEntries = mediaEntries.length > 0;

  if (loading && !hasAnyEntries) {
    return (
      <main>
        <div className="h-[38vh] -mx-[var(--tv-safe-x)] -mt-[var(--tv-safe-y)] animate-pulse bg-white/5" />
      </main>
    );
  }

  return (
    <main className="pb-16">
      {/* Compact header — no counts (feedback_tv_page_style) */}
      <section className="relative pt-[4vh] pb-4">
        <div className="flex items-center gap-4 px-[calc(var(--tv-safe-x)+0.5rem)]">
          {user?.picture ? (
            <img
              src={user.picture}
              alt=""
              className="h-16 w-16 rounded-full border border-[var(--border)] object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-white/10" aria-hidden />
          )}
          <div>
            <h1 className="text-4xl font-bold text-white drop-shadow-sm">
              My List
            </h1>
            {user?.name && (
              <p className="text-lg text-white/70">{user.name}</p>
            )}
          </div>
        </div>
      </section>

      {!hasAnyEntries ? (
        <div className="flex h-[50vh] flex-col items-center justify-center px-8 text-center">
          <p className="text-2xl text-white/85">Nothing here yet.</p>
          <p className="mt-3 max-w-xl text-lg text-white/60">
            Open any movie or show and pick a status — it'll show up in the
            matching shelf here.
          </p>
        </div>
      ) : (
        <>
          {STATUS_ORDER.map((status) => {
            const entries = entriesByStatus[status];
            if (entries.length === 0) return null;
            return (
              <Shelves
                key={status}
                items={entries}
                baseTitle={STATUS_LABELS[status]}
              />
            );
          })}
        </>
      )}
    </main>
  );
}
