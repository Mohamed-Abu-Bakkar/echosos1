"use client";

import type { ComponentProps, ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient as ComponentProps<typeof ConvexBetterAuthProvider>["authClient"]}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
