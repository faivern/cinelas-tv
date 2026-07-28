import { api } from "./http/axios";
import type { Paged } from "../types/common";
import type { DetailMediaGenre, MediaImagesResponse } from "../types/tmdb";
import type { MediaType, DetailMedia, SeasonDetail } from "../types/tmdb";

type GetOpts = { signal?: AbortSignal };

export type MediaGridItem = DetailMediaGenre;

/**
 * Fetch trending media for the grid (multiple pages)
 */
export async function getTrendingMediaGrid(
  mediaType: MediaType,
  timeWindow: "day" | "week" = "day",
  pages: number[] = [1, 2]
): Promise<MediaGridItem[]> {
  const endpoint = `/api/Movies/trending/${mediaType}/${timeWindow}`;

  const responses = await Promise.all(
    pages.map((page) =>
      api.get<Paged<MediaGridItem>>(endpoint, {
        params: { page },
      })
    )
  );

  return responses.flatMap((response) => response.data.results || []);
}

/**
 * Fetch detailed information for a specific media item
 */
export async function getMediaDetails(
  mediaType: MediaType,
  mediaId: number,
  opts: GetOpts = {}
): Promise<DetailMedia> {
  const endpoint = `/api/Movies/${mediaType}/${mediaId}`;
  const { data } = await api.get<DetailMedia>(endpoint, {
    signal: opts.signal,
  });
  return data;
}

/**
 * Fetch images for a specific media item.
 */
export async function getMediaImages(
  mediaType: MediaType,
  mediaId: number,
  opts: GetOpts = {}
): Promise<MediaImagesResponse> {
  const endpoint = `/api/Movies/${mediaType}/${mediaId}/images`;
  const { data } = await api.get<MediaImagesResponse>(endpoint, {
    signal: opts.signal,
  });
  return data;
}

/**
 * Fetch a single season (with its episodes) for a TV series
 */
export async function getShowSeason(
  seriesId: number,
  seasonNumber: number,
  opts: GetOpts = {}
): Promise<SeasonDetail> {
  const endpoint = `/api/Movies/tv/${seriesId}/season/${seasonNumber}`;
  const { data } = await api.get<SeasonDetail>(endpoint, {
    signal: opts.signal,
  });
  return data;
}

