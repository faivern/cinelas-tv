using backend.Models.Entities;
using backend.Models.Options;
using backend.Data;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;

namespace backend.Configuration
{
    public static class AuthConfiguration
    {
        private const int MainCookieExpiryDays = 30;

        public static IServiceCollection AddAuthServices(
            this IServiceCollection services,
            IConfiguration configuration,
            IWebHostEnvironment environment)
        {
            services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));

            // Persist Data Protection keys so the auth cookie survives app restarts.
            // Use /keys in Docker (volume-mounted), otherwise .keys locally.
            var keysDir = Directory.Exists("/keys")
                ? "/keys"
                : Path.Combine(environment.ContentRootPath, ".keys");
            services.AddDataProtection()
                .PersistKeysToFileSystem(new DirectoryInfo(keysDir))
                .SetApplicationName("Cinelas");

            // On the LAN/TV the frontend is plain HTTP, so a Secure cookie would be
            // dropped by the browser. Only require Secure when the frontend is HTTPS.
            var frontendUrl = configuration["FrontendUrl"] ?? "http://localhost:5173";
            var isFrontendHttps = frontendUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
            var requireSecureCookies = !environment.IsDevelopment() || isFrontendHttps;

            var cookieSameSite = requireSecureCookies ? SameSiteMode.None : SameSiteMode.Lax;
            var cookieSecurePolicy = requireSecureCookies
                ? CookieSecurePolicy.Always
                : CookieSecurePolicy.SameAsRequest;

            services.AddIdentityCore<AppUser>()
                .AddEntityFrameworkStores<AppDbContext>()
                .AddSignInManager();

            services.AddAuthentication(options =>
            {
                options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            })
            .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, o =>
            {
                o.Cookie.Name = "CinelasAuth";
                o.Cookie.HttpOnly = true;
                o.Cookie.SecurePolicy = cookieSecurePolicy;
                o.Cookie.SameSite = cookieSameSite;
                o.Cookie.MaxAge = TimeSpan.FromDays(MainCookieExpiryDays);
                o.Events = new CookieAuthenticationEvents
                {
                    OnRedirectToLogin = ctx =>
                    {
                        ctx.Response.StatusCode = 401;
                        return Task.CompletedTask;
                    }
                };
            });

            services.AddAuthorization();

            return services;
        }
    }
}
