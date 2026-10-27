import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    phone: v.string(),
    password_hash: v.string(),
    created_at: v.string(),
  }).index("phone", ["phone"]),

  beacons: defineTable({
    user_id: v.id("users"),
    mac_address: v.string(),
    device_name: v.string(),
    signal_dbm: v.number(),
    status: v.union(
      v.literal("CONNECTED"),
      v.literal("READY_TO_PAIR"),
      v.literal("DISCONNECTED")
    ),
    battery_percent: v.number(),
  })
    .index("user_id", ["user_id"])
    .index("mac_address", ["mac_address"]),

  emergency_contacts: defineTable({
    user_id: v.id("users"),
    name: v.string(),
    phone: v.string(),
    relationship: v.string(),
    is_primary: v.boolean(),
    photo_url: v.optional(v.string()),
    initials: v.string(),
  }).index("user_id", ["user_id"]),

  alert_history: defineTable({
    user_id: v.id("users"),
    beacon_id: v.optional(v.id("beacons")),
    event_type: v.union(
      v.literal("SOS_ALERT"),
      v.literal("CONTACT_DELIVERED"),
      v.literal("BEACON_CONNECTED"),
      v.literal("SYSTEM_UPDATE"),
      v.literal("LOW_BATTERY")
    ),
    status_badge: v.string(),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
    created_at: v.string(),
  }).index("user_id", ["user_id"]),

  notifications: defineTable({
    user_id: v.id("users"),
    type: v.union(v.literal("SOS"), v.literal("SYSTEM"), v.literal("UPDATES")),
    title: v.string(),
    message: v.string(),
    is_read: v.boolean(),
    created_at: v.string(),
  }).index("user_id", ["user_id"]),

  preferences: defineTable({
    user_id: v.id("users"),
    dark_mode: v.boolean(),
    language: v.string(),
    notifications_enabled: v.boolean(),
    sos_sensitivity: v.union(v.literal("HIGH"), v.literal("MEDIUM"), v.literal("LOW")),
  }).index("user_id", ["user_id"]),

  active_alert: defineTable({
    user_id: v.id("users"),
    beacon_id: v.string(),
    /** Compact 8-hex event id shared with BLE advertisement + GATT Event State. */
    event_id: v.optional(v.string()),
    /** BLE mode that opened this event: emergency (e) or cancel (c) when cancelling. */
    ble_mode: v.optional(v.union(v.literal("e"), v.literal("c"))),
    is_active: v.boolean(),
    detected_at: v.string(),
    signal_dbm: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    contacts_dispatched: v.number(),
    dispatch_url: v.string(),
  })
    .index("by_event_id", ["event_id"])
    .index("by_user_and_active", ["user_id", "is_active"]),
});
