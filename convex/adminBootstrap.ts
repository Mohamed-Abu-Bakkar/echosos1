import { admin } from "better-auth/plugins";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { createAuthOptions } from "./auth";
import authConfig from "./auth.config";

/**
 * Temporary, token-protected administrator bootstrap.
 *
 * Remove this file and unset both bootstrap environment variables immediately
 * after the administrator has been created and verified.
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
  handler: async (ctx, args) => {
    const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;

    if (
      !expectedToken ||
      expectedToken.length < 32 ||
      args.token !== expectedToken
    ) {
      throw new Error("Invalid bootstrap token");
    }

    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    if (!password || password.length < 12) {
      throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters");
    }
    if (!email || email !== "admin@echosos.com") {
      throw new Error("ADMIN_EMAIL must be admin@echosos.com for this bootstrap");
    }

    // The Better Auth admin plugin assigns the configured default role.
    // Public signup remains disabled in the normal auth configuration.
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

    // Better Auth rejects an existing email; no existing account is overwritten.
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
