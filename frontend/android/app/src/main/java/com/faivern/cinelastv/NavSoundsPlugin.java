package com.faivern.cinelastv;

import android.view.SoundEffectConstants;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Plays the Android system navigation sounds (the same clicks the stock Google
 * TV launcher makes). DOM focus moves inside the WebView are invisible to the
 * native view system, so the JS spatial-navigation engine calls this instead.
 * playSoundEffect() is a no-op when system sound effects are disabled in the
 * device settings, so no extra checks are needed.
 */
@CapacitorPlugin(name = "NavSounds")
public class NavSoundsPlugin extends Plugin {

    @PluginMethod
    public void play(PluginCall call) {
        String type = call.getString("type", "click");
        final int effect;
        switch (type) {
            case "up":
                effect = SoundEffectConstants.NAVIGATION_UP;
                break;
            case "down":
                effect = SoundEffectConstants.NAVIGATION_DOWN;
                break;
            case "left":
                effect = SoundEffectConstants.NAVIGATION_LEFT;
                break;
            case "right":
                effect = SoundEffectConstants.NAVIGATION_RIGHT;
                break;
            default:
                effect = SoundEffectConstants.CLICK;
                break;
        }
        bridge.getActivity().runOnUiThread(() -> bridge.getWebView().playSoundEffect(effect));
        call.resolve();
    }
}
