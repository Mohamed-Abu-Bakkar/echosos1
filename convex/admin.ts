import { query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "./_generated/dataModel";

/**
 * Read-only administration API consumed by the separate echoSOS-admin app.
 * Every query checks the signed-in Better Auth identity against ADMIN_EMAIL.
 */
async function requireAdmin(ctx: GenericCtx<DataModel>) {
  const user = await authComponent.getAuthUser(ctx);
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const signedInEmail =
    typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";

  if (!configuredEmail || !signedInEmail || signedInEmail !== configuredEmail) {
    throw new Error("Administrator access denied.");
  }
  return user;
}

function boundedLimit(value: number | undefined, fallback = 100): number {
  return Math.max(1, Math.min(500, Math.floor(value ?? fallback)));
}

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [activeRows, users, beacons, recentEvents] = await Promise.all([
      ctx.db.query("active_alert").order("desc").take(500),
      ctx.db.query("users").order("desc").take(501),
      ctx.db.query("beacons").order("desc").take(501),
      ctx.db.query("alert_history").order("desc").take(20),
    ]);

    return {
      activeAlerts: activeRows.filter((alert) => alert.is_active),
      usersSample: Math.min(users.length, 500),
      usersSampleMayBeTruncated: users.length > 500,
      beaconsSample: Math.min(beacons.length, 500),
      beaconsSampleMayBeTruncated: beacons.length > 500,
      recentEvents,
    };
  },
});

export const listUsers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const users = await ctx.db
      .query("users")
      .order("desc")
      .take(boundedLimit(args.limit));
    return users.map((user) => ({
      id: user._id,
      name: user.name,
      phone: user.phone,
      createdAt: user.created_at,
    }));
  },
});

export const listBeacons = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const beacons = await ctx.db
      .query("beacons")
      .order("desc")
      .take(boundedLimit(args.limit));
    return beacons.map((beacon) => ({
      id: beacon._id,
      deviceName: beacon.device_name,
      macAddress: beacon.mac_address,
      status: beacon.status,
      batteryPercent: beacon.battery_percent,
      signalDbm: beacon.signal_dbm,
    }));
  },
});

export const listEmergencyContacts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const contacts = await ctx.db
      .query("emergency_contacts")
      .order("desc")
      .take(boundedLimit(args.limit));
    const users = await Promise.all(
      contacts.map((contact) => ctx.db.get(contact.user_id))
    );

    return contacts.map((contact, index) => ({
      id: contact._id,
      userName: users[index]?.name ?? "Unknown user",
      userPhone: users[index]?.phone ?? "",
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      isPrimary: contact.is_primary,
      initials: contact.initials,
    }));
  },
});

export const listAlertHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("alert_history")
      .order("desc")
      .take(boundedLimit(args.limit));
  },
});
