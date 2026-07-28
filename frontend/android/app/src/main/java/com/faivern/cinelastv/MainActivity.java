package com.faivern.cinelastv;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NavSoundsPlugin.class);
        registerPlugin(KeepAwakePlugin.class);
        registerPlugin(WatchNextPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
