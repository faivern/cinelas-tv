/// <reference types="vitest" />
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// error.html is loaded via Capacitor's errorPath when the server is down, and
// the local server refuses sibling requests like ./server.json — so the server
// URL must be baked into the page at build time.
function stampErrorPage(): Plugin {
  return {
    name: 'stamp-error-page',
    apply: 'build',
    closeBundle() {
      const { url } = JSON.parse(
        readFileSync(resolve(__dirname, 'public/server.json'), 'utf8'),
      )
      const page = resolve(__dirname, 'dist/error.html')
      writeFileSync(
        page,
        readFileSync(page, 'utf8').replace('__CINELAS_SERVER_URL__', url),
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stampErrorPage()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
  server: {
    // Local dev against the self-host docker stack: the backend container
    // publishes 8081 and only allows CORS from :8080, so proxy /api through
    // the dev server origin instead.
    proxy: {
      '/api': 'http://localhost:8081',
    },
    // Pre-transform entry files at startup so the first browser request is
    // served from cache instead of triggering on-demand compilation of the
    // entire module graph (244 TS files) over the slow Windows/WSL2 bind mount.
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx'],
    },
    // Explicit polling watcher for Windows/WSL2 bind mounts where inotify
    // events don't cross the filesystem boundary. Interval kept at 1s to
    // balance HMR responsiveness against CPU overhead from polling.
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
})
