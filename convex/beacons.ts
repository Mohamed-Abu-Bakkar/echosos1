import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/authz";
import { Doc, Id } from "./_generated/dataModel";

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

export const getBeacon = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    return await ctx.db
      .query("beacons")
      .withIndex("user_id", (q) => q.eq("user_id", args.userId))
      .unique();
  },
});

export const pairBeacon = mutation({
  args: {
    userId: v.id("users"),
    deviceName: v.string(),
    macAddress: v.string(),
    signalDbm: v.optional(v.number()),
    batteryPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    if (!args.deviceName || !args.macAddress) {
      throw new Error("deviceName and macAddress are required");
    }

    let beacon = await ctx.db
      .query("beacons")
      .withIndex("user_id", (q) => q.eq("user_id", args.userId))
      .unique();

    const signal = args.signalDbm ?? -60;
    const battery = args.batteryPercent ?? 100;

    if (beacon) {
      await ctx.db.patch(beacon._id, {
        device_name: args.deviceName,
        mac_address: args.macAddress,
        status: "CONNECTED",
        signal_dbm: signal,
        battery_percent: battery,
      });
      beacon = await ctx.db.get(beacon._id);
    } else {
      const newId = await ctx.db.insert("beacons", {
        user_id: args.userId,
        mac_address: args.macAddress,
        device_name: args.deviceName,
        signal_dbm: signal,
        status: "CONNECTED",
        battery_percent: battery,
      });
      beacon = await ctx.db.get(newId);
    }

    if (beacon) {
      await ctx.db.insert("alert_history", {
        user_id: args.userId,
        beacon_id: beacon._id,
        event_type: "BEACON_CONNECTED",
        status_badge: "Connected",
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

async function findByMac(ctx: MutationCtx, macAddress: string) {
  return await ctx.db
    .query("beacons")
    .withIndex("mac_address", (q) => q.eq("mac_address", macAddress))
    .order("desc")
    .first();
}

/**
 * Hardware telemetry ingest (called from ESP32 via Convex HTTP action).
 * Button press opens an active SOS event with the beacon-reported event id.
 */
export const ingestHardwareTelemetry = mutation({
  args: {
    macAddress: v.string(),
    batteryPercent: v.optional(v.number()),
    signalDbm: v.optional(v.number()),
    buttonPressed: v.optional(v.boolean()),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
    eventId: v.optional(v.string()),
    beaconHardwareId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result: {
      acknowledged: boolean;
      alertTriggered: boolean;
      eventId: string | null;
      error: string | null;
      reason?: string;
    } = {
      acknowledged: true,
      alertTriggered: false,
      eventId: null,
      error: null,
    };
    try {
      const beacon = await findByMac(ctx, args.macAddress);
      if (!beacon) {
        result.reason = "beacon-not-registered";
        return result;
      }

      const updates: Record<string, string | number> = { status: "CONNECTED" };
      if (args.batteryPercent !== undefined) updates.battery_percent = args.batteryPercent;
      if (args.signalDbm !== undefined) updates.signal_dbm = args.signalDbm;
      await ctx.db.patch(beacon._id, updates);

      if (args.buttonPressed) {
        const timestamp = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const eventId = (args.eventId ?? generateEventId()).toLowerCase();
        const beaconLabel = args.beaconHardwareId ?? beacon.device_name;
        const latitude = args.latitude ?? 0;
        const longitude = args.longitude ?? 0;

        const existing = await ctx.db
          .query("active_alert")
          .withIndex("by_user_and_active", (q) =>
            q.eq("user_id", beacon.user_id).eq("is_active", true)
          )
          .order("desc")
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, {
            is_active: true,
            beacon_id: beaconLabel,
            event_id: eventId,
            ble_mode: "e",
            detected_at: timestamp,
            latitude,
            longitude,
            contacts_dispatched: 0,
            dispatch_url: `/track?id=${eventId}`,
          });
        } else {
          await ctx.db.insert("active_alert", {
            user_id: beacon.user_id,
            beacon_id: beaconLabel,
            event_id: eventId,
            ble_mode: "e",
            is_active: true,
            detected_at: timestamp,
            signal_dbm:
              args.signalDbm !== undefined ? `${args.signalDbm} dBm` : "—",
            latitude,
            longitude,
            contacts_dispatched: 0,
            dispatch_url: `/track?id=${eventId}`,
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

        result.alertTriggered = true;
        result.eventId = eventId;
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }
    return result;
  },
});

export type { Doc, Id };
