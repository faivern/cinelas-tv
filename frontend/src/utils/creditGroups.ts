import type {
  Credit,
  CreditsResponse,
  DetailMedia,
  MediaType,
} from "../types/tmdb";

export type CreditGroupKey =
  | "cast"
  | "directors"
  | "writers"
  | "producers"
  | "other";

export type GroupedPerson = {
  id: number;
  name: string;
  profile_path?: string | null;
  roleLabel?: string;
};

export type CreditGroup = {
  key: CreditGroupKey;
  label: string;
  people: GroupedPerson[];
};

const WRITER_JOBS = new Set(["Writer", "Screenplay", "Story"]);

function individualJobs(credit: Credit): string[] {
  if (credit.jobs?.length) {
    return credit.jobs.map((j) => j.job).filter((j): j is string => Boolean(j));
  }
  return credit.job ? [credit.job] : [];
}

function isDirector(credit: Credit): boolean {
  return individualJobs(credit).includes("Director");
}

function isWriter(credit: Credit): boolean {
  return (
    credit.department === "Writing" ||
    individualJobs(credit).some((j) => WRITER_JOBS.has(j))
  );
}

function isProducer(credit: Credit): boolean {
  return (
    credit.department === "Production" ||
    individualJobs(credit).some((j) => j.includes("Producer"))
  );
}

// Dedupes by person id, merging job labels for people with multiple jobs.
function toPeople(credits: Credit[]): GroupedPerson[] {
  const byId = new Map<number, GroupedPerson>();
  for (const credit of credits) {
    if (!credit.name) continue;
    const jobs = individualJobs(credit);
    const existing = byId.get(credit.id);
    if (existing) {
      const merged = new Set(
        [existing.roleLabel, ...jobs].filter(Boolean) as string[],
      );
      existing.roleLabel = [...merged].join(", ");
      existing.profile_path ??= credit.profile_path;
    } else {
      byId.set(credit.id, {
        id: credit.id,
        name: credit.name,
        profile_path: credit.profile_path,
        roleLabel: jobs.join(", ") || undefined,
      });
    }
  }
  return [...byId.values()];
}

export function groupCredits(
  credits: CreditsResponse | undefined,
  details: DetailMedia,
  mediaType: MediaType,
): CreditGroup[] {
  const cast = credits?.cast ?? [];
  const crew = credits?.crew ?? [];

  const castPeople: GroupedPerson[] = [];
  const seenCast = new Set<number>();
  for (const c of [...cast].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))) {
    if (!c.name || seenCast.has(c.id)) continue;
    seenCast.add(c.id);
    castPeople.push({
      id: c.id,
      name: c.name,
      profile_path: c.profile_path,
      roleLabel: c.character || undefined,
    });
  }

  const directors = toPeople(crew.filter(isDirector));
  const writers = toPeople(crew.filter(isWriter));
  const producers = toPeople(crew.filter(isProducer));
  const other = toPeople(
    crew.filter((c) => !isDirector(c) && !isWriter(c) && !isProducer(c)),
  );

  if (mediaType === "tv") {
    const creators = (details.created_by ?? [])
      .filter((c) => !writers.some((w) => w.id === c.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        profile_path: c.profile_path,
        roleLabel: "Creator",
      }));
    writers.unshift(...creators);
  }

  const groups: CreditGroup[] = [
    { key: "cast", label: "Cast", people: castPeople },
    { key: "directors", label: "Directors", people: directors },
    { key: "writers", label: "Writers", people: writers },
    { key: "producers", label: "Producers", people: producers },
    { key: "other", label: "Other crew", people: other },
  ];

  return groups.filter((g) => g.people.length > 0);
}
