package com.echosos.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.echosos.app.EchoSmsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(EchoSmsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
