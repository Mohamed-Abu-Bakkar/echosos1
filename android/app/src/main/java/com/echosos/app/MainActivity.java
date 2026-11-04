package com.echosos.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(EchoSOSMonitorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
