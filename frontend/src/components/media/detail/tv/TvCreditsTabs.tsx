import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import type { CreditsResponse, DetailMedia, MediaType } from "../../../../types/tmdb";
import {
  groupCredits,
  type CreditGroupKey,
  type GroupedPerson,
} from "../../../../utils/creditGroups";
import { personUrl } from "../../../../utils/urlBuilder";
import TvMediaFacts from "./TvMediaFacts";

const TMDB_IMG = "https://image.tmdb.org/t/p";
const MAX_PEOPLE_PER_SHELF = 40;

type Props = {
  details: DetailMedia;
  credits: CreditsResponse | undefined;
  mediaType: MediaType;
};

type TabKey = "info" | CreditGroupKey;

export default function TvCreditsTabs({ details, credits, mediaType }: Props) {
  const [tab, setTab] = useState<TabKey>("info");

  const groups = useMemo(
    () => groupCredits(credits, details, mediaType),
    [credits, details, mediaType],
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: "info", label: "More Info" },
    ...groups.map((g) => ({ key: g.key, label: g.label })),
  ];

  const activeGroup = groups.find((g) => g.key === tab);

  return (
    <div className="mt-8">
      <div className="px-page">
        <div className="flex gap-3 overflow-x-auto px-3 py-3 -mx-3">
        {tabs.map(({ key, label }) => {
          const selected = key === tab;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={selected}
              className={`focus-fill shrink-0 rounded-full border px-6 py-2.5 text-base font-semibold transition-colors focus-visible:border-white focus-visible:bg-white focus-visible:text-black ${
                selected
                  ? "border-white bg-white text-black"
                  : "border-badge-foreground bg-badge-primary text-gray-300"
              }`}
            >
              {label}
            </button>
          );
        })}
        </div>
      </div>

      {tab === "info" ? (
        <TvMediaFacts details={details} crew={credits?.crew ?? []} mediaType={mediaType} />
      ) : activeGroup ? (
        <TvPersonShelf people={activeGroup.people} />
      ) : null}
    </div>
  );
}

function TvPersonShelf({ people }: { people: GroupedPerson[] }) {
  return (
    <section data-tv-row className="px-page mt-2">
      <div className="flex items-start gap-6 overflow-x-auto px-3 py-3 -mx-3">
        {people.slice(0, MAX_PEOPLE_PER_SHELF).map((p) => (
          <Link
            key={p.id}
            to={personUrl(p.id, p.name)}
            aria-label={p.name}
            className="flex w-36 shrink-0 flex-col items-center text-center"
          >
            {p.profile_path ? (
              <img
                src={`${TMDB_IMG}/w300${p.profile_path}`}
                alt={p.name}
                loading="lazy"
                decoding="async"
                className="focus-ring-target h-36 w-36 rounded-full object-cover"
              />
            ) : (
              <div
                role="img"
                aria-label={p.name}
                className="focus-ring-target flex h-36 w-36 items-center justify-center rounded-full bg-white/5 text-accent-primary"
              >
                <User className="h-1/3 w-1/3" />
              </div>
            )}
            <span className="mt-3 text-base font-semibold text-text-h1 line-clamp-2">
              {p.name}
            </span>
            {p.roleLabel && (
              <span className="text-sm text-subtle italic line-clamp-2">
                {p.roleLabel}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
