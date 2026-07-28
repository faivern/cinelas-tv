import type { Credit, DetailMedia, MediaType } from "../../../../types/tmdb";
import TitleMid from "../../title/TitleMid";

type Props = {
  details: DetailMedia;
  crew: Credit[];
  mediaType: MediaType;
};

function formatMoney(amount?: number): string | null {
  if (!amount || amount <= 0) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function formatDate(date?: string): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function TvMediaFacts({ details, crew, mediaType }: Props) {
  const directors = crew
    .filter((c) => c.job === "Director")
    .map((c) => c.name)
    .filter(Boolean)
    .slice(0, 3);
  const writers = crew
    .filter((c) => c.job === "Screenplay" || c.job === "Writer" || c.job === "Story")
    .map((c) => c.name)
    .filter(Boolean)
    .slice(0, 3);
  const creators = (details.created_by ?? []).map((c) => c.name).slice(0, 3);
  const companies = (details.production_companies ?? [])
    .map((c) => c.name)
    .slice(0, 3);
  const countries = (details.production_countries ?? [])
    .map((c) => c.name)
    .slice(0, 3);

  const facts: Array<[string, string | null]> = [
    mediaType === "movie"
      ? ["Director", directors.join(", ") || null]
      : ["Created by", creators.join(", ") || null],
    ["Writers", writers.join(", ") || null],
    [
      mediaType === "movie" ? "Release date" : "First aired",
      formatDate(details.release_date ?? details.first_air_date),
    ],
    mediaType === "tv" && details.number_of_episodes
      ? [
          "Episodes",
          `${details.number_of_episodes} across ${details.number_of_seasons ?? "?"} season${(details.number_of_seasons ?? 0) > 1 ? "s" : ""}`,
        ]
      : ["Budget", formatMoney(details.budget)],
    mediaType === "movie" ? ["Box office", formatMoney(details.revenue)] : null,
    [
      "Rating",
      details.vote_average && details.vote_average > 0
        ? `${details.vote_average.toFixed(1)} / 10 (${(details.vote_count ?? 0).toLocaleString()} votes)`
        : null,
    ],
    ["Original language", details.original_language?.toUpperCase() || null],
    ["Production", companies.join(", ") || null],
    ["Country", countries.join(", ") || null],
  ].filter((f): f is [string, string] => f != null && f[1] != null);

  return (
    // Focusable so the D-pad can step down to it and scroll it into view —
    // it holds no interactive elements of its own.
    <section
      tabIndex={0}
      className="px-page mt-8 rounded-xl focus-visible:bg-badge-primary/30"
    >
      <TitleMid>More Info</TitleMid>
      {details.tagline && (
        <p className="mb-5 text-lg italic text-white/60">“{details.tagline}”</p>
      )}
      <div className="grid grid-cols-2 gap-x-14 gap-y-4 xl:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
              {label}
            </div>
            <div className="mt-0.5 text-base text-white/90">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
