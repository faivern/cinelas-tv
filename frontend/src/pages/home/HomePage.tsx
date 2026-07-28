import { useState } from "react";
import { Helmet } from 'react-helmet-async';
import MediaTypeToggle from "../../components/media/grid/MediaTypeToggle";
import MediaGrid from "../../components/media/grid/MediaGrid";
import HeroSection from "../../components/media/hero/HeroSection";
import GenreCardList from "../../components/media/carousel/GenreCardList";
import CollectionCarousel from "../../components/media/carousel/CollectionCarousel";
import TrendingCarousel from "../../components/media/carousel/TrendingCarousel";
import UpcomingCarousel from "../../components/media/carousel/UpcomingCarousel";
import Top10Carousel from "../../components/media/carousel/Top10Carousel";
import TvFocusRow from "../../components/media/carousel/TvFocusRow";
import TvGenreRow from "../../components/media/carousel/TvGenreRow";
import TvProviderRow from "../../components/media/carousel/TvProviderRow";
import { isTvMode } from "../../lib/tv/tvMode";
import WatchProviderCarousel from "../../components/media/carousel/WatchProviderCarousel";

import WelcomeSplash from "../../components/feedback/WelcomeSplash";

import { sumDiscoverMedia } from "../../utils/sumDiscoverMedia";
import { useTrendingMedia } from "../../hooks/trending/useTrendingMedia";
import {
  useDiscoverMovies,
  useDiscoverTv,
} from "../../hooks/discover/useDiscover";
import { useGenresWithBackdrops } from "../../hooks/genres/useGenresWithBackdrops";
import { useFeaturedCollections } from "../../hooks/collections/useCollections";
import { useUpcomingMedia } from "../../hooks/upcoming/useUpcomingMedia";
import { useTopRatedMedia } from "../../hooks/toprated/useTopRatedMedia";
import { useSortByBayesian } from "../../hooks/sorting/useSortByBayesian";
import { useSortChronological } from "../../hooks/sorting/useSortChronological";
import { featuredCollections } from "../../utils/featuredCollections";
import useMediaGrid from "../../hooks/media/useMediaGrid";
import { useWatchProvidersList } from "../../hooks/media/useWatchProvidersList";
import { usePrefetchMediaLogos } from "../../hooks/images/usePrefetchMediaLogos";
import { getDefaultCountry } from "../../components/media/RegionSelector";

// Play the TV welcome splash only once per app session.
let splashPlayed = false;

export default function HomePage() {
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [showSplash, setShowSplash] = useState(() => isTvMode() && !splashPlayed);

  const { data: featured = [], isLoading } =
    useFeaturedCollections(featuredCollections);
  const { data: trending = [], isLoading: trendingLoading } = useTrendingMedia(
    "all",
    "day"
  );
  const { data: movies, isLoading: moviesLoading } = useDiscoverMovies();
  const { data: tv, isLoading: tvLoading } = useDiscoverTv();
  const { data: genres = [], isLoading: genresLoading } = useGenresWithBackdrops();
  const { data: upcomingMovies = [], isLoading: upcomingMoviesLoading } =
    useUpcomingMedia("movie");
  const { data: upcomingTv = [], isLoading: upcomingTvLoading } =
    useUpcomingMedia("tv");
  const upcomingMoviesSorted = useSortChronological(upcomingMovies);
  const upcomingTvSorted = useSortChronological(upcomingTv);
  const { data: topMoviesRaw = [], isLoading: topMoviesLoading } =
    useTopRatedMedia("movie");
  const { data: topTvRaw = [], isLoading: topTvLoading } =
    useTopRatedMedia("tv");
  const topMovies = useSortByBayesian(topMoviesRaw);
  const topTv = useSortByBayesian(topTvRaw);

  // TV: warm the Top 10 logos (API lookup + image bytes) on landing so the
  // focused-card logo renders instantly while browsing those rows.
  usePrefetchMediaLogos("movie", topMovies.slice(0, 10));
  usePrefetchMediaLogos("tv", topTv.slice(0, 10));

  // Watch providers for the carousel
  const providerRegion = getDefaultCountry();
  const { data: watchProviders = [], isLoading: providersLoading } =
    useWatchProvidersList(providerRegion);

  // Prefetch both media types on mount — switching is instant from cache, no race condition
  const movieGrid = useMediaGrid("movie");
  const tvGrid = useMediaGrid("tv");
  const {
    data: mediaItems = [],
    isLoading: mediaLoading,
    error: mediaError,
  } = mediaType === "movie" ? movieGrid : tvGrid;

  const totalMedia = sumDiscoverMedia(movies, tv);

  // No page-wide loading gate: every row renders its own skeleton, so the
  // page appears as soon as the first data lands instead of blocking on the
  // slowest of five queries. The TV splash overlays the skeleton phase and
  // only needs the catalogue count (movies + tv) to finish its count-up.
  const splash = showSplash && (
    <WelcomeSplash
      total={totalMedia}
      ready={!moviesLoading && !tvLoading}
      onFinish={() => {
        splashPlayed = true;
        setShowSplash(false);
      }}
    />
  );

  return (
    <main className="mt-navbar-offset tv:mt-0">
      {splash}
      <Helmet>
        <title>Cinelas | Discover Where to Stream Movies & TV Shows</title>
        <meta name="description" content="Explore over 1.3 million movies and TV shows. Find where to stream, track what you've watched, and discover your next favorite." />
        <link rel="canonical" href="https://cinelas.com" />
        <meta property="og:title" content="Cinelas | Discover Where to Stream Movies & TV Shows" />
        <meta property="og:description" content="Explore over 1.3 million movies and TV shows. Find where to stream, track what you've watched, and discover your next favorite." />
        <meta property="og:url" content="https://cinelas.com" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Hero carousel - full bleed for cinematic effect */}
      <TrendingCarousel items={trending} loading={trendingLoading} />

      {/* Main content container - caps width at 2560px for ultra-wide monitors */}
      <div className="mx-auto w-full max-w-screen-4xl">
        {!isTvMode() && <HeroSection total_results={totalMedia} />}
        {isTvMode() ? (
          <>
            {/* TV: one row per media type replaces the toggle + grid */}
            <TvFocusRow
              media_type="movie"
              items={movieGrid.data ?? []}
              loading={movieGrid.isLoading}
              error={movieGrid.error?.message ?? null}
            />
            <TvFocusRow
              media_type="tv"
              items={tvGrid.data ?? []}
              loading={tvGrid.isLoading}
              error={tvGrid.error?.message ?? null}
            />
          </>
        ) : (
          <>
            <MediaTypeToggle selectedType={mediaType} onToggle={setMediaType} />
            <MediaGrid
              key={mediaType}
              media_type={mediaType}
              items={mediaItems}
              loading={mediaLoading}
              error={mediaError?.message ?? null}
            />
          </>
        )}
        {isTvMode() ? (
          <>
            <TvFocusRow
              media_type="movie"
              items={topMovies.slice(0, 10)}
              loading={topMoviesLoading}
              title="Top 10 Movies"
              showRank
            />
            <TvFocusRow
              media_type="tv"
              items={topTv.slice(0, 10)}
              loading={topTvLoading}
              title="Top 10 TV Shows"
              showRank
            />
          </>
        ) : (
          <Top10Carousel
            items={mediaType === "movie" ? topMovies : topTv}
            loading={mediaType === "movie" ? topMoviesLoading : topTvLoading}
            mediaType={mediaType}
          />
        )}
        {isTvMode() ? (
          <TvGenreRow genres={genres} loading={genresLoading} />
        ) : (
          <GenreCardList genres={genres} />
        )}
        {isTvMode() ? (
          <TvProviderRow
            providers={watchProviders}
            loading={providersLoading}
            region={providerRegion}
          />
        ) : (
          <WatchProviderCarousel
            providers={watchProviders}
            loading={providersLoading}
            region={providerRegion}
          />
        )}
        {isTvMode() ? (
          <>
            <TvFocusRow
              variant="collection"
              items={featured}
              loading={isLoading}
              title="Collections"
            />
            <TvFocusRow
              media_type="movie"
              items={upcomingMoviesSorted}
              loading={upcomingMoviesLoading}
              title="Upcoming Movies"
            />
            <TvFocusRow
              media_type="tv"
              items={upcomingTvSorted}
              loading={upcomingTvLoading}
              title="Upcoming Shows"
            />
          </>
        ) : (
          <>
            <CollectionCarousel items={featured} loading={isLoading} />
            <UpcomingCarousel
              items={mediaType === "movie" ? upcomingMovies : upcomingTv}
              loading={
                mediaType === "movie" ? upcomingMoviesLoading : upcomingTvLoading
              }
              mediaType={mediaType}
            />
          </>
        )}
      </div>
    </main>
  );
}
