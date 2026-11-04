# EchoSOS Admin shared-backend setup

This branch adds the Better Auth Convex component and read-only administrator queries to the existing mobile app backend. It must be reviewed and merged/deployed from this repository only; the admin UI repository must never deploy a separate Convex project.

## Required Convex environment variables

Set these on the same Convex deployment already used by the mobile app:

- `BETTER_AUTH_SECRET`: a fresh random secret (at least 32 bytes).
- `SITE_URL`: the admin app origin, e.g. `http://localhost:3000`.
- `ADMIN_EMAIL`: the exact email address allowed to administer EchoSOS.

Do not commit values. For local development, use the existing deployment's `.env.local` and preserve its current `CONVEX_DEPLOYMENT`.

Generate a secret locally with:

```bash
openssl rand -base64 32
```

Then set it with the Convex CLI (do not paste it into source files):

```bash
npx convex env set BETTER_AUTH_SECRET "<generated-secret>"
npx convex env set SITE_URL "http://localhost:3000"
npx convex env set ADMIN_EMAIL "<administrator-email>"
```

The admin Next.js app also needs:

```env
NEXT_PUBLIC_CONVEX_URL=<same existing deployment .cloud URL>
NEXT_PUBLIC_CONVEX_SITE_URL=<same existing deployment .site URL>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## First administrator account

Public Better Auth sign-up is intentionally disabled. Provision the one approved administrator account through a controlled one-time administrative bootstrap procedure before enabling the console. Do not temporarily expose an unrestricted public registration route. The first-account provisioning step is intentionally not automated in this branch because the approved administrator email and password delivery process have not been supplied.

## Backend changes

- Better Auth is registered as a Convex component.
- Better Auth HTTP routes are mounted at `/api/auth`; the existing ESP32 `/telemetry` route is preserved.
- `convex/admin.ts` exposes read-only overview, user-list and beacon-list queries.
- Every admin query checks the authenticated identity email against `ADMIN_EMAIL`.
- Password hashes are not returned by the user-list query.
- No admin endpoint can cancel an active SOS event.

## Data and live-map limitations

The current `active_alert` table stores the incident's initial coordinates. The current hardware telemetry handler updates beacon signal/battery and opens an alert; it does not persist a continuous GPS track. The OSM map can plot active-alert coordinates, but it cannot show movement history until periodic location updates are implemented by the phone gateway or hardware data path.

## Validation required before merge/deploy

1. Install dependencies in this repo and run `npx convex dev` against a non-production/dev deployment.
2. Let Convex regenerate `convex/_generated/*`; do not hand-edit generated files.
3. Run `npx tsc --noEmit` and `npm run lint`.
4. Provision the admin account through the approved one-time process.
5. Verify anonymous calls to each `admin.*` query fail and the configured admin can read the overview, users and beacons.
6. Verify the existing `/telemetry` HTTP route still ingests beacon events.

No production deployment is performed by this branch.
