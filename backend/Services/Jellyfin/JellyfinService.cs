using System.Text.Json;
using backend.Models.Dtos;
using Microsoft.Extensions.Caching.Memory;

namespace backend.Services.Jellyfin
{
    /// <summary>
    /// Brokers TMDB-id → Jellyfin-item lookups. The Jellyfin API key never
    /// leaves the server except embedded in stream URLs (LAN-only tradeoff);
    /// video bytes are streamed by nginx directly from Jellyfin, never proxied
    /// through this backend.
    /// </summary>
    public class JellyfinService : IJellyfinService
    {
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private readonly ILogger<JellyfinService> _logger;
        private readonly string? _apiKey;

        // Short-lived: the library changes whenever a new rip lands, and a
        // detail-page visit shouldn't hammer Jellyfin on every render.
        private static readonly TimeSpan AvailabilityCacheDuration = TimeSpan.FromMinutes(5);

        // Direct-play codecs only — the Pi must never transcode. Sources are
        // ripped to H.264/H.265 + AAC, so Jellyfin remuxes to HLS (near-zero CPU).
        private const string HlsParams = "VideoCodec=h264,hevc&AudioCodec=aac,mp3&SegmentContainer=ts&DeviceId=cinelas-tv";

        public JellyfinService(HttpClient httpClient, IConfiguration cfg, IMemoryCache cache, ILogger<JellyfinService> logger)
        {
            _httpClient = httpClient;
            _cache = cache;
            _logger = logger;
            _apiKey = cfg["Jellyfin:ApiKey"];

            var baseUrl = cfg["Jellyfin:Url"];
            if (!string.IsNullOrWhiteSpace(baseUrl))
                _httpClient.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");

            if (IsConfigured)
                _httpClient.DefaultRequestHeaders.Add("X-Emby-Token", _apiKey);
        }

        private bool IsConfigured =>
            _httpClient.BaseAddress != null && !string.IsNullOrWhiteSpace(_apiKey);

        public Task<PlaybackDto> GetMoviePlaybackAsync(int tmdbId) =>
            GetCachedAsync($"jellyfin_movie_{tmdbId}", async () =>
            {
                var item = await FindItemByTmdbIdAsync("Movie", tmdbId);
                return item is null
                    ? PlaybackDto.NotAvailable
                    : new PlaybackDto(true, BuildHlsUrl(item.Value.ItemId, item.Value.MediaSourceId));
            });

        public Task<PlaybackDto> GetShowPlaybackAsync(int tmdbId) =>
            GetCachedAsync($"jellyfin_show_{tmdbId}", async () =>
            {
                var item = await FindItemByTmdbIdAsync("Series", tmdbId);
                return item is null ? PlaybackDto.NotAvailable : new PlaybackDto(true, null);
            });

        public Task<PlaybackDto> GetEpisodePlaybackAsync(int tmdbId, int season, int episode) =>
            GetCachedAsync($"jellyfin_episode_{tmdbId}_{season}_{episode}", async () =>
            {
                var series = await FindItemByTmdbIdAsync("Series", tmdbId);
                if (series is null) return PlaybackDto.NotAvailable;

                var json = await GetJsonAsync(
                    $"Shows/{series.Value.ItemId}/Episodes?season={season}&Fields=MediaSources");
                if (json is null) return PlaybackDto.NotAvailable;

                using var doc = JsonDocument.Parse(json);
                foreach (var ep in doc.RootElement.GetProperty("Items").EnumerateArray())
                {
                    if (ep.TryGetProperty("IndexNumber", out var index) &&
                        index.ValueKind == JsonValueKind.Number &&
                        index.GetInt32() == episode)
                    {
                        var itemId = ep.GetProperty("Id").GetString()!;
                        return new PlaybackDto(true, BuildHlsUrl(itemId, GetMediaSourceId(ep)));
                    }
                }
                return PlaybackDto.NotAvailable;
            });

        private async Task<PlaybackDto> GetCachedAsync(string cacheKey, Func<Task<PlaybackDto>> factory)
        {
            if (!IsConfigured)
                return PlaybackDto.NotAvailable;

            if (_cache.TryGetValue(cacheKey, out PlaybackDto? cached) && cached is not null)
                return cached;

            var result = await factory();
            _cache.Set(cacheKey, result, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = AvailabilityCacheDuration
            });
            return result;
        }

        private async Task<(string ItemId, string? MediaSourceId)?> FindItemByTmdbIdAsync(string itemType, int tmdbId)
        {
            // This Jellyfin version silently ignores AnyProviderIdEquals and
            // returns the whole library, so the TMDB id must be re-checked here.
            var json = await GetJsonAsync(
                $"Items?AnyProviderIdEquals=Tmdb.{tmdbId}&IncludeItemTypes={itemType}&Recursive=true&Fields=MediaSources,ProviderIds&EnableImages=false");
            if (json is null) return null;

            using var doc = JsonDocument.Parse(json);
            foreach (var item in doc.RootElement.GetProperty("Items").EnumerateArray())
            {
                if (GetTmdbProviderId(item) == tmdbId)
                    return (item.GetProperty("Id").GetString()!, GetMediaSourceId(item));
            }
            return null;
        }

        private static int? GetTmdbProviderId(JsonElement item)
        {
            if (item.TryGetProperty("ProviderIds", out var ids) &&
                ids.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in ids.EnumerateObject())
                {
                    if (prop.Name.Equals("Tmdb", StringComparison.OrdinalIgnoreCase) &&
                        int.TryParse(prop.Value.GetString(), out var id))
                    {
                        return id;
                    }
                }
            }
            return null;
        }

        private static string? GetMediaSourceId(JsonElement item)
        {
            if (item.TryGetProperty("MediaSources", out var sources) &&
                sources.ValueKind == JsonValueKind.Array &&
                sources.GetArrayLength() > 0)
            {
                return sources[0].GetProperty("Id").GetString();
            }
            return null;
        }

        private string BuildHlsUrl(string itemId, string? mediaSourceId)
        {
            var url = $"/jellyfin/Videos/{itemId}/master.m3u8?{HlsParams}&api_key={_apiKey}";
            if (mediaSourceId is not null)
                url += $"&MediaSourceId={mediaSourceId}";
            return url;
        }

        private async Task<string?> GetJsonAsync(string relativeUrl)
        {
            try
            {
                var response = await _httpClient.GetAsync(relativeUrl);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Jellyfin API returned {StatusCode} for {Url}", response.StatusCode, relativeUrl);
                    return null;
                }
                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                // Jellyfin down ≠ Cinelas down: detail pages still render, Play buttons hide.
                _logger.LogWarning(ex, "Jellyfin unreachable for {Url}", relativeUrl);
                return null;
            }
        }
    }
}
