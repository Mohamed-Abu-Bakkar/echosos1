# EchoSOS — Emergency Safety Mobile Web Application

> **Production-Ready Next.js Application with Tailwind CSS, Shadcn UI, and a Convex backend, packaged as a Capacitor mobile app**

EchoSOS is a real-time safety application designed to interface with wearable ESP32-S3 BLE beacons, dispatching distress signals and live GPS telemetry to emergency contacts and emergency services.

---

## 🚀 Getting Started

### 1. Requirements
- Node.js 18+ (tested on Node v22.14.0)
- A Convex deployment (this repo ships with one configured in `.env.local`)

### 2. Run the Application
```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Or build the static export used by the Capacitor app
npm run build        # writes to out/ and patches asset paths for the native shell
```
Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📱 Screens

1. **Splash Screen:** `/splash`
2. **Login Screen:** `/login` (sign in / register)
3. **Home / Safety Dashboard:** `/`
4. **Beacon Pairing Screen:** `/beacon`
5. **Emergency Alert Triggered State:** `/alert`
6. **Emergency Contacts & Add Contact Sheet:** `/contacts`
7. **Settings Dashboard:** `/settings`
8. **Notifications:** `/notifications`
9. **Alert History:** `/history`
10. **Live Dispatch Tracking:** `/track?id=<eventId>` (shareable, no login required)
11. **Diagnostics:** `/diagnostics` (BLE / backend / GPS self-test)

---

## 🗄 Backend & Database

The backend is **Convex** (see `convex/`):

| Concern | File |
| --- | --- |
| Schema (tables + indexes) | `convex/schema.ts` |
| Users / auth / profile | `convex/users.ts` |
| Contacts CRUD | `convex/contacts.ts` |
| Beacon pairing + hardware telemetry ingest | `convex/beacons.ts` |
| SOS trigger / cancel / history | `convex/alerts.ts` |
| Notifications | `convex/notifications.ts` |
| Preferences | `convex/preferences.ts` |
| ESP32 HTTP ingest endpoint | `convex/http.ts` → `POST /telemetry` (served on `<deployment>.convex.site`) |

- **Client access:** the app calls Convex over HTTPS through `lib/convex-client.ts` / `lib/api.ts` (no Next.js API routes).
- **ESP32 firmware:** posts telemetry to `https://<deployment>.convex.site/telemetry` (HTTP actions live on Convex's `.convex.site` domain; the app's Convex client uses `.convex.cloud`).
- **Config:** `NEXT_PUBLIC_CONVEX_URL` in `.env.local`.

### Backend test suite
```bash
node scripts/test-backend.mjs
```
Registers users, logs in, pairs a beacon, runs contacts CRUD, triggers/cancels an SOS, and verifies history, notifications, preferences, profile updates, and hardware telemetry — all against the live Convex deployment.

---

## 📦 Capacitor (packaged app)

```bash
npm run build        # static export in out/ + relative asset path patch
npx cap sync android # copies out/ into android/app/src/main/assets/public
```
