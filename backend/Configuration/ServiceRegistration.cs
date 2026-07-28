using backend.BackgroundJobs;
using backend.Data;
using backend.Services;
using backend.Services.Jellyfin;
using backend.Services.Tmdb;
using Microsoft.EntityFrameworkCore;

namespace backend.Configuration
{
    public static class ServiceRegistration
    {
        public static IServiceCollection AddApplicationServices(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            services.AddMemoryCache();
            services.AddHttpClient<ITmdbService, TmdbService>();
            services.AddHttpClient<IJellyfinService, JellyfinService>();
            services.AddScoped<IListService, ListService>();
            services.AddScoped<IMediaEntryService, MediaEntryService>();
            services.AddHostedService<TmdbRefreshBackgroundService>();

            services.AddDbContext<AppDbContext>(o =>
                o.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

            return services;
        }
    }
}
