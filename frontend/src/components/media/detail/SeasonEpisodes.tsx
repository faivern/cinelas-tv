import { useMemo, useState, Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { useShowSeason } from "../../../hooks/media/useShowSeason";
import type { Episode, SeasonSummary } from "../../../types/tmdb";
import TitleMid from "../title/TitleMid";
import { Check, ChevronDown, ImageIcon } from "lucide-react";

type Props = {
  seriesId: number;
  seasons: SeasonSummary[];
};

function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function EpisodeRow({ episode }: { episode: Episode }) {
  const runtime = formatRuntime(episode.runtime);

  return (
    <div
      tabIndex={0}
      className="group flex items-center gap-4 rounded-xl p-3 border-b border-accent-foreground/30 last:border-b-0 hover:bg-badge-primary/50 focus-visible:bg-badge-primary/50 transition-colors"
    >
      {/* Episode index */}
      <span className="flex-shrink-0 w-8 text-center text-xl font-bold text-gray-500 tabular-nums">
        {episode.episode_number}
      </span>

      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-40 md:w-48 aspect-video rounded-lg overflow-hidden bg-badge-primary">
        {episode.still_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
            alt={episode.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="truncate font-semibold text-white">
            {episode.name}
          </h4>
          {runtime && (
            <span className="flex-shrink-0 text-lg font-bold text-gray-500 tabular-nums">
              {runtime}
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-3 text-sm text-gray-400">
          {episode.overview || "No synopsis available yet."}
        </p>
      </div>
    </div>
  );
}

function EpisodesSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-4 p-3">
          <div className="w-40 md:w-48 aspect-video rounded-lg bg-badge-primary" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-1/2 rounded bg-badge-primary" />
            <div className="h-3 w-1/4 rounded bg-badge-primary" />
            <div className="h-3 w-full rounded bg-badge-primary" />
            <div className="h-3 w-5/6 rounded bg-badge-primary" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SeasonEpisodes({ seriesId, seasons }: Props) {
  // Only real seasons with episodes; keep Specials (season 0) selectable but
  // default to the first numbered season.
  const availableSeasons = useMemo(
    () =>
      seasons
        .filter((s) => s.episode_count > 0)
        .sort((a, b) => a.season_number - b.season_number),
    [seasons]
  );

  const defaultSeason =
    availableSeasons.find((s) => s.season_number >= 1) ?? availableSeasons[0];

  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(
    defaultSeason?.season_number
  );

  const { data: season, isLoading } = useShowSeason(seriesId, selectedSeason);

  if (availableSeasons.length === 0) return null;

  const activeSeason = availableSeasons.find(
    (s) => s.season_number === selectedSeason
  );

  return (
    <section className="w-full py-4">
      <div className="bg-component-primary rounded-xl p-4 md:p-6 border border-accent-foreground/60 shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="[&>div]:mb-0">
            <TitleMid>Episodes</TitleMid>
          </div>

          {availableSeasons.length > 1 ? (
            <Listbox value={selectedSeason} onChange={setSelectedSeason}>
              <div className="relative w-full sm:w-56">
                <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-badge-primary border border-badge-foreground py-2 pl-3 pr-10 text-left text-white text-sm transition-all">
                  <span className="block truncate">
                    {activeSeason
                      ? `${activeSeason.name} (${activeSeason.episode_count} Episodes)`
                      : `Season ${selectedSeason}`}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </span>
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg bg-badge-primary border border-badge-foreground text-sm shadow-lg">
                    {availableSeasons.map((s) => (
                      <Listbox.Option
                        key={s.id}
                        value={s.season_number}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-3 pl-10 pr-4 ${
                            active ? "bg-accent-primary/20 text-white" : "text-gray-300"
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className="flex items-center gap-2">
                              {s.name}
                              <span className="text-xs text-gray-500">
                                ({s.episode_count} Episodes)
                              </span>
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-accent-primary">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          ) : (
            <span className="text-sm text-gray-400">
              {activeSeason?.episode_count} Episodes
            </span>
          )}
        </div>

        <div className="mt-4">
          {isLoading ? (
            <EpisodesSkeleton />
          ) : season && season.episodes.length > 0 ? (
            <div className="space-y-2">
              {season.episodes.map((ep) => (
                <EpisodeRow key={ep.id} episode={ep} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No episode information available for this season.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
