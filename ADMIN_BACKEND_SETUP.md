# EchoSOS admin backend integration

## Development deployment

Use only the dedicated development deployment while integrating:

- Convex URL: `https://perceptive-schnauzer-138.convex.cloud`
- HTTP actions URL: `https://perceptive-schnauzer-138.convex.site`
- `SITE_URL=http://localhost:3000`
- `ADMIN_EMAIL=admin@echosos.com`

The existing `BETTER_AUTH_SECRET` is retained. Do not copy it into source control or the admin frontend environment.

Production deployment `cheerful-whale-489` must remain untouched until development auth, queries, and the ESP32 telemetry route are verified.

## Backend implementation

The shared backend is owned by this repository. The admin UI repository must not create or deploy a second Convex backend.

- Better Auth is registered as a Convex component.
- Better Auth HTTP routes are mounted at `/api/auth`.
- The existing ESP32 `POST /telemetry` route remains registered.
- Admin queries enforce an exact, normalized `ADMIN_EMAIL` allowlist on the server.
- Admin data access is read-only; it cannot cancel a beacon-originated SOS.
- Admin queries cover overview, users, beacons, alert history, and emergency contacts.

## First administrator provisioning

Public email/password sign-up is disabled. Do not enable unrestricted registration or use Better Auth's Admin plugin with the hosted Convex component: the component's supported-plugin list does not include the Admin plugin, which requires schema changes.

The first administrator must be provisioned through a reviewed, one-time server-side procedure compatible with the hosted component. Until that procedure is implemented and exercised on the development deployment, the dashboard must be treated as not yet ready for login.

## Required validation

1. Run Convex code generation and deploy the backend changes to the development deployment only.
2. Confirm the generated component types include `components.betterAuth`; do not hand-edit generated files.
3. Run typecheck and lint for the mobile/backend repository.
4. Confirm anonymous calls to every `admin.*` query fail.
5. Confirm the allowlisted administrator can read overview, users, beacons, alert history, and emergency contacts.
6. Confirm non-allowlisted authenticated identities are rejected.
7. Confirm `POST /telemetry` still works with a test beacon payload.
8. Only after all checks pass, connect the admin frontend to the development deployment.

## Data limitations

The current active alert record contains its incident coordinates, not a continuous location track. The map must not imply live movement tracking until periodic phone GPS updates are persisted.
