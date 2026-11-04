package com.echosos.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.content.ContextCompat;

public class EchoSOSBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;

        SharedPreferences preferences = context.getSharedPreferences(
            EchoSOSMonitorService.PREFERENCES,
            Context.MODE_PRIVATE
        );
        if (!preferences.getBoolean("monitorEnabled", false)) return;

        String convexSiteUrl = preferences.getString("convexSiteUrl", "");
        if (convexSiteUrl == null || convexSiteUrl.trim().isEmpty()) return;

        Intent serviceIntent = new Intent(context, EchoSOSMonitorService.class);
        serviceIntent.setAction(EchoSOSMonitorService.ACTION_START);
        serviceIntent.putExtra("convexSiteUrl", convexSiteUrl);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (RuntimeException error) {
            // Android/OEM background-start policies can still deny boot restoration.
            android.util.Log.w("EchoSOSBootReceiver", "Could not restore background monitoring", error);
        }
    }
}
