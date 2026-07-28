import { describe, it, expect } from "vitest";
import { groupCredits } from "./creditGroups";
import type { CreditsResponse, DetailMedia } from "../types/tmdb";

const emptyDetails = {} as DetailMedia;

describe("groupCredits", () => {
  it("groups flat movie credits into role tabs", () => {
    const credits: CreditsResponse = {
      cast: [
        { id: 2, name: "B", character: "Hero", order: 1 },
        { id: 1, name: "A", character: "Villain", order: 0 },
      ],
      crew: [
        { id: 10, name: "Dir", job: "Director", department: "Directing" },
        { id: 11, name: "Wri", job: "Screenplay", department: "Writing" },
        { id: 12, name: "Pro", job: "Executive Producer", department: "Production" },
        { id: 13, name: "Edi", job: "Editor", department: "Editing" },
      ],
    };

    const groups = groupCredits(credits, emptyDetails, "movie");
    expect(groups.map((g) => g.key)).toEqual([
      "cast",
      "directors",
      "writers",
      "producers",
      "other",
    ]);
    expect(groups[0].people.map((p) => p.name)).toEqual(["A", "B"]);
    expect(groups[0].people[0].roleLabel).toBe("Villain");
    expect(groups[1].people[0].name).toBe("Dir");
    expect(groups[4].people[0].roleLabel).toBe("Editor");
  });

  it("matches individual jobs from aggregate jobs[] lists", () => {
    const credits: CreditsResponse = {
      cast: [],
      crew: [
        {
          id: 20,
          name: "Multi",
          department: "Directing",
          job: "Director, Series Director",
          jobs: [{ job: "Director" }, { job: "Series Director" }],
        },
      ],
    };

    const groups = groupCredits(credits, emptyDetails, "tv");
    const directors = groups.find((g) => g.key === "directors");
    expect(directors?.people[0].roleLabel).toBe("Director, Series Director");
  });

  it("prepends TV creators to writers and dedupes against crew", () => {
    const credits: CreditsResponse = {
      cast: [],
      crew: [{ id: 30, name: "Both", job: "Writer", department: "Writing" }],
    };
    const details = {
      created_by: [
        { id: 30, name: "Both", profile_path: null },
        { id: 31, name: "OnlyCreator", profile_path: null },
      ],
    } as DetailMedia;

    const writers = groupCredits(credits, details, "tv").find(
      (g) => g.key === "writers",
    );
    expect(writers?.people.map((p) => p.name)).toEqual(["OnlyCreator", "Both"]);
    expect(writers?.people[0].roleLabel).toBe("Creator");
    expect(writers?.people[1].roleLabel).toBe("Writer");
  });

  it("merges multiple crew entries for the same person", () => {
    const credits: CreditsResponse = {
      cast: [],
      crew: [
        { id: 40, name: "Dup", job: "Editor", department: "Editing" },
        { id: 40, name: "Dup", job: "Casting", department: "Production" },
      ],
    };

    const groups = groupCredits(credits, emptyDetails, "movie");
    const other = groups.find((g) => g.key === "other");
    expect(other?.people).toHaveLength(1);
    expect(other?.people[0].roleLabel).toBe("Editor");
    const producers = groups.find((g) => g.key === "producers");
    expect(producers?.people[0].roleLabel).toBe("Casting");
  });

  it("omits empty groups", () => {
    const credits: CreditsResponse = {
      cast: [{ id: 1, name: "A", character: "X" }],
      crew: [],
    };
    const groups = groupCredits(credits, emptyDetails, "movie");
    expect(groups.map((g) => g.key)).toEqual(["cast"]);
  });

  it("handles undefined credits", () => {
    expect(groupCredits(undefined, emptyDetails, "movie")).toEqual([]);
  });
});
