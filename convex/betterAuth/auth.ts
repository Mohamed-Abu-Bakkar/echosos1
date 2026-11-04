import { createAuth } from "../auth";

// Static Better Auth instance used by the Better Auth CLI to generate schema.
// This file is a schema-generation entrypoint and must not be imported at runtime.
export const auth = createAuth({} as never);
