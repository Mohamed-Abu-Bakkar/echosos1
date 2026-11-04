import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { phoneNumber } from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

/**
 * Better Auth is hosted on the Convex .site domain so the Capacitor static
 * application does not depend on Next.js API route handlers.
 *
 * Demo OTP policy:
 * - The fixed code is accepted only when ECHOSOS_DEMO_OTP_ENABLED=true.
 * - It is rejected whenever NODE_ENV=production.
 * - No OTP is logged and no SMS delivery is implied.
 * - Production must configure a real server-side SMS sender before enabling
 *   phone verification or password recovery.
 */
const isDemoOtpEnabled =
  process.env.ECHOSOS_DEMO_OTP_ENABLED === "true" &&
  process.env.ECHOSOS_ENV === "development" &&
  process.env.NODE_ENV !== "production";

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
    plugins: [
      convex({ authConfig }),
      phoneNumber({
        requireVerification: true,
        sendOTP: async () => {
          if (!isDemoOtpEnabled) {
            throw new Error(
              "Phone OTP delivery is not configured. Demo OTP is disabled."
            );
          }
          // Deliberately no SMS provider in demo mode. The demo code is
          // validated server-side by verifyOTP and is never logged or returned.
        },
        sendPasswordResetOTP: async () => {
          if (!isDemoOtpEnabled) {
            throw new Error(
              "Phone password-reset delivery is not configured."
            );
          }
        },
        verifyOTP: async ({ code }) => {
          return isDemoOtpEnabled && code === "123456";
        },
      }),
    ],
  });

export const getAuthUser = async (ctx: GenericCtx<DataModel>) =>
  authComponent.getAuthUser(ctx);
