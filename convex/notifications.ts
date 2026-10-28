import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/authz";

export const getNotifications = query({
  args: { userId: v.id("users"), type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    const results = await ctx.db
      .query("notifications")
      .withIndex("user_id", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .take(500);

    if (!args.type || args.type === "ALL") return results;
    return results.filter((n) => n.type === args.type);
  },
});

export const markAllNotificationsRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("user_id", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .take(500);

    await Promise.all(
      notifications.map((n) => ctx.db.patch(n._id, { is_read: true }))
    );
    return true;
  },
});
