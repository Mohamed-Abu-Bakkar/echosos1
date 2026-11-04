import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

/**
 * Better Auth is hosted by the Convex deployment, not by Next.js.
 * This keeps authentication compatible with the Capacitor static export.
 *
 * Configure SITE_URL and BETTER_AUTH_SECRET in the Convex deployment.
 * SITE_URL must be the public HTTPS Convex site URL used by the mobile client.
 */
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    appName: "EchoSOS",
    baseURL: process.env.SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex({ authConfig })],
  });

export const getAuthUser = async (ctx: GenericCtx<DataModel>) =>
  authComponent.getAuthUser(ctx);
