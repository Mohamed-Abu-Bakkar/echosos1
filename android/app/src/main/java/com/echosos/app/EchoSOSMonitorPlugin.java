package com.echosos.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
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

import org.json.JSONObject;

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
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class EchoSOSMonitorPlugin extends Plugin {
    private BroadcastReceiver beaconReceiver;

    @Override
    public void load() {
        super.load();
        beaconReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (!EchoSOSMonitorService.ACTION_BEACON_DETECTED.equals(intent.getAction())) return;
                JSObject payload = new JSObject();
                payload.put("name", intent.getStringExtra("name"));
                payload.put("mac", intent.getStringExtra("mac"));
                payload.put("beaconId", intent.getStringExtra("beaconId"));
                payload.put("eventId", intent.getStringExtra("eventId"));
                payload.put("mode", intent.getStringExtra("mode"));
                payload.put("rssi", intent.getIntExtra("rssi", 0));
                notifyListeners("beaconDetected", payload);
            }
        };

        IntentFilter filter = new IntentFilter(EchoSOSMonitorService.ACTION_BEACON_DETECTED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(beaconReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(beaconReceiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (beaconReceiver != null) {
            try {
                getContext().unregisterReceiver(beaconReceiver);
            } catch (IllegalArgumentException ignored) {}
            beaconReceiver = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void requestMonitorPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                requestPermissionForAliases(new String[] {"bluetooth", "notifications"}, call, "permissionsResult");
            } else {
                requestPermissionForAliases(new String[] {"bluetooth"}, call, "permissionsResult");
            }
        } else {
            requestPermissionForAliases(new String[] {"legacyLocation"}, call, "permissionsResult");
        }
    }

    @PermissionCallback
    private void permissionsResult(PluginCall call) {
        JSObject result = new JSObject();
        boolean bluetoothGranted;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            bluetoothGranted = getPermissionState("bluetooth") == PermissionState.GRANTED;
        } else {
            bluetoothGranted = getPermissionState("legacyLocation") == PermissionState.GRANTED;
        }
        boolean notificationsGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || getPermissionState("notifications") == PermissionState.GRANTED;
        result.put("bluetoothGranted", bluetoothGranted);
        result.put("notificationsGranted", notificationsGranted);
        call.resolve(result);
    }

    @PluginMethod
    public void startMonitoring(PluginCall call) {
        String convexUrl = call.getString("convexUrl");
        if (convexUrl == null || convexUrl.trim().isEmpty()) {
            call.reject("NEXT_PUBLIC_CONVEX_URL is required to report SOS events");
            return;
        }

        boolean bluetoothGranted = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            ? ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) == android.content.pm.PackageManager.PERMISSION_GRANTED
            : ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        if (!bluetoothGranted) {
            call.reject("Bluetooth permission is required for background monitoring");
            return;
        }

        Intent intent = new Intent(getContext(), EchoSOSMonitorService.class);
        intent.setAction(EchoSOSMonitorService.ACTION_START);
        intent.putExtra("convexUrl", convexUrl.trim().replaceAll("/+$", ""));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(getContext(), intent);
        } else {
            getContext().startService(intent);
        }
        JSObject result = new JSObject();
        result.put("started", true);
        call.resolve(result);
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

        Intent intent = new Intent(getContext(), EchoSOSMonitorService.class);
        intent.setAction(EchoSOSMonitorService.ACTION_UPDATE_NOTIFICATION);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void stopMonitoring(PluginCall call) {
        getContext().stopService(new Intent(getContext(), EchoSOSMonitorService.class));
        call.resolve();
    }

    private void copyBoolean(PluginCall call, android.content.SharedPreferences.Editor editor, String key) {
        Boolean value = call.getBoolean(key);
        if (value != null) editor.putBoolean(key, value);
    }
}
