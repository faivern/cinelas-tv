/**
 * Remote-control BACK handling for the Android TV (Capacitor) build.
 *
 * Capacitor 8 core no longer intercepts the hardware back button — without
 * the @capacitor/app plugin, BACK finishes the activity from any screen.
 * Standard TV behavior instead: step back through in-app history, and only
 * exit the app when pressed on the history root (the home screen).
 */
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function initTvBackButton(): void {
  if (!Capacitor.isNativePlatform()) return;

  App.addListener('backButton', ({ canGoBack }) => {
    // An open dialog should swallow BACK: synthesize Escape so Headless UI
    // closes it instead of navigating away underneath it.
    const dialog = document.querySelector('[role="dialog"], [aria-modal="true"]');
    if (dialog) {
      (document.activeElement ?? document.body).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      return;
    }

    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });
}
