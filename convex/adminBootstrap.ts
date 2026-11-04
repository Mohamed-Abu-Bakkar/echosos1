import { admin } from "better-auth/plugins";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { authComponent, createAuthOptions } from "./auth";
import authConfig from "./auth.config";

/**
 * One-time, internal-only bootstrap for the single EchoSOS administrator.
 *
 * The action deliberately enables email signup only in this isolated runtime
 * instance and assigns the admin role by default. It is not exposed to clients.
 * Remove the bootstrap environment variables immediately after it succeeds.
 */
export const bootstrapAdmin = action({
  args: {
    token: v.string(),
  },
  returns: v.object({
    created: v.boolean(),
    email: v.string(),
    role: v.string(),
  }),
  handler: async (ctx) => {
    const token = process.env.ADMIN_BOOTSTRAP_TOKEN;
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    if (!token || token.length < 32) {
      throw new Error("ADMIN_BOOTSTRAP_TOKEN is missing or too short");
    }
    if (!password || password.length < 12) {
      throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters");
    }
    if (!email || email !== "admin@echosos.com") {
      throw new Error("ADMIN_EMAIL must be admin@echosos.com for this bootstrap");
    }

    const adapter = authComponent.adapter(ctx);
    const existing = await adapter.findOne({
      model: "user",
      where: [{ field: "email", value: email }],
    });

    if (existing) {
      throw new Error(
        "A Better Auth user already exists for the configured admin email; refusing to overwrite it",
      );
    }

    const auth = betterAuth({
      ...createAuthOptions(ctx),
      emailAndPassword: {
        enabled: true,
        disableSignUp: false,
      },
      plugins: [
        convex({ authConfig }),
        admin({
          defaultRole: "admin",
          adminRoles: ["admin"],
        }),
      ],
    });

    const result = await auth.api.signUpEmail({
      body: {
        email,
        name: "EchoSOS Admin",
        password,
      },
    });

    if (!result?.user?.id) {
      throw new Error("Better Auth did not return a created admin user");
    }

    return {
      created: true,
      email: result.user.email,
      role: result.user.role ?? "admin",
    };
  },
});
