package com.echosos.app;

import com.getcapacitor.BridgeActivity;
import com.echosos.app.EchoSmsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(EchoSmsPlugin.class);
        registerPlugin(EchoSOSMonitorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
