/**
 * Bridge to the native NavSounds Capacitor plugin, which plays the Android
 * system navigation clicks (same sounds as the stock Google TV launcher).
 * No-op outside the native APK, so the web/`?tv=1` preview stays silent.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

export type NavSoundType = 'up' | 'down' | 'left' | 'right' | 'click';

interface NavSoundsPlugin {
  play(options: { type: NavSoundType }): Promise<void>;
}

const NavSounds = registerPlugin<NavSoundsPlugin>('NavSounds');

export function playNavSound(type: NavSoundType): void {
  if (!Capacitor.isNativePlatform()) return;
  NavSounds.play({ type }).catch(() => {});
}
