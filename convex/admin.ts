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
  const user: { email?: string } | null = await authComponent.getAuthUser(ctx);
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
  returns: v.object({
    activeAlerts: v.array(v.any()),
    recentEvents: v.array(v.any()),
    usersSample: v.number(),
    usersSampleMayBeTruncated: v.boolean(),
    beaconsSample: v.number(),
    beaconsSampleMayBeTruncated: v.boolean(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [activeRows, users, beacons, recentEvents] = await Promise.all([
      ctx.db.query("active_alert").order("desc").take(500),
      ctx.db.query("users").order("desc").take(501),
      ctx.db.query("beacons").order("desc").take(501),
      ctx.db.query("alert_history").order("desc").take(20),
    ]);

    const enrichedAlerts = await Promise.all(
      activeRows.filter((alert) => alert.is_active).map(async (alert) => {
        const [owner, contacts] = await Promise.all([
          ctx.db.get(alert.user_id),
          ctx.db.query("emergency_contacts")
            .withIndex("user_id", (q) => q.eq("user_id", alert.user_id))
            .collect(),
        ]);
        return {
          ...alert,
          user_name: owner?.name ?? "Unknown user",
          user_phone: owner?.phone ?? "",
          emergency_contact_count: contacts.length,
        };
      }),
    );

    return {
      activeAlerts: enrichedAlerts,
      recentEvents,
      usersSample: Math.min(users.length, 500),
      usersSampleMayBeTruncated: users.length > 500,
      beaconsSample: Math.min(beacons.length, 500),
      beaconsSampleMayBeTruncated: beacons.length > 500,
    };
  },
});

export const listUsers = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    id: v.id("users"),
    name: v.string(),
    phone: v.string(),
    createdAt: v.string(),
  })),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 50), 100));
    const users = await ctx.db.query("users").order("desc").take(limit);
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
  returns: v.array(v.object({
    id: v.id("beacons"),
    userId: v.id("users"),
    macAddress: v.string(),
    deviceName: v.string(),
    signalDbm: v.number(),
    status: v.union(v.literal("CONNECTED"), v.literal("READY_TO_PAIR"), v.literal("DISCONNECTED")),
    batteryPercent: v.number(),
  })),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 50), 100));
    const beacons = await ctx.db.query("beacons").order("desc").take(limit);
    return beacons.map((beacon) => ({
      id: beacon._id,
      userId: beacon.user_id,
      macAddress: beacon.mac_address,
      deviceName: beacon.device_name,
      signalDbm: beacon.signal_dbm,
      status: beacon.status,
      batteryPercent: beacon.battery_percent,
    }));
  },
});

export const listEmergencyContacts = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    id: v.id("emergency_contacts"),
    userId: v.id("users"),
    userName: v.string(),
    userPhone: v.string(),
    name: v.string(),
    phone: v.string(),
    relationship: v.string(),
    isPrimary: v.boolean(),
    initials: v.string(),
    photoUrl: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 50), 100));
    const contacts = await ctx.db.query("emergency_contacts").order("desc").take(limit);
    const rows = await Promise.all(contacts.map(async (contact) => {
      const owner = await ctx.db.get(contact.user_id);
      return {
        id: contact._id,
        userId: contact.user_id,
        userName: owner?.name ?? "Unknown user",
        userPhone: owner?.phone ?? "",
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
        isPrimary: contact.is_primary,
        initials: contact.initials,
        ...(contact.photo_url ? { photoUrl: contact.photo_url } : {}),
      };
    }));
    return rows;
  },
});

export const listAlertHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 50), 100));
    return await ctx.db.query("alert_history")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);
  },
});
