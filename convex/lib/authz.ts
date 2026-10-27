import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

/** Ensure the calling client-supplied userId exists (basic existence gate). */
export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<Doc<"users">> {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("Unknown user");
  }
  return user;
}

/** Ensure a contact exists and belongs to userId. */
export async function requireOwnedContact(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  contactId: Id<"emergency_contacts">
): Promise<Doc<"emergency_contacts"> | null> {
  const contact = await ctx.db.get(contactId);
  if (!contact) return null;
  if (contact.user_id !== userId) {
    throw new Error("Contact does not belong to this user");
  }
  return contact;
}

/** Strip password hash before returning a user document to any client. */
export function publicUser(user: Doc<"users">) {
  const { password_hash: _ignored, ...rest } = user;
  return rest;
}
