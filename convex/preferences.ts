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
        background_notification_show_bluetooth_status: true,
        background_notification_show_beacon_status: true,
        background_notification_show_last_detection: true,
        background_notification_show_last_sos_event: true,
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
    backgroundNotificationShowBluetoothStatus: v.optional(v.boolean()),
    backgroundNotificationShowBeaconStatus: v.optional(v.boolean()),
    backgroundNotificationShowLastDetection: v.optional(v.boolean()),
    backgroundNotificationShowLastSosEvent: v.optional(v.boolean()),
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
        background_notification_show_bluetooth_status: true,
        background_notification_show_beacon_status: true,
        background_notification_show_last_detection: true,
        background_notification_show_last_sos_event: true,
      });
      pref = await ctx.db.get(newId);
    }

    const updates: Record<string, string | boolean> = {};
    if (args.darkMode !== undefined) updates.dark_mode = args.darkMode;
    if (args.language !== undefined) updates.language = args.language;
    if (args.notificationsEnabled !== undefined) updates.notifications_enabled = args.notificationsEnabled;
    if (args.sosSensitivity !== undefined) updates.sos_sensitivity = args.sosSensitivity;
    if (args.backgroundNotificationShowBluetoothStatus !== undefined) {
      updates.background_notification_show_bluetooth_status = args.backgroundNotificationShowBluetoothStatus;
    }
    if (args.backgroundNotificationShowBeaconStatus !== undefined) {
      updates.background_notification_show_beacon_status = args.backgroundNotificationShowBeaconStatus;
    }
    if (args.backgroundNotificationShowLastDetection !== undefined) {
      updates.background_notification_show_last_detection = args.backgroundNotificationShowLastDetection;
    }
    if (args.backgroundNotificationShowLastSosEvent !== undefined) {
      updates.background_notification_show_last_sos_event = args.backgroundNotificationShowLastSosEvent;
    }

    if (Object.keys(updates).length > 0 && pref) {
      await ctx.db.patch(pref._id, updates);
      pref = await ctx.db.get(pref._id);
    }

    return pref;
  },
});
