import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getContacts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emergency_contacts")
      .filter((q) => q.eq(q.field("user_id"), args.userId))
      .order("desc")
      .collect();
  },
});

export const createContact = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    phone: v.string(),
    relationship: v.string(),
    isPrimary: v.optional(v.boolean()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const initials = args.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    if (args.isPrimary) {
      await ctx.db
        .query("emergency_contacts")
        .filter((q) => q.eq(q.field("user_id"), args.userId))
        .collect()
        .then((contacts) =>
          Promise.all(
            contacts.map((c) => ctx.db.patch(c._id, { is_primary: false }))
          )
        );
    }

    const contactId = await ctx.db.insert("emergency_contacts", {
      user_id: args.userId,
      name: args.name,
      phone: args.phone,
      relationship: args.relationship,
      is_primary: Boolean(args.isPrimary),
      photo_url: args.photoUrl || "",
      initials: initials || "EC",
    });

    return contactId;
  },
});

export const updateContact = mutation({
  args: {
    contactId: v.id("emergency_contacts"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    relationship: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) return null;

    if (args.isPrimary) {
      await ctx.db
        .query("emergency_contacts")
        .filter((q) => q.eq(q.field("user_id"), contact.user_id))
        .collect()
        .then((contacts) =>
          Promise.all(
            contacts.map((c) => ctx.db.patch(c._id, { is_primary: false }))
          )
        );
    }

    const updates: Record<string, any> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.relationship !== undefined) updates.relationship = args.relationship;
    if (args.isPrimary !== undefined) updates.is_primary = args.isPrimary;
    if (args.photoUrl !== undefined) updates.photo_url = args.photoUrl;

    await ctx.db.patch(args.contactId, updates);
    return await ctx.db.get(args.contactId);
  },
});

export const deleteContact = mutation({
  args: { contactId: v.id("emergency_contacts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.contactId);
    return true;
  },
});
