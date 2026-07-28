/**
 * Bridge to the native KeepAwake Capacitor plugin (FLAG_KEEP_SCREEN_ON on the
 * activity window). No-op outside the native APK.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

interface KeepAwakePlugin {
  keepAwake(): Promise<void>;
  allowSleep(): Promise<void>;
}

const KeepAwake = registerPlugin<KeepAwakePlugin>('KeepAwake');

export function keepScreenAwake(): void {
  if (!Capacitor.isNativePlatform()) return;
  KeepAwake.keepAwake().catch(() => {});
}

export function allowScreenSleep(): void {
  if (!Capacitor.isNativePlatform()) return;
  KeepAwake.allowSleep().catch(() => {});
}
