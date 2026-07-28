/**
 * "All streaming services" page for the TV build. A wrapping grid of
 * provider tiles with D-pad focus, replacing the web page's region
 * dropdown + dense grid. Region comes from the persisted selection
 * (getDefaultCountry) since the region picker is desktop-only.
 */
import { Link } from "react-router-dom";
import { getDefaultCountry } from "../../components/media/RegionSelector";
import { useWatchProvidersList } from "../../hooks/media/useWatchProvidersList";
import { providerUrl } from "../../utils/urlBuilder";
import TitleMid from "../../components/media/title/TitleMid";

const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

export default function TvProvidersPage() {
  const region = getDefaultCountry();
  const {
    data: providers = [],
    isLoading,
    isError,
  } = useWatchProvidersList(region);

  if (isLoading) {
    return (
      <main>
        <div className="h-[32vh] -mx-[var(--tv-safe-x)] -mt-[var(--tv-safe-y)] animate-pulse bg-white/5" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="flex h-[60vh] items-center justify-center">
        <p className="text-lg text-gray-300">Error loading streaming services.</p>
      </main>
    );
  }

  return (
    <main className="pb-16">
      <section className="pt-[4vh] pb-6 px-[calc(var(--tv-safe-x)+0.5rem)]">
        <TitleMid className="text-5xl">Streaming Services</TitleMid>
      </section>

      {providers.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center px-8 text-center">
          <p className="text-2xl text-white/85">
            No streaming services available in your region.
          </p>
          <p className="mt-3 text-lg text-white/60">
            Try changing your region from the desktop app.
          </p>
        </div>
      ) : (
        <div
          data-tv-row
          className="px-page grid grid-cols-6 gap-6"
        >
          {providers.map((provider) => (
            <Link
              key={provider.provider_id}
              to={`${providerUrl(provider.provider_id, provider.provider_name)}?region=${region}`}
              aria-label={provider.provider_name}
              className="flex flex-col items-center"
            >
              <div
                className="focus-ring-target aspect-square w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--component-primary)] shadow-lg"
              >
                <img
                  src={`${TMDB_IMG}${provider.logo_path}`}
                  alt={provider.provider_name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 w-full truncate text-center text-sm font-medium text-gray-300">
                {provider.provider_name}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
