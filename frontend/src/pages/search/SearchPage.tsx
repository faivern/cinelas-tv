import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSearch } from "../../hooks/useSearch";
import Poster from "../../components/media/shared/Poster";
import { mediaUrl, personUrl } from "../../utils/urlBuilder";
import { isTvMode } from "../../lib/tv/tvMode";
import TvSearchPage from "./TvSearchPage";
import { Search, X } from "lucide-react";

export default function SearchPage() {
  if (isTvMode()) return <TvSearchPage />;
  return <WebSearchPage />;
}

// Full-screen search page (web / mobile). The query lives in the URL (?q=)
// so back-navigation from a title returns straight to the previous results.
function WebSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const {
    results,
    search,
    loading,
    error,
    hasSearched,
    totalResults,
    clearSearch,
    hasNextPage,
    fetchNextPage,
    loadingNextPage,
  } = useSearch();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const q = query.trim();
      setSearchParams(q ? { q } : {}, { replace: true });
      if (q) {
        search(q);
      } else {
        clearSearch();
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, search, clearSearch, setSearchParams]);

  const openResult = (r: {
    media_type: string;
    id: number;
    title?: string;
    name?: string;
  }) => {
    const path =
      r.media_type === "person"
        ? personUrl(r.id, r.name || "unknown")
        : mediaUrl(r.media_type, r.id, r.title || r.name || "");
    navigate(path);
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-dvh px-6 md:px-12 py-8">
      {/* Search input — large, high-contrast, 10-foot friendly */}
      <div className="relative max-w-3xl mx-auto">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-subtle size-[18px]" />
        <input
          ref={inputRef}
          // Autofocus (opens the TV keyboard) only when arriving without a
          // query; when returning from a result, leave the grid usable.
          autoFocus={!searchParams.get("q")}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-label="Search"
          className="w-full bg-white/10 rounded-xl pl-14 pr-14 py-4 text-lg md:text-xl text-text-h1 placeholder-subtle    focus:bg-white/15 transition-colors"
          placeholder="Search Movies, TV Shows, People..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Submit: close the on-screen keyboard and hand D-pad focus to the
            // results, so DOWN doesn't land back on the input and reopen the IME.
            if (e.key === "Enter") {
              e.preventDefault();
              inputRef.current?.blur();
              // Defer past this key's keyup (and any duplicate IME enter) so
              // the tail of the submit can't activate the focused card.
              setTimeout(() => {
                resultsRef.current
                  ?.querySelector<HTMLElement>("button")
                  ?.focus();
              }, 250);
            }
          }}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-subtle hover:text-text-h1 transition-colors"
          >
            <X />
          </button>
        )}
      </div>

      <div className="mt-8">
        {loading && (
          <p className="text-center text-subtle py-12">
            <Search className="animate-spin mr-2" />
            Searching...
          </p>
        )}

        {error && <p className="text-center text-red-400 py-12">{error}</p>}

        {!loading && !error && !hasSearched && (
          <p className="text-center text-subtle py-12">
            Find your next movie or show.
          </p>
        )}

        {!loading && !error && hasSearched && results.length === 0 && (
          <p className="text-center text-subtle py-12">
            No results for "{query.trim()}"
          </p>
        )}

        {!error && results.length > 0 && (
          <>
            <p className="text-sm text-subtle mb-4">
              {totalResults} result{totalResults !== 1 ? "s" : ""}
            </p>
            <div
              ref={resultsRef}
              className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-6"
            >
              {results.map((r) => (
                <button
                  key={`${r.media_type}-${r.id}`}
                  type="button"
                  onClick={() => openResult(r)}
                  className="text-left rounded-lg group"
                >
                  <Poster
                    path={r.poster_path || r.profile_path}
                    alt={r.title || r.name || ""}
                    useCustomSize
                    className="w-full aspect-[2/3] rounded-lg group-hover:ring-2 group-hover:ring-accent-primary/60 transition"
                  />
                  <p className="mt-2 text-sm font-medium text-text-h1 truncate">
                    {r.title || r.name}
                  </p>
                  <p className="text-xs text-subtle capitalize truncate">
                    {r.media_type === "tv" ? "TV Show" : r.media_type}
                    {r.release_date &&
                      ` • ${new Date(r.release_date).getFullYear()}`}
                    {r.first_air_date &&
                      ` • ${new Date(r.first_air_date).getFullYear()}`}
                  </p>
                </button>
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  onClick={fetchNextPage}
                  disabled={loadingNextPage}
                  className="px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 text-text-h1 font-semibold transition disabled:opacity-50"
                >
                  {loadingNextPage ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
