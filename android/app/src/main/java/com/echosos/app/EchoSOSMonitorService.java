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
import java.io.OutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class EchoSOSMonitorService extends Service {
    public static final String PREFERENCES = "echosos_monitor";
    public static final String ACTION_START = "com.echosos.app.monitor.START";
    public static final String ACTION_UPDATE_NOTIFICATION = "com.echosos.app.monitor.UPDATE_NOTIFICATION";
    public static final String ACTION_BEACON_DETECTED = "com.echosos.app.monitor.BEACON_DETECTED";

    private static final String CHANNEL_ID = "echosos_background_monitor";
    private static final int NOTIFICATION_ID = 4102;
    private static final int ECHOSOS_COMPANY_ID = 0xE505;

    private SharedPreferences preferences;
    private BluetoothLeScanner scanner;
    private ScanCallback scanCallback;
    private String convexUrl = "";
    private String bluetoothStatus = "Checking Bluetooth";
    private String beaconStatus = "Waiting for EchoSOS beacon";
    private String lastSosEvent = "No SOS event detected";
    private long lastDetectionAt = 0L;
    private long lastDispatchAttemptAt = 0L;
    private String dispatchingEventId = "";
    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable scanRetry = () -> {
        if (scanCallback == null) startBleScan();
    };
    private final BroadcastReceiver bluetoothStateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!BluetoothAdapter.ACTION_STATE_CHANGED.equals(intent.getAction())) return;
            int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
            if (state == BluetoothAdapter.STATE_OFF || state == BluetoothAdapter.STATE_TURNING_OFF) {
                stopBleScan();
                bluetoothStatus = "Bluetooth is turned off";
                updateNotification();
            } else if (state == BluetoothAdapter.STATE_ON) {
                bluetoothStatus = "Bluetooth enabled · restarting scan";
                updateNotification();
                startBleScan();
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        preferences = getSharedPreferences(PREFERENCES, MODE_PRIVATE);
        convexUrl = preferences.getString("convexUrl", "");
        lastDetectionAt = preferences.getLong("lastDetectionAt", 0L);
        beaconStatus = preferences.getString("beaconStatus", "Waiting for EchoSOS beacon");
        lastSosEvent = preferences.getString("lastSosEvent", "No SOS event detected");
        createNotificationChannel();
        IntentFilter bluetoothFilter = new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(bluetoothStateReceiver, bluetoothFilter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(bluetoothStateReceiver, bluetoothFilter);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_UPDATE_NOTIFICATION.equals(intent.getAction())) {
            startAsForegroundService();
            startBleScan();
            updateNotification();
            return START_STICKY;
        }

        if (intent != null && ACTION_START.equals(intent.getAction())) {
            String requestedUrl = intent.getStringExtra("convexUrl");
            if (requestedUrl != null && !requestedUrl.trim().isEmpty()) {
                convexUrl = requestedUrl.trim();
                preferences.edit().putString("convexUrl", convexUrl).apply();
            }
        }

        startAsForegroundService();
        startBleScan();
        return START_STICKY;
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
            4102,
            openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

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

    private void updateNotification() {
        try {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification());
        } catch (SecurityException ignored) {
            // Android may hide drawer notifications when POST_NOTIFICATIONS is denied.
        }
    }

    private void startBleScan() {
        if (scanCallback != null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                bluetoothStatus = "Bluetooth permission required";
                updateNotification();
                scheduleScanRetry();
                return;
            }
        } else if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            bluetoothStatus = "Location permission required for BLE scan";
            updateNotification();
            scheduleScanRetry();
            return;
        }

        try {
            BluetoothManager bluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
            BluetoothAdapter adapter = bluetoothManager != null ? bluetoothManager.getAdapter() : null;
            if (adapter == null) {
                bluetoothStatus = "Bluetooth unavailable";
                updateNotification();
                scheduleScanRetry();
                return;
            }
            if (!adapter.isEnabled()) {
                bluetoothStatus = "Bluetooth is turned off";
                updateNotification();
                scheduleScanRetry();
                return;
            }

            scanner = adapter.getBluetoothLeScanner();
            if (scanner == null) {
                bluetoothStatus = "BLE scanner unavailable";
                updateNotification();
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
                    updateNotification();
                    scheduleScanRetry();
                }
            };
            scanner.startScan(scanCallback);
            mainHandler.removeCallbacks(scanRetry);
            bluetoothStatus = "Scanning";
            updateNotification();
        } catch (SecurityException error) {
            bluetoothStatus = "Bluetooth permission required";
            scanCallback = null;
            updateNotification();
            scheduleScanRetry();
        } catch (Exception error) {
            bluetoothStatus = "Scanner error: " + error.getClass().getSimpleName();
            scanCallback = null;
            updateNotification();
            scheduleScanRetry();
        }
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
        SparseArray<byte[]> manufacturerData = result.getScanRecord().getManufacturerSpecificData();
        if (manufacturerData == null) return;
        byte[] payload = manufacturerData.get(ECHOSOS_COMPANY_ID);
        if (payload == null || payload.length < 9) return;

        char mode = (char) payload[0];
        if (mode != 'r' && mode != 'e' && mode != 'c') return;

        ByteBuffer ids = ByteBuffer.wrap(payload).order(ByteOrder.BIG_ENDIAN);
        ids.position(1);
        String beaconId = String.format(Locale.US, "%08x", ids.getInt());
        String eventId = String.format(Locale.US, "%08x", ids.getInt());
        if ("00000000".equals(eventId)) eventId = "";

        String macAddress = "";
        String name = result.getScanRecord().getDeviceName();
        try {
            if (result.getDevice() != null) macAddress = result.getDevice().getAddress();
        } catch (SecurityException ignored) {}

        lastDetectionAt = System.currentTimeMillis();
        String modeText = mode == 'e' ? "SOS active" : mode == 'c' ? "Cancel signal" : "Beacon nearby";
        beaconStatus = modeText + " · " + beaconId;
        preferences.edit()
            .putLong("lastDetectionAt", lastDetectionAt)
            .putString("beaconStatus", beaconStatus)
            .apply();

        Intent broadcast = new Intent(ACTION_BEACON_DETECTED);
        broadcast.setPackage(getPackageName());
        broadcast.putExtra("name", name == null ? "EchoSOS Beacon" : name);
        broadcast.putExtra("mac", macAddress);
        broadcast.putExtra("beaconId", beaconId);
        broadcast.putExtra("eventId", eventId);
        broadcast.putExtra("mode", String.valueOf(mode));
        broadcast.putExtra("rssi", result.getRssi());
        sendBroadcast(broadcast);

        if (mode == 'e' && !eventId.isEmpty() && !macAddress.isEmpty()) {
            dispatchSosTelemetry(macAddress, beaconId, eventId, result.getRssi());
        } else if (mode == 'c') {
            lastSosEvent = "Cancel signal seen · open app to verify";
            preferences.edit().putString("lastSosEvent", lastSosEvent).apply();
        }
        updateNotification();
    }

    private synchronized void dispatchSosTelemetry(String macAddress, String beaconId, String eventId, int rssi) {
        String lastDispatched = preferences.getString("lastDispatchedEventId", "");
        long now = System.currentTimeMillis();
        if (eventId.equals(lastDispatched) || eventId.equals(dispatchingEventId) || now - lastDispatchAttemptAt < 10000) return;
        if (convexUrl == null || convexUrl.isEmpty()) {
            lastSosEvent = "SOS detected · backend URL missing";
            updateNotification();
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
                addLastKnownLocation(body);

                URL url = new URL(convexUrl.replaceAll("/+$", "") + "/telemetry");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(body.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
                }

                int status = connection.getResponseCode();
                java.io.InputStream stream = status >= 200 && status < 300
                    ? connection.getInputStream() : connection.getErrorStream();
                StringBuilder response = new StringBuilder();
                if (stream != null) {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream))) {
                        String line;
                        while ((line = reader.readLine()) != null) response.append(line);
                    }
                }
                JSONObject parsed = response.length() > 0 ? new JSONObject(response.toString()) : new JSONObject();
                boolean accepted = status >= 200 && status < 300 && parsed.optBoolean("success", false)
                    && parsed.optBoolean("alertTriggered", false);
                if (accepted) {
                    preferences.edit().putString("lastDispatchedEventId", eventId).apply();
                    lastSosEvent = "SOS reported · " + eventId;
                } else {
                    lastSosEvent = "SOS detected · backend response " + status;
                }
            } catch (Exception error) {
                lastSosEvent = "SOS detected · backend unavailable";
            } finally {
                if (connection != null) connection.disconnect();
                dispatchingEventId = "";
                updateNotification();
            }
        });
    }

    private void addLastKnownLocation(JSONObject body) {
        try {
            boolean fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            boolean coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
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
        } catch (Exception ignored) {}
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Keep the foreground service alive when the user swipes the activity away.
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
}
