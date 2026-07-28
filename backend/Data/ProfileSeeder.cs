using backend.Models.Entities;
using backend.Models.Options;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace backend.Data
{
    // Seeds the initial set of profiles from config into the AppUser table. The
    // table is the runtime source of truth (profiles can be created/renamed from
    // the TV), so seeding only creates missing config profiles and never
    // overwrites an existing one — otherwise a rename would be reverted on every
    // restart. Each config profile keeps its stable Id so lists and media entries
    // stay attached across restarts.
    public static class ProfileSeeder
    {
        public static async Task SeedAsync(IServiceProvider services)
        {
            var options = services.GetRequiredService<IOptions<AuthOptions>>().Value;
            var userManager = services.GetRequiredService<UserManager<AppUser>>();

            foreach (var profile in options.Profiles)
            {
                if (string.IsNullOrWhiteSpace(profile.Id))
                    continue;

                var user = await userManager.FindByIdAsync(profile.Id);
                if (user is null)
                {
                    user = new AppUser
                    {
                        Id = profile.Id,
                        UserName = profile.Id,
                        DisplayName = profile.Name,
                        AvatarUrl = profile.AvatarUrl
                    };
                    await userManager.CreateAsync(user);
                }
            }
        }
    }
}
