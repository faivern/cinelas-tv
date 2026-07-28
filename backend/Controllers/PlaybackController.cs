using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using backend.Services.Jellyfin;

namespace backend.Controllers
{
    [ApiController]
    [Route("api")]
    [EnableRateLimiting("standard")]
    public class PlaybackController : ControllerBase
    {
        private readonly IJellyfinService _jellyfinService;

        public PlaybackController(IJellyfinService jellyfinService)
        {
            _jellyfinService = jellyfinService;
        }

        [HttpGet("movies/{tmdbId:int}/playback")]
        public async Task<IActionResult> GetMoviePlayback(int tmdbId)
        {
            return Ok(await _jellyfinService.GetMoviePlaybackAsync(tmdbId));
        }

        [HttpGet("tv/{tmdbId:int}/playback")]
        public async Task<IActionResult> GetShowPlayback(int tmdbId)
        {
            return Ok(await _jellyfinService.GetShowPlaybackAsync(tmdbId));
        }

        [HttpGet("tv/{tmdbId:int}/season/{season:int}/episode/{episode:int}/playback")]
        public async Task<IActionResult> GetEpisodePlayback(int tmdbId, int season, int episode)
        {
            return Ok(await _jellyfinService.GetEpisodePlaybackAsync(tmdbId, season, episode));
        }
    }
}
