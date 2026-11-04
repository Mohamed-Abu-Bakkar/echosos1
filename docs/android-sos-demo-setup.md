# EchoSOS Android SOS demo — final setup

## What the app does

- After a user signs in, the Android app starts a BLE scan while the app process is active.
- It reads the ESP32 EchoSOS manufacturer-data advertisement, including the event ID.
- On emergency mode, it requests the phone GPS fix, records one active incident in the shared Convex database, and submits an SMS to each saved emergency contact through the Android phone's SIM.
- The shared Convex `alert_history` and `notifications` tables record whether Android accepted or rejected each SMS request. The separate EchoSOS Admin dashboard reads those same tables.
- The admin dashboard remains read-only for emergency operations.

## Android SMS requirements

- Install the native Android app; browser/PWA builds cannot send SMS through the device SIM.
- Insert an active SIM with SMS service/recharge and ensure the phone has cellular coverage.
- Grant the Android **Send SMS** permission when the app first attempts an emergency message.
- Save emergency-contact numbers in international format (for example, +91XXXXXXXXXX).
- The app sends to a maximum of five saved contacts per incident.
- `SMS Submitted` means Android accepted the request for the SIM. It does not confirm carrier delivery or that the recipient handset received/read it.

No Twilio account or server-side SMS credentials are required for this showcase.

## Shared admin dashboard

The separate `echoSOS-admin` app uses the same Convex deployment. The app repository provides read-only `admin.overview`, `admin.listUsers`, `admin.listBeacons`, `admin.listEmergencyContacts`, and `admin.listAlertHistory` queries. Set the one administrator email on the development deployment:

```bash
npx convex env set ADMIN_EMAIL "admin@example.com"
```

Create the administrator account through the controlled Better Auth bootstrap flow used by the admin app, using that exact email. Keep public admin registration disabled. Do not point either app at production during this showcase.

## Android runtime requirements

- Sign in to EchoSOS and grant Nearby devices/Bluetooth scan, Bluetooth connect, and location permissions.
- Keep the app open/in the foreground for this first showcase version. The current Capacitor scanner automatically restarts its foreground scan; it is **not** an Android always-on background service and may stop when Android kills or suspends the app.
- Enable Bluetooth and Location, and keep the beacon within BLE range.
- Register/pair the ESP32 beacon to the same EchoSOS user account before testing.

## Verification checklist

1. Add at least one emergency contact with a valid international phone number.
2. Install the Android app and grant Bluetooth, location, and Send SMS permissions.
3. Run `npx convex dev` against the dedicated development deployment.
4. Sign in and confirm the app detects the registered beacon.
5. Trigger the ESP32 emergency mode once.
6. Confirm one active alert appears in the app and admin dashboard, with the phone GPS coordinates.
7. Confirm `SMS Submitted` or `SMS Failed` appears in history/notifications. Check the recipient handset independently.
8. Test cancel mode and verify the incident closes. Cancellation SMS is not implemented.

## Important limitations

- Police/emergency-service dispatch is not integrated.
- BLE scanning is foreground-only in this showcase.
- Android accepting an SMS request is not proof of carrier delivery.
- Better Auth is used for admin authentication; the mobile app still uses its legacy demo phone/password session path.
- This build has not been compiled or tested on a physical Android device after these changes. Do not use it as a production emergency service until authentication, device identity, abuse prevention, background scanning, delivery receipts, and operational monitoring are hardened.
