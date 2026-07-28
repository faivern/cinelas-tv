/**
 * Routes cinelastv:// deep links (Watch Next row clicks) into React Router.
 * Format: cinelastv://movie/603 -> /movie/603 (host = media type, path = id).
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

function toPath(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'cinelastv:') return null;
    return `/${url.host}${url.pathname}`;
  } catch {
    return null;
  }
}

export function useDeepLinks(): void {
  const navigate = useNavigate();
  // useNavigate returns a new identity on every navigation; go through a ref
  // so the effect below mounts exactly once. Re-running it would call
  // getLaunchUrl() again and snap the app back to the original launch URL.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const launchHandled = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Warm start: singleTask -> onNewIntent -> appUrlOpen.
    const sub = App.addListener('appUrlOpen', ({ url }) => {
      const path = toPath(url);
      if (path) navigateRef.current(path);
    });

    // Cold start: the intent arrives before the remote bundle has loaded any
    // JS listeners, so the launch URL must be pulled explicitly — once.
    if (!launchHandled.current) {
      launchHandled.current = true;
      App.getLaunchUrl().then((result) => {
        const path = result?.url ? toPath(result.url) : null;
        if (path) navigateRef.current(path);
      });
    }

    return () => {
      sub.then((handle) => handle.remove());
    };
  }, []);
}
