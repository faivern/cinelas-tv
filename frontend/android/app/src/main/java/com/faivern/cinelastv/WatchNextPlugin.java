package com.faivern.cinelastv;

import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;

import androidx.tvprovider.media.tv.TvContractCompat;
import androidx.tvprovider.media.tv.WatchNextProgram;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Publishes the user's watchlist to the Android TV "Watch Next" home-screen
 * row via the TV provider. The provider scopes queries/deletes to rows owned
 * by this package automatically.
 *
 * Google TV (vs classic Android TV) may surface WATCH_NEXT_TYPE_WATCHLIST
 * items only under the profile's watchlist area or filter them aggressively;
 * if items never appear on a real device, retry with WATCH_NEXT_TYPE_CONTINUE.
 */
@CapacitorPlugin(name = "WatchNext")
public class WatchNextPlugin extends Plugin {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private static final String[] PROJECTION = {
        TvContractCompat.WatchNextPrograms._ID,
        TvContractCompat.WatchNextPrograms.COLUMN_INTERNAL_PROVIDER_ID,
    };

    @PluginMethod
    public void setItems(PluginCall call) {
        if (Build.VERSION.SDK_INT < 26) {
            call.resolve();
            return;
        }
        JSArray items = call.getArray("items");
        if (items == null) {
            call.reject("items is required");
            return;
        }
        executor.execute(() -> {
            try {
                ContentResolver resolver = getContext().getContentResolver();
                Map<String, Long> existing = queryExisting(resolver);
                Set<String> incoming = new HashSet<>();

                for (int i = 0; i < items.length(); i++) {
                    JSObject item = JSObject.fromJSONObject(items.getJSONObject(i));
                    String id = item.getString("id");
                    if (id == null) continue;
                    incoming.add(id);

                    WatchNextProgram program = buildProgram(item, id);
                    Long rowId = existing.get(id);
                    if (rowId != null) {
                        resolver.update(
                            TvContractCompat.buildWatchNextProgramUri(rowId),
                            program.toContentValues(), null, null);
                    } else {
                        resolver.insert(
                            TvContractCompat.WatchNextPrograms.CONTENT_URI,
                            program.toContentValues());
                    }
                }

                for (Map.Entry<String, Long> entry : existing.entrySet()) {
                    if (!incoming.contains(entry.getKey())) {
                        resolver.delete(
                            TvContractCompat.buildWatchNextProgramUri(entry.getValue()),
                            null, null);
                    }
                }
                call.resolve();
            } catch (JSONException | RuntimeException e) {
                call.reject("Failed to update Watch Next row", e);
            }
        });
    }

    @PluginMethod
    public void clear(PluginCall call) {
        if (Build.VERSION.SDK_INT < 26) {
            call.resolve();
            return;
        }
        executor.execute(() -> {
            try {
                ContentResolver resolver = getContext().getContentResolver();
                for (Long rowId : queryExisting(resolver).values()) {
                    resolver.delete(
                        TvContractCompat.buildWatchNextProgramUri(rowId), null, null);
                }
                call.resolve();
            } catch (RuntimeException e) {
                call.reject("Failed to clear Watch Next row", e);
            }
        });
    }

    private static WatchNextProgram buildProgram(JSObject item, String id) {
        int type = "tv".equals(item.getString("mediaType"))
            ? TvContractCompat.PreviewPrograms.TYPE_TV_SERIES
            : TvContractCompat.PreviewPrograms.TYPE_MOVIE;
        WatchNextProgram.Builder builder = new WatchNextProgram.Builder();
        builder
            .setType(type)
            .setWatchNextType(TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_WATCHLIST)
            .setLastEngagementTimeUtcMillis(System.currentTimeMillis())
            .setTitle(item.getString("title", ""))
            .setPosterArtUri(Uri.parse(item.getString("posterUrl", "")))
            .setPosterArtAspectRatio(TvContractCompat.PreviewPrograms.ASPECT_RATIO_MOVIE_POSTER)
            .setIntentUri(Uri.parse(item.getString("deepLink", "")))
            .setInternalProviderId(id);
        return builder.build();
    }

    private Map<String, Long> queryExisting(ContentResolver resolver) {
        Map<String, Long> map = new HashMap<>();
        try (Cursor cursor = resolver.query(
                TvContractCompat.WatchNextPrograms.CONTENT_URI, PROJECTION, null, null, null)) {
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    long rowId = cursor.getLong(0);
                    String providerId = cursor.getString(1);
                    if (providerId != null) map.put(providerId, rowId);
                }
            }
        }
        return map;
    }
}
