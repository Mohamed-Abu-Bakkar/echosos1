import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { admin } from "better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import type { BetterAuthOptions } from "better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";

export const authComponent = createClient<DataModel, typeof authSchema>(
  (components as any).betterAuth,
  {
    local: {
      schema: authSchema,
    },
  },
);

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
    plugins: [
      convex({ authConfig }),
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
    ],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

export const getAuthUser = async (ctx: GenericCtx<DataModel>) =>
  authComponent.getAuthUser(ctx);
