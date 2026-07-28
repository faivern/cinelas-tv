import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { LogIn } from "lucide-react";
import { isTvMode } from "../../lib/tv/tvMode";
import TvMyListsPage from "./TvMyListsPage";

import { useUser } from "../../hooks/user/useUser";
import { useUserMediaEntries } from "../../hooks/mediaEntries/useMediaEntries";
import type { MediaEntry, WatchStatus } from "../../types/mediaEntry";
import type { MediaType } from "../../types/tmdb";
import MediaCard from "../../components/media/cards/MediaCard";
import { useSignInModal } from "../../context/SignInModalContext";

export default function MyListsPage() {
  if (isTvMode()) return <TvMyListsPage />;
  return <WebMyListsPage />;
}

const STATUS_LABELS: Record<WatchStatus, string> = {
  Watching: "Watching",
  WantToWatch: "Want to Watch",
  Favorites: "Favorites",
};

const STATUS_ORDER: WatchStatus[] = ["Watching", "WantToWatch", "Favorites"];

function toMediaType(mediaType: string): MediaType {
  return mediaType === "tv" ? "tv" : "movie";
}

function Shelf({ title, entries }: { title: string; entries: MediaEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-semibold text-[var(--text-h1)]">
        {title}
        <span className="ml-2 text-sm font-normal text-[var(--subtle)]">
          {entries.length}
        </span>
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="w-32 md:w-40 flex-shrink-0 snap-start"
          >
            <MediaCard
              id={entry.tmdbId}
              media_type={toMediaType(entry.mediaType)}
              title={entry.title ?? "Untitled"}
              posterPath={entry.posterPath ?? ""}
              overview={entry.overview ?? undefined}
              releaseDate={entry.releaseDate ?? entry.firstAirDate}
              vote_average={entry.voteAverage ?? undefined}
              disableHoverModal
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function WebMyListsPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { openSignInModal } = useSignInModal();
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

  if (!userLoading && !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-[var(--action-primary)] flex items-center justify-center mx-auto mb-6">
            <LogIn className="size-[30px] text-[var(--subtle)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-h1)] mb-3">
            Sign in to view your list
          </h1>
          <p className="text-[var(--subtle)] mb-6">
            Track what you're watching, want to watch, and have finished.
          </p>
          <button
            type="button"
            onClick={() => openSignInModal()}
            className="flex items-center justify-center gap-3 px-6 py-3 mx-auto bg-accent-secondary hover:bg-accent-primary text-white font-semibold rounded-xl transition-colors"
          >
            <LogIn />
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const loading = userLoading || entriesLoading;
  const isEmpty = !loading && mediaEntries.length === 0;

  return (
    <main className="min-h-dvh px-page py-6 mt-navbar-offset">
      <Helmet>
        <title>My List | Cinelas</title>
        <meta
          name="description"
          content="Track what you're watching, what you want to watch, and what you've finished."
        />
        <link rel="canonical" href="https://cinelas.com/lists" />
      </Helmet>

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-h1)]">
          My List
        </h1>
      </header>

      {loading && (
        <div className="animate-pulse space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-5 w-40 rounded bg-white/5" />
              <div className="h-56 rounded bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-2xl text-[var(--text-h1)]">Nothing here yet.</p>
          <p className="mt-3 max-w-md text-[var(--subtle)]">
            Open any movie or show and pick a status — it'll show up in the
            matching shelf here.
          </p>
        </div>
      )}

      {!loading && !isEmpty && (
        <>
          {STATUS_ORDER.map((status) => (
            <Shelf
              key={status}
              title={STATUS_LABELS[status]}
              entries={entriesByStatus[status]}
            />
          ))}
        </>
      )}
    </main>
  );
}
