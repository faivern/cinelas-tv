using backend.Models.Dtos;

namespace backend.Services.Jellyfin
{
    public interface IJellyfinService
    {
        /// <summary>Movie playback by TMDB id. Available=false when not in the library.</summary>
        Task<PlaybackDto> GetMoviePlaybackAsync(int tmdbId);

        /// <summary>Series-level availability by TMDB id (StreamUrl is always null; episodes stream individually).</summary>
        Task<PlaybackDto> GetShowPlaybackAsync(int tmdbId);

        /// <summary>Episode playback by TMDB series id + season/episode numbers.</summary>
        Task<PlaybackDto> GetEpisodePlaybackAsync(int tmdbId, int season, int episode);
    }
}
