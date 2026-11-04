# EchoSOS admin backend integration

## Development deployment

Use only the dedicated development deployment while integrating:

- Convex URL: `https://perceptive-schnauzer-138.convex.cloud`
- HTTP actions URL: `https://perceptive-schnauzer-138.convex.site`
- `SITE_URL=http://localhost:3000`
- `ADMIN_EMAIL=admin@echosos.com`

The existing `BETTER_AUTH_SECRET` is retained. Do not copy it into source control or the admin frontend environment.

Production deployment `cheerful-whale-489` is not part of this development setup.

## Backend implementation

This repository owns the shared Convex backend. The admin UI repository must not create or deploy a second Convex backend.

- Better Auth is installed as a local Convex component at `convex/betterAuth`.
- The local component enables the Better Auth Admin plugin and its generated schema.
- Better Auth HTTP routes are mounted at `/api/auth`.
- The existing ESP32 `POST /telemetry` route remains registered.
- Admin data queries enforce the normalized `ADMIN_EMAIL` allowlist on the server.
- Admin data access is read-only; it cannot cancel a beacon-originated SOS.
- Admin queries cover overview, users, beacons, alert history, and emergency contacts.
- Mobile app authentication in the existing `users` table remains separate from administrator authentication.

## Generate the local Better Auth schema

The checked-in `convex/betterAuth/schema.ts` is only a bootstrap placeholder. Generate the real plugin schema before running or deploying Convex:

```bash
cd convex/betterAuth
npx auth generate
cd ../..
npx convex dev
```

The generated schema must contain Better Auth core tables and Admin plugin fields. Do not hand-edit generated schema or generated Convex files.

## First administrator

Public email/password sign-up remains disabled. The intended first administrator is:

- Email: `admin@echosos.com`
- Role: `admin`

The Better Auth Admin plugin is enabled in the backend and admin client. The first admin account still needs to be created against the running development deployment using a server-side Better Auth admin operation. Do not use the generic standalone `create-admin` CLI against this Convex adapter unless the adapter is explicitly configured to connect to the Convex deployment; the Convex adapter requires a Convex request context.

## Required development validation

1. Generate the local Better Auth schema as shown above.
2. Run `npx convex dev` from the backend repository using the existing development deployment.
3. Confirm Convex code generation completes and `components.betterAuth` exists in generated types.
4. Run `npm run typecheck` and `npm run lint` in the admin repository.
5. Confirm anonymous calls to every `admin.*` query fail.
6. Confirm the allowlisted administrator can read overview, users, beacons, alert history, and emergency contacts.
7. Confirm non-allowlisted authenticated identities are rejected.
8. Confirm `POST /telemetry` still works with a test beacon payload.

## Data limitations

The current active alert record contains its incident coordinates, not a continuous location track. The map is an incident-location map, not a live movement tracker.
