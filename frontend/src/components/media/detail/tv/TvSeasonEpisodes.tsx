import { useMemo, useState } from "react";
import { useShowSeason } from "../../../../hooks/media/useShowSeason";
import type { Episode, SeasonSummary } from "../../../../types/tmdb";
import TitleMid from "../../title/TitleMid";
import { ImageIcon, Play } from "lucide-react";

type Props = {
  seriesId: number;
  seasons: SeasonSummary[];
  // Series exists in the Jellyfin library → rows become play buttons.
  playable?: boolean;
  onPlayEpisode?: (season: number, episode: number) => void;
  // Pressing a row while the series isn't in the library.
  onUnavailable?: () => void;
};

function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function TvEpisodeRow({
  episode,
  onPlay,
  onUnavailable,
}: {
  episode: Episode;
  onPlay?: () => void;
  onUnavailable?: () => void;
}) {
  const runtime = formatRuntime(episode.runtime);

  return (
    <button
      type="button"
      onClick={onPlay ?? onUnavailable}
      className="flex w-full items-center gap-5 rounded-xl p-3 text-left focus-visible:bg-badge-primary/50"
    >
      <span className="w-10 shrink-0 text-center text-2xl font-bold tabular-nums text-gray-500">
        {episode.episode_number}
      </span>

      <div className="relative aspect-video w-56 shrink-0 overflow-hidden rounded-lg bg-badge-primary">
        {episode.still_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
            alt={episode.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-600">
            <ImageIcon className="h-7 w-7" />
          </div>
        )}
        {onPlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Play className="h-8 w-8 fill-white text-white drop-shadow" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="truncate text-lg font-semibold text-white">{episode.name}</h4>
          {runtime && (
            <span className="shrink-0 text-lg font-bold tabular-nums text-gray-500">
              {runtime}
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-base text-gray-400">
          {episode.overview || "No synopsis available yet."}
        </p>
      </div>
    </button>
  );
}

function EpisodesSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-5 p-3">
          <div className="aspect-video w-56 rounded-lg bg-badge-primary" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-5 w-1/2 rounded bg-badge-primary" />
            <div className="h-4 w-full rounded bg-badge-primary" />
            <div className="h-4 w-5/6 rounded bg-badge-primary" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TvSeasonEpisodes({
  seriesId,
  seasons,
  playable = false,
  onPlayEpisode,
  onUnavailable,
}: Props) {
  const availableSeasons = useMemo(
    () =>
      seasons
        .filter((s) => s.episode_count > 0)
        .sort(
          (a, b) =>
            (a.season_number === 0 ? Infinity : a.season_number) -
            (b.season_number === 0 ? Infinity : b.season_number),
        ),
    [seasons],
  );

  const defaultSeason =
    availableSeasons.find((s) => s.season_number >= 1) ?? availableSeasons[0];

  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(
    defaultSeason?.season_number,
  );

  const { data: season, isLoading } = useShowSeason(seriesId, selectedSeason);

  if (availableSeasons.length === 0) return null;

  return (
    <section data-tv-row className="px-page mt-8">
      <TitleMid>Episodes</TitleMid>

      {availableSeasons.length > 1 && (
        <div className="mb-4 flex gap-3 overflow-x-auto px-3 py-3 -mx-3">
          {availableSeasons.map((s) => {
            const selected = s.season_number === selectedSeason;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSeason(s.season_number)}
                aria-pressed={selected}
                className={`shrink-0 rounded-full border px-6 py-2.5 text-base font-semibold transition-colors ${
                  selected
                    ? "border-accent-primary/75 bg-accent-primary/20 text-white"
                    : "border-badge-foreground bg-badge-primary text-gray-300"
                }`}
              >
                {s.name}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {s.episode_count} ep
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <EpisodesSkeleton />
      ) : season && season.episodes.length > 0 ? (
        <div className="space-y-1">
          {season.episodes.map((ep) => (
            <TvEpisodeRow
              key={ep.id}
              episode={ep}
              onPlay={
                playable && onPlayEpisode && selectedSeason !== undefined
                  ? () => onPlayEpisode(selectedSeason, ep.episode_number)
                  : undefined
              }
              onUnavailable={onUnavailable}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-400">No episode information available for this season.</p>
      )}
    </section>
  );
}
