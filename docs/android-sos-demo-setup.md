# EchoSOS Android SOS demo — final setup

## What the app does

- After a user signs in, the Android app starts a foreground BLE scan while the app process is active.
- It reads the EchoSOS ESP32 manufacturer-data advertisement. The event ID is taken from manufacturer data, not inferred from the device name.
- On an emergency-mode advertisement, it requests the phone GPS fix, records one active incident in the shared Convex database, and starts one SMS request per saved emergency contact.
- SMS queue/failure results are written to `alert_history` and `notifications`, which are in the same Convex database read by the EchoSOS Admin dashboard.
- The admin dashboard remains read-only for incident operations.

## SMS provider setup (required for real messages)

The app does not use the phone SIM as an SMS gateway. SMS is sent server-side through Twilio so it can be attempted even if the app is not the sender device. Create/configure a Twilio account and an SMS-capable sender, then set these on the **development Convex deployment only**:

```bash
npx convex env set TWILIO_ACCOUNT_SID "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
npx convex env set TWILIO_AUTH_TOKEN "your-private-auth-token"
npx convex env set TWILIO_FROM_NUMBER "+1xxxxxxxxxx"
npx convex env set ECHOSOS_APP_URL "https://your-hosted-echosos-app.example"
```

Never commit these values or put them in `NEXT_PUBLIC_*` variables. For India, ensure the Twilio account, sender ID, recipient route, and any required DLT/entity/template approvals are enabled for the destination network. Save emergency-contact phone numbers in international E.164 format (for example, +91...).

The Twilio API response confirms that a message was accepted/queued by Twilio. It does **not** prove the recipient handset received it. The current integration records `SMS Queued` or `SMS Failed`; delivery receipts are a separate follow-up.

## Android runtime requirements

- Build and install the native Android app; a browser/PWA cannot perform the required native BLE scan.
- Sign in and grant Nearby devices/Bluetooth scan, Bluetooth connect, and location permissions.
- Keep the app open/in the foreground for this first showcase version. The current Capacitor scanner is a foreground scan with automatic restart; it is **not** an Android always-on background foreground service and may stop when Android kills or suspends the app.
- Enable Bluetooth and Location, and keep the beacon within BLE range.
- Register/pair the ESP32 beacon to the same EchoSOS user account before testing.

## Verification checklist

1. Add at least one emergency contact using a valid E.164 phone number.
2. Set the Twilio environment variables above and run `npx convex dev` against the dedicated development deployment.
3. Build/sync/install Android: `npm run build`, `npx cap sync android`, then build/install from Android Studio.
4. Sign in, allow permissions, and confirm the app reports the beacon as discoverable/connected.
5. Trigger the ESP32 emergency mode once.
6. Confirm one active alert appears in the app and in EchoSOS Admin, with the phone GPS coordinates.
7. Confirm `SMS Queued` or `SMS Failed` appears in history/notifications. Check Twilio logs and the recipient handset separately.
8. Test cancel mode and verify the incident closes. The app currently records cancellation locally; it does not send cancellation SMS messages.

## Important limitations

- Police/emergency-service dispatch is not integrated.
- This build does not guarantee background BLE monitoring after the app is suspended or killed.
- SMS is not considered delivered merely because Twilio accepted it.
- The legacy mobile login/session path still exists on the demo branch. Do not expose this build as a production emergency service until authentication, device identity, abuse prevention, delivery receipts, background scanning, and operational monitoring are hardened.
