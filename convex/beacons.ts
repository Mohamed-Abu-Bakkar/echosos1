import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getBeacon = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("beacons")
      .filter((q) => q.eq(q.field("user_id"), args.userId))
      .unique();
  },
});

export const pairBeacon = mutation({
  args: {
    userId: v.id("users"),
    deviceName: v.string(),
    macAddress: v.string(),
  },
  handler: async (ctx, args) => {
    let beacon = await ctx.db
      .query("beacons")
      .filter((q) => q.eq(q.field("user_id"), args.userId))
      .unique();

    if (beacon) {
      await ctx.db.patch(beacon._id, {
        device_name: args.deviceName,
        mac_address: args.macAddress,
        status: "CONNECTED",
        signal_dbm: -45,
      });
    } else {
      beacon = await ctx.db.insert("beacons", {
        user_id: args.userId,
        mac_address: args.macAddress,
        device_name: args.deviceName,
        signal_dbm: -45,
        status: "CONNECTED",
        battery_percent: 88,
      });
    }

    await ctx.db.insert("alert_history", {
      user_id: args.userId,
      beacon_id: beacon._id,
      event_type: "BEACON_CONNECTED",
      status_badge: "Connected",
      latitude: 10.8247,
      longitude: 78.6956,
      created_at: "Just now",
    });

    await ctx.db.insert("notifications", {
      user_id: args.userId,
      type: "SYSTEM",
      title: `${args.deviceName} Connected`,
      message: `Device with MAC ${args.macAddress} paired successfully via BLE.`,
      is_read: false,
      created_at: "Just now",
    });

    return beacon;
  },
});

export const ingestHardwareTelemetry = mutation({
  args: {
    macAddress: v.string(),
    batteryPercent: v.optional(v.number()),
    signalDbm: v.optional(v.number()),
    buttonPressed: v.optional(v.boolean()),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    let beacon = await ctx.db
      .query("beacons")
      .filter((q) => q.eq(q.field("mac_address"), args.macAddress))
      .unique();

    if (!beacon) {
      beacon = await ctx.db
        .query("beacons")
        .filter((q) => q.eq(q.field("device_name"), "ESP32-S3"))
        .unique();
    }

    if (beacon) {
      const updates: Record<string, any> = { status: "CONNECTED" };
      if (args.batteryPercent !== undefined) updates.battery_percent = args.batteryPercent;
      if (args.signalDbm !== undefined) updates.signal_dbm = args.signalDbm;
      await ctx.db.patch(beacon._id, updates);
    }

    let alertTriggered = false;
    if (args.buttonPressed && beacon) {
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      await ctx.db.insert("alert_history", {
        user_id: beacon.user_id,
        beacon_id: undefined,
        event_type: "SOS_ALERT",
        status_badge: "Alert Sent",
        latitude: args.latitude,
        longitude: args.longitude,
        created_at: `Today, ${timestamp}`,
      });
      alertTriggered = true;
    }

    return { acknowledged: true, alertTriggered };
  },
});
