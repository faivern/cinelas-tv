import { api } from "../api/http/axios";
import type { Genre, DetailMedia, MediaType } from "../types/tmdb";
import type { Paged } from "../types/common";
import { TV_GENRE_EQUIVALENTS } from "../utils/genreMap";

//todo getgenrediscoverbygenreid
export async function getMovieGenres() {
  const { data } = await api.get<{ genres: Genre[] }>(
    "/api/Movies/genre/movie/list"
  );
  return data.genres;
}

export async function getTvGenres() {
  const { data } = await api.get<{ genres: Genre[] }>(
    "/api/Movies/genre/tv/list"
  );
  return data.genres;
}

export async function getDiscoverGenre(params: {
  page?: number;
  mediaType?: MediaType;
  genreId: number;
  sortBy?: string;
}): Promise<Paged<DetailMedia>> {
  const endpoint = "/api/discover/by-genre";
  const genreId =
    params.mediaType === "tv"
      ? TV_GENRE_EQUIVALENTS[params.genreId] ?? params.genreId
      : params.genreId;
  const { data } = await api.get<Paged<DetailMedia>>(endpoint, {
    params: { ...params, genreId },
  });
  return data;
}
