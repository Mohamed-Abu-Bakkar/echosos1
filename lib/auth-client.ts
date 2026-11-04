import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

const authBaseURL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
if (!authBaseURL) {
  throw new Error("NEXT_PUBLIC_CONVEX_SITE_URL is required");
}

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  plugins: [convexClient()],
});
