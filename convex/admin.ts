import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Admin endpoints are deliberately read-only in this first backend increment.
 * The only permitted administrator is the address configured in ADMIN_EMAIL.
 * Never accept a user id or role from the browser as proof of authorization.
 */
async function requireAdmin(ctx: { auth: { getUserIdentity: () => Promise<{ email?: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const identityEmail = identity?.email?.trim().toLowerCase();

  if (!identityEmail || !configuredEmail || identityEmail !== configuredEmail) {
    throw new Error("Administrator access required");
  }
  return identityEmail;
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

    const [activeAlerts, recentEvents, users, beacons] = await Promise.all([
      ctx.db.query("active_alert").withIndex("by_active", (q) => q.eq("is_active", true)).order("desc").take(100),
      ctx.db.query("alert_history").withIndex("by_created_at").order("desc").take(20),
      ctx.db.query("users").order("desc").take(501),
      ctx.db.query("beacons").order("desc").take(501),
    ]);

    return {
      activeAlerts,
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
