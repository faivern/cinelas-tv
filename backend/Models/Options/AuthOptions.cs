namespace backend.Models.Options
{
    // The fixed set of profiles for this TV. Each profile maps 1:1 to a seeded
    // AppUser row, so all list/media data scopes per-profile for free.
    public class AuthOptions
    {
        public const string SectionName = "Auth";

        public List<ProfileOption> Profiles { get; set; } = new();
    }

    public class ProfileOption
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string? AvatarUrl { get; set; }
    }
}
