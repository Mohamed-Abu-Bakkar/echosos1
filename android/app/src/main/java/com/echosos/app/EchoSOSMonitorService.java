package com.echosos.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.SparseArray;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class EchoSOSMonitorService extends Service {
    public static final String PREFERENCES = "echosos_monitor";
    public static final String ACTION_START = "com.echosos.app.monitor.START";
    public static final String ACTION_STOP = "com.echosos.app.monitor.STOP";
    public static final String ACTION_UPDATE_NOTIFICATION = "com.echosos.app.monitor.UPDATE_NOTIFICATION";
    public static final String ACTION_BEACON_DETECTED = "com.echosos.app.monitor.BEACON_DETECTED";
    public static final String ACTION_SOS_REPORTED = "com.echosos.app.monitor.SOS_REPORTED";

    private static final String CHANNEL_ID = "echosos_background_monitor";
    private static final int NOTIFICATION_ID = 4102;
    private static final int ECHOSOS_COMPANY_ID = 0xE505;

    private SharedPreferences preferences;
    private BluetoothLeScanner scanner;
    private ScanCallback scanCallback;
    private String convexSiteUrl = "";
    private String bluetoothStatus = "Checking Bluetooth";
    private String beaconStatus = "Waiting for EchoSOS beacon";
    private String lastSosEvent = "No SOS event detected";
    private long lastDetectionAt = 0L;
    private long lastDispatchAttemptAt = 0L;
    private long lastNotificationUpdateAt = 0L;
    private String dispatchingEventId = "";

    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable scanRetry = () -> {
        if (scanCallback == null && isMonitoringEnabled()) startBleScan();
    };

    private final BroadcastReceiver bluetoothStateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!BluetoothAdapter.ACTION_STATE_CHANGED.equals(intent.getAction())) return;
            int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
            if (state == BluetoothAdapter.STATE_OFF || state == BluetoothAdapter.STATE_TURNING_OFF) {
                stopBleScan();
                bluetoothStatus = "Bluetooth is turned off";
                updateNotification(true);
            } else if (state == BluetoothAdapter.STATE_ON) {
                bluetoothStatus = "Bluetooth enabled · restarting scan";
                updateNotification(true);
                startBleScan();
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        preferences = getSharedPreferences(PREFERENCES, MODE_PRIVATE);
        convexSiteUrl = preferences.getString("convexSiteUrl", "");
        lastDetectionAt = preferences.getLong("lastDetectionAt", 0L);
        beaconStatus = preferences.getString("beaconStatus", "Waiting for EchoSOS beacon");
        lastSosEvent = preferences.getString("lastSosEvent", "No SOS event detected");
        createNotificationChannel();

        IntentFilter filter = new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(bluetoothStateReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(bluetoothStateReceiver, filter);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();

        if (ACTION_STOP.equals(action)) {
            preferences.edit().putBoolean("monitorEnabled", false).apply();
            stopBleScan();
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf(startId);
            return START_NOT_STICKY;
        }

        if (ACTION_START.equals(action)) {
            String requestedUrl = intent.getStringExtra("convexSiteUrl");
            if (requestedUrl != null && !requestedUrl.trim().isEmpty()) {
                convexSiteUrl = requestedUrl.trim();
                preferences.edit()
                    .putString("convexSiteUrl", convexSiteUrl)
                    .putBoolean("monitorEnabled", true)
                    .apply();
            }
        }

        if (!isMonitoringEnabled()) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }

        startAsForegroundService();
        if (ACTION_UPDATE_NOTIFICATION.equals(action)) {
            updateNotification(true);
        }
        startBleScan();
        return START_STICKY;
    }

    private boolean isMonitoringEnabled() {
        return preferences != null && preferences.getBoolean("monitorEnabled", false);
    }

    private void startAsForegroundService() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
            );
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "EchoSOS background monitoring",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Ongoing status for EchoSOS Bluetooth beacon monitoring");
        channel.setShowBadge(false);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    private Notification buildNotification() {
        boolean showBluetooth = preferences.getBoolean("showBluetoothStatus", true);
        boolean showBeacon = preferences.getBoolean("showBeaconStatus", true);
        boolean showLastDetection = preferences.getBoolean("showLastDetection", true);
        boolean showLastSos = preferences.getBoolean("showLastSosEvent", true);

        StringBuilder details = new StringBuilder();
        if (showBluetooth) appendLine(details, "Bluetooth: " + bluetoothStatus);
        if (showBeacon) appendLine(details, "Beacon: " + beaconStatus);
        if (showLastDetection) {
            String detected = lastDetectionAt > 0
                ? android.text.format.DateFormat.format("HH:mm:ss", lastDetectionAt).toString()
                : "Not detected yet";
            appendLine(details, "Last detection: " + detected);
        }
        if (showLastSos) appendLine(details, "Last SOS: " + lastSosEvent);
        if (details.length() == 0) details.append("Background protection is active");

        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            NOTIFICATION_ID,
            openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // There are deliberately no pause or stop actions on this notification.
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setContentTitle("EchoSOS · Background protection active")
            .setContentText(details.toString().replace("\n", " · "))
            .setStyle(new NotificationCompat.BigTextStyle().bigText(details.toString()))
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setContentIntent(contentIntent)
            .build();
    }

    private void appendLine(StringBuilder builder, String value) {
        if (builder.length() > 0) builder.append('\n');
        builder.append(value);
    }

    private void updateNotification(boolean force) {
        long now = System.currentTimeMillis();
        if (!force && now - lastNotificationUpdateAt < 1200L) return;
        lastNotificationUpdateAt = now;
        try {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification());
        } catch (SecurityException ignored) {
            // Android can hide drawer notifications when POST_NOTIFICATIONS is denied.
        }
    }

    private void startBleScan() {
        if (scanCallback != null || !isMonitoringEnabled()) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!hasPermission(Manifest.permission.BLUETOOTH_SCAN)
                || !hasPermission(Manifest.permission.BLUETOOTH_CONNECT)) {
                bluetoothStatus = "Bluetooth permission required";
                updateNotification(true);
                scheduleScanRetry();
                return;
            }
        } else if (!hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
            bluetoothStatus = "Location permission required for BLE scan";
            updateNotification(true);
            scheduleScanRetry();
            return;
        }

        try {
            BluetoothManager manager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
            BluetoothAdapter adapter = manager == null ? null : manager.getAdapter();
            if (adapter == null) {
                bluetoothStatus = "Bluetooth unavailable";
                updateNotification(true);
                scheduleScanRetry();
                return;
            }
            if (!adapter.isEnabled()) {
                bluetoothStatus = "Bluetooth is turned off";
                updateNotification(true);
                scheduleScanRetry();
                return;
            }

            scanner = adapter.getBluetoothLeScanner();
            if (scanner == null) {
                bluetoothStatus = "BLE scanner unavailable";
                updateNotification(true);
                scheduleScanRetry();
                return;
            }

            scanCallback = new ScanCallback() {
                @Override
                public void onScanResult(int callbackType, ScanResult result) {
                    handleScanResult(result);
                }

                @Override
                public void onBatchScanResults(java.util.List<ScanResult> results) {
                    for (ScanResult result : results) handleScanResult(result);
                }

                @Override
                public void onScanFailed(int errorCode) {
                    bluetoothStatus = "BLE scan failed (" + errorCode + ")";
                    scanCallback = null;
                    updateNotification(true);
                    scheduleScanRetry();
                }
            };

            scanner.startScan(scanCallback);
            mainHandler.removeCallbacks(scanRetry);
            bluetoothStatus = "Scanning";
            updateNotification(true);
        } catch (SecurityException error) {
            bluetoothStatus = "Bluetooth permission required";
            scanCallback = null;
            updateNotification(true);
            scheduleScanRetry();
        } catch (Exception error) {
            bluetoothStatus = "Scanner error: " + error.getClass().getSimpleName();
            scanCallback = null;
            updateNotification(true);
            scheduleScanRetry();
        }
    }

    private boolean hasPermission(String permission) {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED;
    }

    private void scheduleScanRetry() {
        mainHandler.removeCallbacks(scanRetry);
        mainHandler.postDelayed(scanRetry, 15000L);
    }

    private void stopBleScan() {
        if (scanner != null && scanCallback != null) {
            try {
                scanner.stopScan(scanCallback);
            } catch (SecurityException ignored) {}
        }
        scanCallback = null;
        scanner = null;
        mainHandler.removeCallbacks(scanRetry);
    }

    private void handleScanResult(ScanResult result) {
        if (result == null || result.getScanRecord() == null) return;
        BeaconPacket packet = decodePacket(result);
        if (packet == null) return;

        String macAddress = "";
        try {
            if (result.getDevice() != null) macAddress = result.getDevice().getAddress();
        } catch (SecurityException ignored) {}

        boolean shouldBroadcastBeaconEvent = true;
        if (packet.mode == 'e') {
            preferences.edit().remove("lastCancelSignalKey").apply();
            packet.eventId = ensureEmergencyEventId(packet.beaconId, packet.eventId);
        } else if (packet.mode == 'c') {
            String cancelKey = packet.beaconId + ":" + packet.eventId;
            String previousCancelKey = preferences.getString("lastCancelSignalKey", "");
            shouldBroadcastBeaconEvent = !cancelKey.equals(previousCancelKey);
            preferences.edit()
                .putString("lastCancelSignalKey", cancelKey)
                .putString("lastObservedMode", "c")
                .putString("lastObservedBeaconId", packet.beaconId)
                .remove("generatedEventId")
                .remove("generatedEventBeaconId")
                .apply();
        } else {
            preferences.edit()
                .putString("lastObservedMode", "r")
                .putString("lastObservedBeaconId", packet.beaconId)
                .remove("generatedEventId")
                .remove("generatedEventBeaconId")
                .apply();
        }

        lastDetectionAt = System.currentTimeMillis();
        String modeText = packet.mode == 'e'
            ? "SOS active"
            : packet.mode == 'c' ? "Cancel signal" : "Beacon nearby";
        beaconStatus = modeText + " · " + packet.beaconId;
        preferences.edit()
            .putLong("lastDetectionAt", lastDetectionAt)
            .putString("beaconStatus", beaconStatus)
            .apply();

        Intent broadcast = new Intent(ACTION_BEACON_DETECTED);
        broadcast.setPackage(getPackageName());
        broadcast.putExtra("name", packet.name);
        broadcast.putExtra("mac", macAddress);
        broadcast.putExtra("beaconId", packet.beaconId);
        broadcast.putExtra("eventId", packet.eventId);
        broadcast.putExtra("mode", String.valueOf(packet.mode));
        broadcast.putExtra("rssi", result.getRssi());
        broadcast.putExtra("available", true);
        if (shouldBroadcastBeaconEvent) sendBroadcast(broadcast);

        if (packet.mode == 'e') {
            if (!packet.eventId.isEmpty() && !macAddress.isEmpty()) {
                dispatchSosTelemetry(macAddress, packet.beaconId, packet.eventId, result.getRssi(), packet.batteryPercent);
            } else {
                lastSosEvent = "SOS detected · beacon identity unavailable";
            }
        } else if (packet.mode == 'c') {
            lastSosEvent = "Cancel signal seen · open app to verify";
            preferences.edit().putString("lastSosEvent", lastSosEvent).apply();
        }
        updateNotification(false);
    }

    private BeaconPacket decodePacket(ScanResult result) {
        byte[] payload = null;
        SparseArray<byte[]> manufacturerData = result.getScanRecord().getManufacturerSpecificData();
        if (manufacturerData != null) payload = manufacturerData.get(ECHOSOS_COMPANY_ID);

        if (payload != null && payload.length >= 9) {
            char mode = (char) payload[0];
            if (mode == 'r' || mode == 'e' || mode == 'c') {
                int idLength = payload.length >= 11 ? 6 : 4;
                int eventOffset = 1 + idLength;
                if (payload.length >= eventOffset + 4) {
                    BeaconPacket packet = new BeaconPacket();
                    packet.mode = mode;
                    packet.beaconId = bytesToHex(payload, 1, idLength);
                    packet.eventId = bytesToHex(payload, eventOffset, 4);
                    if ("00000000".equals(packet.eventId)) packet.eventId = "";
                    int batteryOffset = eventOffset + 4;
                    packet.batteryPercent = payload.length > batteryOffset
                        && (payload[batteryOffset] & 0xff) != 0xff
                        && (payload[batteryOffset] & 0xff) <= 100
                        ? payload[batteryOffset] & 0xff : -1;
                    packet.name = buildBeaconName(mode, packet.beaconId);
                    return packet;
                }
            }
        }

        // The deployed firmware may advertise its state in the local name.
        String advertisedName = result.getScanRecord().getDeviceName();
        if (advertisedName == null) return null;
        java.util.regex.Matcher matcher = java.util.regex.Pattern
            .compile("^EchoSOS-([rec])-([0-9a-fA-F]{1,12})$")
            .matcher(advertisedName.trim());
        if (!matcher.matches()) return null;

        BeaconPacket packet = new BeaconPacket();
        packet.mode = matcher.group(1).charAt(0);
        packet.beaconId = matcher.group(2).toLowerCase(Locale.US);
        while (packet.beaconId.length() < 12) packet.beaconId = "0" + packet.beaconId;
        packet.eventId = "";
        packet.batteryPercent = -1;
        packet.name = buildBeaconName(packet.mode, packet.beaconId);
        return packet;
    }

    private String ensureEmergencyEventId(String beaconId, String advertisedEventId) {
        if (advertisedEventId != null && !advertisedEventId.isEmpty()) {
            preferences.edit()
                .putString("lastObservedMode", "e")
                .putString("lastObservedBeaconId", beaconId)
                .apply();
            return advertisedEventId;
        }

        String lastMode = preferences.getString("lastObservedMode", "");
        String lastBeacon = preferences.getString("lastObservedBeaconId", "");
        String generatedId = preferences.getString("generatedEventId", "");
        String generatedBeacon = preferences.getString("generatedEventBeaconId", "");
        if (!"e".equals(lastMode) || !beaconId.equals(generatedBeacon) || generatedId.isEmpty()) {
            byte[] bytes = new byte[4];
            new SecureRandom().nextBytes(bytes);
            generatedId = bytesToHex(bytes, 0, bytes.length);
            preferences.edit()
                .putString("generatedEventId", generatedId)
                .putString("generatedEventBeaconId", beaconId)
                .apply();
        }
        preferences.edit()
            .putString("lastObservedMode", "e")
            .putString("lastObservedBeaconId", beaconId)
            .apply();
        return generatedId;
    }

    private String buildBeaconName(char mode, String beaconId) {
        return "EchoSOS-" + mode + "-" + beaconId;
    }

    private String bytesToHex(byte[] bytes, int offset, int length) {
        StringBuilder value = new StringBuilder(length * 2);
        for (int i = offset; i < offset + length; i++) {
            value.append(String.format(Locale.US, "%02x", bytes[i] & 0xff));
        }
        return value.toString();
    }

    private synchronized void dispatchSosTelemetry(
        String macAddress,
        String beaconId,
        String eventId,
        int rssi,
        int batteryPercent
    ) {
        String lastDispatched = preferences.getString("lastDispatchedEventId", "");
        long now = System.currentTimeMillis();
        if (eventId.equals(lastDispatched) || eventId.equals(dispatchingEventId) || now - lastDispatchAttemptAt < 10000L) return;
        if (convexSiteUrl == null || convexSiteUrl.isEmpty()) {
            lastSosEvent = "SOS detected · backend URL missing";
            updateNotification(true);
            return;
        }

        dispatchingEventId = eventId;
        lastDispatchAttemptAt = now;
        networkExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                JSONObject body = new JSONObject();
                body.put("macAddress", macAddress);
                body.put("buttonPressed", true);
                body.put("eventId", eventId);
                body.put("signalDbm", rssi);
                body.put("beaconHardwareId", beaconId);
                if (batteryPercent >= 0) body.put("batteryPercent", batteryPercent);
                addLastKnownLocation(body);

                URL url = new URL(convexSiteUrl.replaceAll("/+$", "") + "/telemetry");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }

                int status = connection.getResponseCode();
                InputStream stream = status >= 200 && status < 300
                    ? connection.getInputStream() : connection.getErrorStream();
                StringBuilder response = new StringBuilder();
                if (stream != null) {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) response.append(line);
                    }
                }
                JSONObject parsed = response.length() > 0 ? new JSONObject(response.toString()) : new JSONObject();
                boolean accepted = status >= 200 && status < 300
                    && parsed.optBoolean("success", false)
                    && parsed.optBoolean("alertTriggered", false);

                if (accepted) {
                    preferences.edit().putString("lastDispatchedEventId", eventId).apply();
                    lastSosEvent = "SOS reported · " + eventId;
                    Intent reported = new Intent(ACTION_SOS_REPORTED);
                    reported.setPackage(getPackageName());
                    reported.putExtra("beaconId", beaconId);
                    reported.putExtra("eventId", eventId);
                    sendBroadcast(reported);
                } else {
                    String reason = parsed.optString("reason", "");
                    lastSosEvent = "SOS detected · " + (reason.isEmpty() ? "backend response " + status : reason);
                }
            } catch (Exception error) {
                lastSosEvent = "SOS detected · backend unavailable";
            } finally {
                if (connection != null) connection.disconnect();
                dispatchingEventId = "";
                preferences.edit().putString("lastSosEvent", lastSosEvent).apply();
                updateNotification(true);
            }
        });
    }

    private void addLastKnownLocation(JSONObject body) {
        try {
            boolean fine = hasPermission(Manifest.permission.ACCESS_FINE_LOCATION);
            boolean coarse = hasPermission(Manifest.permission.ACCESS_COARSE_LOCATION);
            if (!fine && !coarse) return;

            LocationManager manager = (LocationManager) getSystemService(LOCATION_SERVICE);
            if (manager == null) return;
            Location best = null;
            for (String provider : manager.getProviders(true)) {
                try {
                    Location candidate = manager.getLastKnownLocation(provider);
                    if (candidate != null && (best == null || candidate.getTime() > best.getTime())) best = candidate;
                } catch (SecurityException ignored) {}
            }
            if (best != null) {
                body.put("latitude", best.getLatitude());
                body.put("longitude", best.getLongitude());
            }
        } catch (Exception ignored) {
            // GPS is best-effort; BLE SOS reporting must not fail because location is unavailable.
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Keep the foreground service alive when the activity is swiped from Recents.
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        stopBleScan();
        try {
            unregisterReceiver(bluetoothStateReceiver);
        } catch (IllegalArgumentException ignored) {}
        networkExecutor.shutdown();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private static final class BeaconPacket {
        char mode;
        String beaconId;
        String eventId;
        String name;
        int batteryPercent;
    }
}
