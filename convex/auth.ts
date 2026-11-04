import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import type { BetterAuthOptions } from "better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

// The CLI regenerates the precise component type after the first dev deployment sync.
const betterAuthComponent = (
  components as unknown as {
    betterAuth: Parameters<typeof createClient<DataModel>>[0];
  }
).betterAuth;

export const authComponent = createClient<DataModel>(betterAuthComponent);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    appName: "EchoSOS",
    baseURL: process.env.SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [process.env.SITE_URL!],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    plugins: [convex({ authConfig })],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
