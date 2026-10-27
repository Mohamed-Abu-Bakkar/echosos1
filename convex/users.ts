import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("phone"), args.phone))
      .unique();
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      name: args.name,
      phone: args.phone,
      password_hash: args.passwordHash,
      created_at: new Date().toISOString(),
    });

    await ctx.db.insert("beacons", {
      user_id: userId,
      mac_address: `C7:3A:5B:${Math.floor(10 + Math.random() * 89)}:${Math.floor(10 + Math.random() * 89)}:9F`,
      device_name: "ESP32-S3",
      signal_dbm: -45,
      status: "CONNECTED",
      battery_percent: 92,
    });

    await ctx.db.insert("preferences", {
      user_id: userId,
      dark_mode: false,
      language: "en-US",
      notifications_enabled: true,
      sos_sensitivity: "HIGH",
    });

    const defaultContacts = [
      { name: "Mother", phone: "+91 98765 11111", relationship: "Mother", is_primary: true, initials: "MS" },
      { name: "Father", phone: "+91 98765 22222", relationship: "Father", is_primary: false, initials: "FS" },
      { name: "Police Station", phone: "112 / 100", relationship: "Emergency Services", is_primary: false, initials: "AP" },
    ];

    for (const c of defaultContacts) {
      await ctx.db.insert("emergency_contacts", {
        user_id: userId,
        name: c.name,
        phone: c.phone,
        relationship: c.relationship,
        is_primary: c.is_primary,
        photo_url: "",
        initials: c.initials,
      });
    }

    return userId;
  },
});

export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const updates: Record<string, any> = {};
    if (args.name) updates.name = args.name;
    if (args.phone) updates.phone = args.phone;
    if (args.passwordHash) updates.password_hash = args.passwordHash;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.userId, updates);
    }

    return await ctx.db.get(args.userId);
  },
});

export const seedDefaultData = mutation({
  args: {
    userId: v.optional(v.id("users")),
    name: v.string(),
    phone: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    let userId: any = args.userId;

    if (!userId) {
      const existing = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("phone"), args.phone))
        .unique();
      if (existing) return existing._id;

      userId = await ctx.db.insert("users", {
        name: args.name,
        phone: args.phone,
        password_hash: args.passwordHash,
        created_at: new Date().toISOString(),
      });
    }

    const hasBeacon = await ctx.db
      .query("beacons")
      .filter((q) => q.eq(q.field("user_id"), userId))
      .unique();

    if (!hasBeacon) {
      await ctx.db.insert("beacons", {
        user_id: userId,
        mac_address: "C7:3A:5B:12:4E:9F",
        device_name: "ESP32-S3",
        signal_dbm: -45,
        status: "CONNECTED",
        battery_percent: 88,
      });
    }

    const contactData = [
      { name: "Mother", phone: "+91 98765 11111", relationship: "Mother", is_primary: true, initials: "MS" },
      { name: "Father", phone: "+91 98765 22222", relationship: "Father", is_primary: false, initials: "FS" },
      { name: "Police Station", phone: "112 / 100", relationship: "Emergency Services", is_primary: false, initials: "AP" },
    ];

    const existingContacts = await ctx.db
      .query("emergency_contacts")
      .filter((q) => q.eq(q.field("user_id"), userId))
      .collect();

    if (existingContacts.length === 0) {
      for (const c of contactData) {
        await ctx.db.insert("emergency_contacts", {
          user_id: userId,
          name: c.name,
          phone: c.phone,
          relationship: c.relationship,
          is_primary: c.is_primary,
          photo_url: "",
          initials: c.initials,
        });
      }
    }

    const existingPrefs = await ctx.db
      .query("preferences")
      .filter((q) => q.eq(q.field("user_id"), userId))
      .unique();

    if (!existingPrefs) {
      await ctx.db.insert("preferences", {
        user_id: userId,
        dark_mode: false,
        language: "en-US",
        notifications_enabled: true,
        sos_sensitivity: "HIGH",
      });
    }

    const existingHistory = await ctx.db
      .query("alert_history")
      .filter((q) => q.eq(q.field("user_id"), userId))
      .collect();

    if (existingHistory.length === 0) {
      const historyData = [
        { event_type: "SOS_ALERT", status_badge: "Alert Sent", latitude: 10.8247, longitude: 78.6956, created_at: "28 Apr 2025, 10:24 AM" },
        { event_type: "CONTACT_DELIVERED", status_badge: "Delivered", latitude: 10.8247, longitude: 78.6956, created_at: "28 Apr 2025, 10:24 AM" },
        { event_type: "BEACON_CONNECTED", status_badge: "Connected", latitude: 10.8247, longitude: 78.6956, created_at: "28 Apr 2025, 09:15 AM" },
        { event_type: "SYSTEM_UPDATE", status_badge: "Updated", latitude: null, longitude: null, created_at: "27 Apr 2025, 06:30 PM" },
        { event_type: "LOW_BATTERY", status_badge: "Warning", latitude: 10.8210, longitude: 78.6910, created_at: "26 Apr 2025, 02:10 PM" },
      ];

      for (const h of historyData) {
        await ctx.db.insert("alert_history", {
          user_id: userId,
          beacon_id: undefined,
          event_type: h.event_type as any,
          status_badge: h.status_badge,
          latitude: h.latitude === null ? undefined : h.latitude,
          longitude: h.longitude === null ? undefined : h.longitude,
          created_at: h.created_at,
        });
      }
    }

    const existingNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("user_id"), userId))
      .collect();

    if (existingNotifications.length === 0) {
      const notifData = [
        { type: "SOS", title: "SOS Emergency Alert Triggered", message: "Beacon triggered alert. Telemetry and live coordinates dispatched to 3 trusted contacts.", is_read: false, created_at: "28 Apr 2025, 10:24 AM" },
        { type: "SOS", title: "Alert Delivered to Mother (MS)", message: "SMS and Push Notification successfully confirmed with GPS tracking link.", is_read: false, created_at: "28 Apr 2025, 10:24 AM" },
        { type: "SYSTEM", title: "ESP32-S3 Beacon Connected", message: "Device connected via Bluetooth Low Energy with strong signal (-45 dBm).", is_read: true, created_at: "28 Apr 2025, 09:15 AM" },
        { type: "UPDATES", title: "EchoSOS System Update v1.2", message: "New high-speed emergency routing algorithm and battery life improvements enabled.", is_read: true, created_at: "27 Apr 2025, 06:30 PM" },
        { type: "SYSTEM", title: "Beacon Battery Status Warning", message: "Beacon battery reached 20%. Please connect magnetic charger.", is_read: true, created_at: "26 Apr 2025, 02:10 PM" },
      ];

      for (const n of notifData) {
        await ctx.db.insert("notifications", {
          user_id: userId,
          type: n.type as any,
          title: n.title,
          message: n.message,
          is_read: n.is_read,
          created_at: n.created_at,
        });
      }
    }

    return userId;
  },
});
