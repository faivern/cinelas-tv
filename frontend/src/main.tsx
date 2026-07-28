import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import "../src/api/http/interceptors.ts"
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { initTvMode } from "./lib/tv/tvMode";
import { initSpatialNavigation } from "./lib/tv/spatialNavigation";
import { initTvBackButton } from "./lib/tv/backButton";
import { isNetworkError } from "./lib/connection/serverStatus";

initTvMode();
initSpatialNavigation();
initTvBackButton();

// TMDB catalogue data barely changes mid-session; without a default staleTime
// every remount (e.g. navigating back to home) refires every query through
// the backend — slow on the Pi/Chromecast path. Hooks with their own
// staleTime (logos, details) keep their longer windows.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      // One fast retry for network blips only; HTTP errors (4xx/5xx from the
      // backend itself) fail immediately. Hooks with their own retry override.
      retry: (failureCount, error) =>
        isNetworkError(error) && failureCount < 1,
      retryDelay: 1000,
    },
  },
});
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
