import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_LAT = 10.8247;
const DEFAULT_LNG = 78.6956;

export const getActiveAlert = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("active_alert").unique();
  },
});

export const triggerAlert = mutation({
  args: {
    userId: v.id("users"),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const latitude = args.latitude ?? DEFAULT_LAT;
    const longitude = args.longitude ?? DEFAULT_LNG;
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const alertId = Date.now();

    // Upsert active alert
    const existing = await ctx.db.query("active_alert").unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        is_active: true,
        beacon_id: "ESP32-S3",
        detected_at: timestamp,
        latitude,
        longitude,
        contacts_dispatched: 0,
        dispatch_url: `/track/${alertId}`,
      });
    } else {
      await ctx.db.insert("active_alert", {
        user_id: args.userId,
        beacon_id: "ESP32-S3",
        is_active: true,
        detected_at: timestamp,
        signal_dbm: "-45 dBm (Good)",
        latitude,
        longitude,
        contacts_dispatched: 0,
        dispatch_url: `/track/${alertId}`,
      });
    }

    const newAlertId = await ctx.db.insert("alert_history", {
      user_id: args.userId,
      beacon_id: undefined,
      event_type: "SOS_ALERT",
      status_badge: "Alert Sent",
      latitude,
      longitude,
      created_at: `Today, ${timestamp}`,
    });

    const contactCount = await ctx.db
      .query("emergency_contacts")
      .filter((q) => q.eq(q.field("user_id"), args.userId))
      .collect();

    await ctx.db.insert("notifications", {
      user_id: args.userId,
      type: "SOS",
      title: "Emergency Distress Broadcasted",
      message: `SOS coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) transmitted to ${contactCount.length} emergency contacts and police dispatch. Live tracking link: /track/${alertId}`,
      is_read: false,
      created_at: `Today, ${timestamp}`,
    });

    return newAlertId;
  },
});

export const cancelAlert = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("active_alert").unique();
    if (!existing) return true;

    await ctx.db.patch(existing._id, { is_active: false });

    await ctx.db.insert("alert_history", {
      user_id: args.userId,
      beacon_id: undefined,
      event_type: "SYSTEM_UPDATE",
      status_badge: "Warning",
      latitude: existing.latitude,
      longitude: existing.longitude,
      created_at: "Just now",
    });

    await ctx.db.insert("notifications", {
      user_id: args.userId,
      type: "SYSTEM",
      title: "SOS Alert Cancelled by User",
      message: "False alert notice dispatched to emergency contacts. Emergency routing standby resumed.",
      is_read: false,
      created_at: "Just now",
    });

    return true;
  },
});

export const getAlertHistory = query({
  args: { userId: v.id("users"), filter: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let query = ctx.db.query("alert_history").filter((q) =>
      q.eq(q.field("user_id"), args.userId)
    );

    const results = await query.order("desc").collect();

    if (!args.filter || args.filter === "ALL") return results;
    if (args.filter === "SOS") {
      return results.filter(
        (a) => a.event_type === "SOS_ALERT" || a.event_type === "CONTACT_DELIVERED"
      );
    }
    if (args.filter === "SYSTEM") {
      return results.filter(
        (a) => a.event_type === "BEACON_CONNECTED" || a.event_type === "LOW_BATTERY"
      );
    }
    if (args.filter === "UPDATES") {
      return results.filter((a) => a.event_type === "SYSTEM_UPDATE");
    }
    return results;
  },
});
