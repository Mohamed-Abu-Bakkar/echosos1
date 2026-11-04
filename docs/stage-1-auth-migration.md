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
