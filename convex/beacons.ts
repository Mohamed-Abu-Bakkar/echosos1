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
      const newId = await ctx.db.insert("beacons", {
        user_id: args.userId,
        mac_address: args.macAddress,
        device_name: args.deviceName,
        signal_dbm: -45,
        status: "CONNECTED",
        battery_percent: 88,
      });
      beacon = await ctx.db.get(newId);
    }

    if (beacon) {
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
    }

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
    /** Event id the beacon generated for this SOS (advertised + GATT). */
    eventId: v.optional(v.string()),
    /** Compact beacon id from manufacturer data / local name suffix. */
    beaconHardwareId: v.optional(v.string()),
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
      const updates: Record<string, string | number> = { status: "CONNECTED" };
      if (args.batteryPercent !== undefined) updates.battery_percent = args.batteryPercent;
      if (args.signalDbm !== undefined) updates.signal_dbm = args.signalDbm;
      await ctx.db.patch(beacon._id, updates);
    }

    let alertTriggered = false;
    let eventId: string | null = null;

    if (args.buttonPressed && beacon) {
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      // Prefer the id the beacon already put in its advertisement/GATT.
      eventId = (args.eventId ?? generateEventId()).toLowerCase();
      const beaconLabel = args.beaconHardwareId ?? beacon.device_name;

      const existing = await ctx.db.query("active_alert").unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          is_active: true,
          beacon_id: beaconLabel,
          event_id: eventId,
          ble_mode: "e",
          detected_at: timestamp,
          latitude: args.latitude ?? existing.latitude,
          longitude: args.longitude ?? existing.longitude,
          contacts_dispatched: 0,
          dispatch_url: `/track/${eventId}`,
        });
      } else {
        await ctx.db.insert("active_alert", {
          user_id: beacon.user_id,
          beacon_id: beaconLabel,
          event_id: eventId,
          ble_mode: "e",
          is_active: true,
          detected_at: timestamp,
          signal_dbm: `${args.signalDbm ?? -45} dBm`,
          latitude: args.latitude ?? 10.8247,
          longitude: args.longitude ?? 78.6956,
          contacts_dispatched: 0,
          dispatch_url: `/track/${eventId}`,
        });
      }

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

    return { acknowledged: true, alertTriggered, eventId };
  },
});

function generateEventId(): string {
  const bytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  if (bytes.every((b) => b === 0)) bytes[0] = 1;
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
