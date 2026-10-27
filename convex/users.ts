import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { publicUser, requireUser } from "./lib/authz";

const SESSION_SECRET =
  (typeof process !== "undefined" && process.env?.SESSION_SECRET) ||
  "echosos_secure_super_secret_jwt_key_2026";

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + SESSION_SECRET);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const getUserByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("phone", (q) => q.eq("phone", args.phone))
      .unique();
    return user ? publicUser(user) : null;
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user ? publicUser(user) : null;
  },
});

/** Server-side login: verifies password hash without exposing password_hash. */
export const login = mutation({
  args: { phone: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("phone", (q) => q.eq("phone", args.phone))
      .unique();
    if (!user) {
      return { success: false as const, message: "Invalid phone number or password." };
    }
    const inputHash = await hashPassword(args.password);
    if (user.password_hash !== inputHash) {
      return { success: false as const, message: "Invalid phone number or password." };
    }
    return {
      success: true as const,
      message: "Login successful",
      user: publicUser(user),
    };
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("phone", (q) => q.eq("phone", args.phone))
      .unique();
    if (existing) {
      throw new Error("An account with this phone number already exists");
    }

    const userId = await ctx.db.insert("users", {
      name: args.name,
      phone: args.phone,
      password_hash: args.passwordHash,
      created_at: new Date().toISOString(),
    });

    await ctx.db.insert("preferences", {
      user_id: userId,
      dark_mode: false,
      language: "en-US",
      notifications_enabled: true,
      sos_sensitivity: "HIGH",
    });

    return userId;
  },
});

export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.userId);
    if (!user) return null;

    const updates: Record<string, string> = {};
    if (args.name) updates.name = args.name;
    if (args.phone) updates.phone = args.phone;
    if (args.passwordHash) updates.password_hash = args.passwordHash;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.userId, updates);
    }

    const updated = await ctx.db.get(args.userId);
    return updated ? publicUser(updated) : null;
  },
});
