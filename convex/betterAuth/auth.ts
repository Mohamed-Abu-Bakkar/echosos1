import { createAuth } from "../auth";

// Static Better Auth instance used only by the Better Auth CLI to generate schema.
// This file must not be imported by runtime Convex functions.
export const auth = createAuth({} as never);
export default auth;
