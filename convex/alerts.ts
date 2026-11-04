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

export const getActiveAlert = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    const active = await ctx.db
      .query("active_alert")
      .withIndex("by_user_and_active", (q) =>
        q.eq("user_id", args.userId).eq("is_active", true)
      )
      .order("desc")
      .first();
    if (active) return active;

    return await ctx.db
      .query("active_alert")
      .withIndex("by_user_and_active", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .first();
  },
});

/** Public lookup for shared /track?id= links (no session). */
export const getAlertByEventId = query({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const eventKey = args.eventId.toLowerCase();
    return await ctx.db
      .query("active_alert")
      .withIndex("by_event_id", (q) => q.eq("event_id", eventKey))
      .unique();
  },
});

async function getUserActiveAlert(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<Doc<"active_alert"> | null> {
  return await ctx.db
    .query("active_alert")
    .withIndex("by_user_and_active", (q) =>
      q.eq("user_id", userId).eq("is_active", true)
    )
    .order("desc")
    .first();
}

export const triggerAlert = mutation({
  args: {
    userId: v.id("users"),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
    beaconId: v.optional(v.string()),
    eventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    const latitude = args.latitude ?? 0;
    const longitude = args.longitude ?? 0;
    const timestamp = new Date().toISOString();
    const eventId = (args.eventId ?? generateEventId()).toLowerCase();

    const beacon = await ctx.db
      .query("beacons")
      .withIndex("user_id", (q) => q.eq("user_id", args.userId))
      .unique();
    const beaconId = args.beaconId ?? beacon?.device_name ?? "No beacon";

    const existing = await getUserActiveAlert(ctx, args.userId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        is_active: true,
        beacon_id: beaconId,
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
        user_id: args.userId,
        beacon_id: beaconId,
        event_id: eventId,
        ble_mode: "e",
        is_active: true,
        detected_at: timestamp,
        signal_dbm: "—",
        latitude,
        longitude,
        contacts_dispatched: 0,
        dispatch_url: `/track?id=${eventId}`,
      });
    }

    const historyId = await ctx.db.insert("alert_history", {
      user_id: args.userId,
      beacon_id: undefined,
      event_type: "SOS_ALERT",
      status_badge: "Alert Sent",
      latitude: args.latitude,
      longitude: args.longitude,
      created_at: timestamp,
    });

    const contactCount = await ctx.db
      .query("emergency_contacts")
      .withIndex("user_id", (q) => q.eq("user_id", args.userId))
      .collect();

    await ctx.db.insert("notifications", {
      user_id: args.userId,
      type: "SOS",
      title: "Emergency Distress Broadcasted",
      message: `SOS incident recorded at (${latitude.toFixed(4)}, ${longitude.toFixed(4)}). ${contactCount.length} emergency contact(s) configured. SMS delivery is processed separately and is not confirmed yet. Event ${eventId}. Tracking: /track?id=${eventId}`,
      is_read: false,
      created_at: timestamp,
    });

    return { historyId, eventId, beaconId };
  },
});

export const cancelAlert = mutation({
  args: {
    userId: v.id("users"),
    eventId: v.optional(v.string()),
    bleVerified: v.optional(v.boolean()),
    beaconId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    const existing = await getUserActiveAlert(ctx, args.userId);
    if (!existing) return { cancelled: false as const, reason: "no-active-alert" };

    if (args.eventId && existing.event_id) {
      const requested = args.eventId.toLowerCase();
      if (existing.event_id.toLowerCase() !== requested) {
        return {
          cancelled: false as const,
          reason: "event-id-mismatch",
          activeEventId: existing.event_id,
        };
      }
    }

    await ctx.db.patch(existing._id, {
      is_active: false,
      ble_mode: "c",
      ...(args.beaconId ? { beacon_id: args.beaconId } : {}),
    });

    await ctx.db.insert("alert_history", {
      user_id: args.userId,
      beacon_id: undefined,
      event_type: "SYSTEM_UPDATE",
      status_badge: "Warning",
      latitude: existing.latitude,
      longitude: existing.longitude,
      created_at: new Date().toISOString(),
    });

    const verifyNote = args.bleVerified
      ? "Beacon GATT confirmed the event ID."
      : "Cancelled from app without GATT confirmation.";

    await ctx.db.insert("notifications", {
      user_id: args.userId,
      type: "SYSTEM",
      title: "SOS Alert Cancelled by User",
      message: `SOS event ${existing.event_id} was cancelled in EchoSOS. Contact cancellation messages are not sent by this app yet. ${verifyNote}`,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    return {
      cancelled: true as const,
      eventId: existing.event_id,
      bleVerified: Boolean(args.bleVerified),
    };
  },
});

export const getAlertHistory = query({
  args: { userId: v.id("users"), filter: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    const rows = await ctx.db
      .query("alert_history")
      .withIndex("user_id", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .take(500);

    if (!args.filter || args.filter === "ALL") return rows;
    if (args.filter === "SOS") {
      return rows.filter(
        (a) => a.event_type === "SOS_ALERT" || a.event_type === "CONTACT_DELIVERED"
      );
    }
    if (args.filter === "SYSTEM") {
      return rows.filter(
        (a) => a.event_type === "BEACON_CONNECTED" || a.event_type === "LOW_BATTERY"
      );
    }
    if (args.filter === "UPDATES") {
      return rows.filter((a) => a.event_type === "SYSTEM_UPDATE");
    }
    return rows;
  },
});

/** Records the result returned by Android's device-SIM SMS sender. */
export const recordSmsDelivery = mutation({
  args: {
    userId: v.id("users"),
    eventId: v.string(),
    contactName: v.string(),
    contactPhone: v.string(),
    status: v.string(),
    detail: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    if (args.status === "SMS Submitted") {
      const active = await ctx.db
        .query("active_alert")
        .withIndex("by_event_id", (q) => q.eq("event_id", args.eventId))
        .first();
      if (active) {
        await ctx.db.patch(active._id, {
          contacts_dispatched: active.contacts_dispatched + 1,
        });
      }
    }
    await ctx.db.insert("alert_history", {
      user_id: args.userId,
      event_type: "CONTACT_DELIVERED",
      status_badge: args.status,
      created_at: new Date().toISOString(),
    });
    await ctx.db.insert("notifications", {
      user_id: args.userId,
      type: "SOS",
      title: args.status,
      message: args.contactName + " (" + args.contactPhone + "): " + args.detail + " Incident " + args.eventId + ".",
      is_read: false,
      created_at: new Date().toISOString(),
    });
    return true;
  },
});
