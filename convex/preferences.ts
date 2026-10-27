import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/authz";

export const getPreferences = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    const pref = await ctx.db
      .query("preferences")
      .withIndex("user_id", (q) => q.eq("user_id", args.userId))
      .unique();

    if (!pref) {
      return {
        user_id: args.userId,
        dark_mode: false,
        language: "en-US",
        notifications_enabled: true,
        sos_sensitivity: "HIGH",
      };
    }

    return pref;
  },
});

export const updatePreferences = mutation({
  args: {
    userId: v.id("users"),
    darkMode: v.optional(v.boolean()),
    language: v.optional(v.string()),
    notificationsEnabled: v.optional(v.boolean()),
    sosSensitivity: v.optional(v.union(v.literal("HIGH"), v.literal("MEDIUM"), v.literal("LOW"))),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    let pref = await ctx.db
      .query("preferences")
      .withIndex("user_id", (q) => q.eq("user_id", args.userId))
      .unique();

    if (!pref) {
      const newId = await ctx.db.insert("preferences", {
        user_id: args.userId,
        dark_mode: false,
        language: "en-US",
        notifications_enabled: true,
        sos_sensitivity: "HIGH",
      });
      pref = await ctx.db.get(newId);
    }

    const updates: Record<string, string | boolean> = {};
    if (args.darkMode !== undefined) updates.dark_mode = args.darkMode;
    if (args.language !== undefined) updates.language = args.language;
    if (args.notificationsEnabled !== undefined) updates.notifications_enabled = args.notificationsEnabled;
    if (args.sosSensitivity !== undefined) updates.sos_sensitivity = args.sosSensitivity;

    if (Object.keys(updates).length > 0 && pref) {
      await ctx.db.patch(pref._id, updates);
      pref = await ctx.db.get(pref._id);
    }

    return pref;
  },
});
