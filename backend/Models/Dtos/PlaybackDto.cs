namespace backend.Models.Dtos
{
    /// <summary>
    /// What the frontend needs to render a Play button: whether the item exists
    /// in the Jellyfin library and, if so, the nginx-proxied stream URL.
    /// </summary>
    public record PlaybackDto(bool Available, string? StreamUrl)
    {
        public static readonly PlaybackDto NotAvailable = new(false, null);
    }
}
