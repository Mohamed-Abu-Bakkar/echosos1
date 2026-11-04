package com.echosos.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(
    name = "EchoSOSMonitor",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            }
        ),
        @Permission(
            alias = "legacyLocation",
            strings = { Manifest.permission.ACCESS_FINE_LOCATION }
        ),
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class EchoSOSMonitorPlugin extends Plugin {
    private BroadcastReceiver monitorReceiver;

    @Override
    public void load() {
        super.load();
        monitorReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (EchoSOSMonitorService.ACTION_BEACON_DETECTED.equals(action)) {
                    JSObject payload = new JSObject();
                    payload.put("name", intent.getStringExtra("name"));
                    payload.put("mac", intent.getStringExtra("mac"));
                    payload.put("beaconId", intent.getStringExtra("beaconId"));
                    payload.put("eventId", intent.getStringExtra("eventId"));
                    payload.put("mode", intent.getStringExtra("mode"));
                    payload.put("rssi", intent.getIntExtra("rssi", 0));
                    payload.put("available", intent.getBooleanExtra("available", false));
                    notifyListeners("beaconDetected", payload);
                } else if (EchoSOSMonitorService.ACTION_SOS_REPORTED.equals(action)) {
                    JSObject payload = new JSObject();
                    payload.put("beaconId", intent.getStringExtra("beaconId"));
                    payload.put("eventId", intent.getStringExtra("eventId"));
                    notifyListeners("sosReported", payload);
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(EchoSOSMonitorService.ACTION_BEACON_DETECTED);
        filter.addAction(EchoSOSMonitorService.ACTION_SOS_REPORTED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(monitorReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(monitorReceiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (monitorReceiver != null) {
            try {
                getContext().unregisterReceiver(monitorReceiver);
            } catch (IllegalArgumentException ignored) {}
            monitorReceiver = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void requestMonitorPermissions(PluginCall call) {
        java.util.ArrayList<String> aliases = new java.util.ArrayList<>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            aliases.add("bluetooth");
            aliases.add("location");
        } else {
            aliases.add("legacyLocation");
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) aliases.add("notifications");
        requestPermissionForAliases(aliases.toArray(new String[0]), call, "permissionsResult");
    }

    @PermissionCallback
    private void permissionsResult(PluginCall call) {
        boolean bluetoothGranted = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            ? getPermissionState("bluetooth") == PermissionState.GRANTED
            : getPermissionState("legacyLocation") == PermissionState.GRANTED;
        boolean locationGranted = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            ? getPermissionState("location") == PermissionState.GRANTED
            : getPermissionState("legacyLocation") == PermissionState.GRANTED;
        boolean notificationsGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || getPermissionState("notifications") == PermissionState.GRANTED;

        JSObject result = new JSObject();
        result.put("bluetoothGranted", bluetoothGranted);
        result.put("locationGranted", locationGranted);
        result.put("notificationsGranted", notificationsGranted);
        call.resolve(result);
    }

    @PluginMethod
    public void startMonitoring(PluginCall call) {
        String convexSiteUrl = call.getString("convexSiteUrl");
        if (convexSiteUrl == null || convexSiteUrl.trim().isEmpty()) {
            call.reject("NEXT_PUBLIC_CONVEX_URL is required to report SOS events");
            return;
        }

        boolean bluetoothGranted;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            bluetoothGranted =
                ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
        } else {
            bluetoothGranted =
                ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }
        if (!bluetoothGranted) {
            call.reject("Bluetooth permission is required for background monitoring");
            return;
        }

        Intent intent = new Intent(getContext(), EchoSOSMonitorService.class);
        intent.setAction(EchoSOSMonitorService.ACTION_START);
        intent.putExtra("convexSiteUrl", convexSiteUrl.trim().replaceAll("/+$", ""));
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(getContext(), intent);
            } else {
                getContext().startService(intent);
            }
            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Could not start Android background monitoring", error);
        }
    }

    @PluginMethod
    public void getNotificationOptions(PluginCall call) {
        android.content.SharedPreferences preferences =
            getContext().getSharedPreferences(EchoSOSMonitorService.PREFERENCES, Context.MODE_PRIVATE);
        JSObject result = new JSObject();
        result.put("showBluetoothStatus", preferences.getBoolean("showBluetoothStatus", true));
        result.put("showBeaconStatus", preferences.getBoolean("showBeaconStatus", true));
        result.put("showLastDetection", preferences.getBoolean("showLastDetection", true));
        result.put("showLastSosEvent", preferences.getBoolean("showLastSosEvent", true));
        call.resolve(result);
    }

    @PluginMethod
    public void updateNotificationOptions(PluginCall call) {
        android.content.SharedPreferences preferences =
            getContext().getSharedPreferences(EchoSOSMonitorService.PREFERENCES, Context.MODE_PRIVATE);
        android.content.SharedPreferences.Editor editor = preferences.edit();
        copyBoolean(call, editor, "showBluetoothStatus");
        copyBoolean(call, editor, "showBeaconStatus");
        copyBoolean(call, editor, "showLastDetection");
        copyBoolean(call, editor, "showLastSosEvent");
        editor.apply();

        if (preferences.getBoolean("monitorEnabled", false)) {
            Intent intent = new Intent(getContext(), EchoSOSMonitorService.class);
            intent.setAction(EchoSOSMonitorService.ACTION_UPDATE_NOTIFICATION);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(getContext(), intent);
            } else {
                getContext().startService(intent);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void stopMonitoring(PluginCall call) {
        android.content.SharedPreferences preferences =
            getContext().getSharedPreferences(EchoSOSMonitorService.PREFERENCES, Context.MODE_PRIVATE);
        preferences.edit().putBoolean("monitorEnabled", false).apply();
        getContext().stopService(new Intent(getContext(), EchoSOSMonitorService.class));
        call.resolve();
    }

    private void copyBoolean(
        PluginCall call,
        android.content.SharedPreferences.Editor editor,
        String key
    ) {
        Boolean value = call.getBoolean(key);
        if (value != null) editor.putBoolean(key, value);
    }
}
