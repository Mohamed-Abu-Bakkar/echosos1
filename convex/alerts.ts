import { action, internalMutation, query, mutation, MutationCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
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

/** Send one emergency SMS per saved contact through a server-side Twilio account. */
export const sendEmergencySms = action({
  args: {
    userId: v.id("users"),
    eventId: v.string(),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from) {
      return { configured: false, queued: 0, failed: 0, message: "SOS saved. SMS provider is not configured, so no SMS was sent." };
    }
    const contacts = await ctx.runQuery(api.contacts.getContacts, { userId: args.userId });
    const priorNotifications = await ctx.runQuery(api.notifications.getNotifications, { userId: args.userId, type: "SOS" });
    const appUrlValue = process.env.ECHOSOS_APP_URL;
    const appUrl = appUrlValue && appUrlValue.endsWith("/") ? appUrlValue.slice(0, -1) : appUrlValue;
    const location = typeof args.latitude === "number" && typeof args.longitude === "number"
      ? "https://maps.google.com/?q=" + args.latitude + "," + args.longitude
      : "Location unavailable; please contact the user immediately.";
    const tracking = appUrl ? appUrl + "/track?id=" + encodeURIComponent(args.eventId) : "Event ID: " + args.eventId;
    const body = ["ECHOSOS EMERGENCY ALERT", "An SOS beacon has been activated. Please contact the user and arrange help.", "Location: " + location, "Incident: " + tracking].join(String.fromCharCode(10));
    let queued = 0;
    let failed = 0;
    for (const contact of contacts.slice(0, 5)) {
      const alreadyQueued = priorNotifications.some((notification) =>
        notification.title === "SMS Queued" &&
        notification.message.includes(args.eventId) &&
        notification.message.includes(contact.phone)
      );
      if (alreadyQueued) continue;
      let status = "SMS Failed";
      let detail = "SMS request failed";
      try {
        const form = new URLSearchParams({ To: contact.phone, From: from, Body: body });
        const response = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json", {
          method: "POST",
          headers: { Authorization: "Basic " + btoa(sid + ":" + token), "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
        const payload = await response.json() as { sid?: string; status?: string; message?: string };
        if (response.ok && payload.sid) {
          queued += 1;
          status = "SMS Queued";
          detail = "Twilio accepted the SMS (" + (payload.status || "queued") + "). Handset delivery is not yet confirmed.";
        } else {
          failed += 1;
          detail = payload.message || ("Twilio returned HTTP " + response.status);
        }
      } catch (error) {
        failed += 1;
        detail = error instanceof Error ? error.message : "SMS request failed";
      }
      await ctx.runMutation(internal.alerts.recordSmsDelivery, {
        userId: args.userId, eventId: args.eventId, contactName: contact.name,
        contactPhone: contact.phone, status, detail,
      });
    }
    return {
      configured: true, queued, failed, total: contacts.length,
      message: contacts.length === 0
        ? "No emergency contacts are saved; no SMS was sent."
        : queued + " SMS message(s) accepted by Twilio; " + failed + " failed. Delivery to handsets is not confirmed.",
    };
  },
});

export const recordSmsDelivery = internalMutation({
  args: {
    userId: v.id("users"), eventId: v.string(), contactName: v.string(),
    contactPhone: v.string(), status: v.string(), detail: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("alert_history", {
      user_id: args.userId, event_type: "CONTACT_DELIVERED",
      status_badge: args.status, created_at: new Date().toISOString(),
    });
    await ctx.db.insert("notifications", {
      user_id: args.userId, type: "SOS", title: args.status,
      message: args.contactName + " (" + args.contactPhone + "): " + args.detail + " Incident " + args.eventId + ".",
      is_read: false, created_at: new Date().toISOString(),
    });
  },
});
