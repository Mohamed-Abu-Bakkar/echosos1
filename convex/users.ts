import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("phone"), args.phone))
      .unique();
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      name: args.name,
      phone: args.phone,
      password_hash: args.passwordHash,
      created_at: new Date().toISOString(),
    });

    await ctx.db.insert("beacons", {
      user_id: userId,
      mac_address: `C7:3A:5B:${Math.floor(10 + Math.random() * 89)}:${Math.floor(10 + Math.random() * 89)}:9F`,
      device_name: "ESP32-S3",
      signal_dbm: -45,
      status: "CONNECTED",
      battery_percent: 92,
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
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const updates: Record<string, any> = {};
    if (args.name) updates.name = args.name;
    if (args.phone) updates.phone = args.phone;
    if (args.passwordHash) updates.password_hash = args.passwordHash;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.userId, updates);
    }

    return await ctx.db.get(args.userId);
  },
});
