# EchoSOS Stage 1 — Better Auth migration

## Decisions

- Android first, packaged with Capacitor.
- Next.js remains a static export (output: export).
- Convex remains the backend.
- Better Auth is hosted by the Convex deployment through the Convex Better Auth component.
- The mobile client calls the Convex .site HTTP endpoint directly. Do not add a Next.js app/api/auth route: it is not available inside the static Capacitor bundle.
- Existing user-facing profile data remains in the EchoSOS users table during migration. Better Auth owns credentials, sessions and authentication identity.

## Stage 1 scope

1. Register the @convex-dev/better-auth component.
2. Configure Convex auth provider and Better Auth server.
3. Configure the Better Auth React client and authenticated Convex provider.
4. Migrate login, registration, logout and session restoration away from the custom local-storage session.
5. Replace client-supplied userId authorization with verified Convex identity checks.
6. Add an explicit account/profile mapping from the Better Auth user to the existing EchoSOS profile record.
7. Migrate every protected query/mutation used by the UI to derive the caller from ctx.auth.getUserIdentity(), never from a client-provided user ID.
8. Remove the custom SHA-256 password scheme and hardcoded fallback session secret only after the new auth flow and account migration are verified.

## Install and generate locally

Run from the repository root before building or deploying this branch:

```bash
npm install convex@latest @convex-dev/better-auth better-auth@~1.6.15
npx convex dev
```

The Convex CLI must regenerate `convex/_generated/api.*` so `components.betterAuth` is typed after the component is registered. Commit the resulting package-lock.json and generated files after verifying them locally. Do not hand-edit generated files.

## Deployment configuration

Set these on the Convex deployment (never commit secrets):

- BETTER_AUTH_SECRET: cryptographically random secret, at least 32 bytes.
- SITE_URL: public HTTPS URL of the Convex deployment HTTP actions host, e.g. https://<deployment>.convex.site.

Set these at build time for the Next.js/Capacitor client:

- NEXT_PUBLIC_CONVEX_URL: Convex deployment URL ending in .convex.cloud.
- NEXT_PUBLIC_CONVEX_SITE_URL: matching Convex HTTP actions URL ending in .convex.site.

Never put BETTER_AUTH_SECRET in a NEXT_PUBLIC_ variable or client bundle.

## Existing-code migration map

- convex/convex.config.ts — register Better Auth component.
- convex/auth.config.ts — configure Convex JWT provider.
- convex/auth.ts — Better Auth instance and component client.
- convex/http.ts — register Better Auth HTTP routes while preserving /telemetry.
- lib/auth-client.ts — browser/Capacitor auth client.
- components/convex-auth-provider.tsx — authenticated Convex React provider.
- app/layout.tsx — mount provider after auth UI migration is ready.
- lib/auth-context.tsx, lib/session.ts, lib/api.ts, app/login/page.tsx — remove custom auth/session flow and use Better Auth.
- convex/lib/authz.ts, convex/users.ts, and all protected Convex modules — authorize using verified identity and owner mapping.
- convex/schema.ts — add profile-to-Better-Auth user mapping and indexes; preserve existing user data during migration.

## Safety gates

- Do not remove the old auth path until migration is complete and tested.
- Do not trust a user ID supplied by the client.
- Do not expose password hashes or Better Auth session tokens in profile queries.
- Do not mark Stage 1 complete until sign-up, sign-in, sign-out, app restart/session restoration, cross-account access denial and account migration tests pass.
- Existing accounts need a deliberate migration/reset strategy; do not silently create duplicate accounts based on phone number.
- No BLE, incident-routing, SMS or push implementation belongs in Stage 1.

## Authentication decision gate — phone and password

The current EchoSOS UI identifies accounts by phone number and password. Do not switch this to email/password or silently manufacture an email address for each account.

Better Auth's Phone Number plugin is the relevant supported path: it provides phone-number authentication and documents phone-number + password sign-in when the user has a credential account record. Its OTP verification flow requires an application-provided `sendOTP` SMS implementation. The Username plugin is not a drop-in replacement because its sign-up flow still requires an email address.

Before enabling the new sign-in flow, resolve both migration requirements:

1. **Existing passwords:** the current EchoSOS implementation stores a custom SHA-256 digest using a hardcoded fallback secret. This is not a safe credential format to carry forward as-is. Choose a controlled one-time migration that verifies the legacy credential and rehashes it into Better Auth's credential format, or require a password reset. Never copy the legacy digest into Better Auth as though it were a compatible password hash.
2. **Phone verification:** decide whether existing phone numbers are trusted as already verified or must be verified through OTP. If OTP is required, select and configure the SMS provider before enabling the phone verification flow. Do not mark existing numbers verified without an explicit policy.

Until these decisions and a tested migration path exist, keep this PR in draft and do not remove the existing auth path or deploy the new auth flow. This is a release blocker, not a reason to invent an email identity or bypass verification.

## Confirmed recovery and SMS delivery decisions

- Existing users will use a **password-reset flow**; do not migrate the legacy SHA-256 password hashes into Better Auth.
- The Android handset's SIM/recharge plan is intended for **outbound emergency-contact SMS**, not authentication OTP delivery.
- Do not use client-generated OTPs, self-addressed SMS, or an SMS composer as proof of phone ownership. These do not provide trustworthy server-side OTP verification.
- Authentication phone verification and password recovery require a server-reachable SMS delivery/verification provider. Keep this provider behind a server-side adapter and do not hardcode provider credentials.
- Until a provider is configured, phone OTP/password recovery must remain unavailable rather than silently weakening account recovery. The user-facing recovery screen should clearly explain the temporary limitation.
- Emergency-contact SMS is a separate Android capability: it needs runtime permission, explicit user-facing disclosure, device/SIM availability, and delivery/failure handling. It must not be treated as guaranteed delivery or as a substitute for backend authentication.

## Demo-only fixed OTP

For demonstrations only, the project may use a single fixed OTP (default demo value: `123456`) without an SMS provider. This is a usability stub, not phone ownership verification.

Implementation/release constraints:

- Gate the fixed OTP behind an explicit server-side demo environment setting (for example `ECHOSOS_DEMO_OTP_ENABLED=true`); default to disabled.
- The OTP value must be server-side configuration, never a `NEXT_PUBLIC_*` variable and never exposed in a production build.
- Refuse to start or verify this mode in production. Do not silently fall back to the demo code if SMS delivery fails.
- Keep the fixed OTP out of production logs and user-facing production UI.
- Display a clear “Demo OTP” notice only while demo mode is enabled.
- Add tests proving the fixed OTP works only in demo mode and is rejected when demo mode is disabled or the deployment is production.
- Do not treat demo OTP verification as proof of phone ownership or allow it to authorize production account recovery.

## Local developer handoff

Do this on the development machine after fetching the branch:

```bash
git fetch origin
git switch feature/stage-1-better-auth
npm install
npm install convex@latest @convex-dev/better-auth better-auth@~1.6.15
npx convex dev
```

The Convex command is expected to generate/update Convex component and API types. Review the generated diff and commit the lockfile and generated files; do not hand-edit generated files.

Then validate:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Before any merge, verify all of the following on a real Convex development deployment:

- Better Auth HTTP endpoints respond and the Convex JWT provider is accepted.
- The React provider is mounted without breaking the Capacitor static export.
- Phone sign-up/sign-in and password reset use the intended demo-only fixed OTP path.
- The fixed OTP is rejected when demo mode is disabled and on production deployments.
- Authenticated queries and mutations derive the profile from the verified identity; changing a client-supplied user ID cannot access another account.
- Existing users' profile, contacts, beacons, alert history, notifications and preferences remain intact.
- The ESP32 `/telemetry` HTTP endpoint still works.
- Sign-out and app restart/session restoration work on Android.

Do not merge until the generated files are committed, the checks pass, and the authorization/account-mapping work is complete. A successful static build alone does not validate Convex auth or Android runtime behavior.


## Demo phone OTP implementation

The development branch now includes Better Auth's phone-number plugin and a
server-side demo OTP verifier. The fixed code is `123456`, and it is accepted
only when all of these conditions hold:

- `ECHOSOS_DEMO_OTP_ENABLED=true`
- `ECHOSOS_ENV=development`
- `SITE_URL` exactly matches the allowlisted development Convex site URL

All other configurations reject the fixed code. The demo sender does not send
SMS, return the code to the client, or write it to logs. This is a local/demo
verification mechanism only; it does not prove phone ownership. Never set these
flags in a production deployment. A production SMS sender and real delivery
provider are required before enabling phone verification or password recovery
for real users.

The Better Auth client also registers the phone-number client plugin. The app's
legacy login/session UI and user-ID-based Convex calls still need to be migrated
before this authentication setup is considered complete.
