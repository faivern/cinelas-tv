import { api } from "./http/axios";

type GetOpts = { signal?: AbortSignal };

/**
 * Backend-brokered Jellyfin availability. The frontend never talks to
 * Jellyfin's API — it just renders availability and plays the returned
 * (nginx-proxied) stream URL.
 */
export type Playback = {
  available: boolean;
  streamUrl: string | null;
};

export async function getMoviePlayback(
  tmdbId: number,
  opts: GetOpts = {},
): Promise<Playback> {
  const { data } = await api.get<Playback>(`/api/movies/${tmdbId}/playback`, opts);
  return data;
}

export async function getShowPlayback(
  tmdbId: number,
  opts: GetOpts = {},
): Promise<Playback> {
  const { data } = await api.get<Playback>(`/api/tv/${tmdbId}/playback`, opts);
  return data;
}

export async function getEpisodePlayback(
  tmdbId: number,
  season: number,
  episode: number,
  opts: GetOpts = {},
): Promise<Playback> {
  const { data } = await api.get<Playback>(
    `/api/tv/${tmdbId}/season/${season}/episode/${episode}/playback`,
    opts,
  );
  return data;
}
