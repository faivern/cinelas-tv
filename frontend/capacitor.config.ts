import { readFileSync } from 'fs';
import { join } from 'path';
import type { CapacitorConfig } from '@capacitor/cli';

// Single source of truth for the server URL — also fetched by public/error.html
// at runtime so the offline fallback page knows where to retry.
const { url: serverUrl } = JSON.parse(
  readFileSync(join(__dirname, 'public/server.json'), 'utf-8'),
);

const config: CapacitorConfig = {
  appId: 'com.faivern.cinelastv',
  appName: 'Cinelas TV',
  webDir: 'dist',
  server: {
    // Load the app straight from the stack's nginx so app + API share one origin —
    // no CORS, and the backend's SameSite=Lax auth cookie works. 10.0.2.2 is the
    // emulator's alias for the host; on a real device point this at the Pi's LAN IP
    // (edit public/server.json).
    url: serverUrl,
    cleartext: true,
    androidScheme: 'http',
    // Served from bundled APK assets when the remote server can't be reached.
    errorPath: 'error.html',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
