import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "../../test/queryWrapper";

vi.mock("../../api/genres.api", () => ({
  getMovieGenres: vi.fn(),
  getTvGenres: vi.fn(),
}));

import { getMovieGenres, getTvGenres } from "../../api/genres.api";
import { useGenres } from "./useGenres";

describe("useGenres", () => {
  it("merges movie and TV genres with supported media types", async () => {
    vi.mocked(getMovieGenres).mockResolvedValue([{ id: 28, name: "Action" }, { id: 18, name: "Drama" }]);
    vi.mocked(getTvGenres).mockResolvedValue([{ id: 18, name: "Drama" }, { id: 10765, name: "Sci-Fi & Fantasy" }]);
    const { result } = renderHook(() => useGenres(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
    const drama = result.current.data?.find(g => g.id === 18);
    expect(drama?.supportedMediaTypes).toEqual(["movie", "tv"]);
    const action = result.current.data?.find(g => g.id === 28);
    expect(action?.supportedMediaTypes).toEqual(["movie"]);
    // 10765 "Sci-Fi & Fantasy" folds into the movie sci-fi genre (878) as "Sci-Fi"
    const sciFi = result.current.data?.find(g => g.id === 878);
    expect(sciFi?.name).toBe("Sci-Fi");
    expect(sciFi?.supportedMediaTypes).toEqual(["tv"]);
    expect(result.current.data?.find(g => g.id === 10765)).toBeUndefined();
  });

  it("folds split TV genre ids into their movie counterpart", async () => {
    vi.mocked(getMovieGenres).mockResolvedValue([
      { id: 28, name: "Action" },
      { id: 878, name: "Science Fiction" },
    ]);
    vi.mocked(getTvGenres).mockResolvedValue([
      { id: 10759, name: "Action & Adventure" },
      { id: 10765, name: "Sci-Fi & Fantasy" },
    ]);
    const { result } = renderHook(() => useGenres(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    const action = result.current.data?.find(g => g.id === 28);
    expect(action?.name).toBe("Action");
    expect(action?.supportedMediaTypes).toEqual(["movie", "tv"]);
    const sciFi = result.current.data?.find(g => g.id === 878);
    expect(sciFi?.name).toBe("Sci-Fi");
    expect(sciFi?.supportedMediaTypes).toEqual(["movie", "tv"]);
  });
});
