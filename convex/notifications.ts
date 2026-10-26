import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getNotifications = query({
  args: { userId: v.id("users"), type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let query = ctx.db.query("notifications").filter((q) =>
      q.eq(q.field("user_id"), args.userId)
    );

    const results = await query.order("desc").collect();

    if (!args.type || args.type === "ALL") return results;
    return results.filter((n) => n.type === args.type);
  },
});

export const markAllNotificationsRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("user_id"), args.userId))
      .collect();

    await Promise.all(
      notifications.map((n) => ctx.db.patch(n._id, { is_read: true }))
    );
  },
});
