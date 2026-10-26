import { ConvexReactClient } from "convex/react";

let convex: ConvexReactClient | null = null;

export function getConvex(): ConvexReactClient {
  if (!convex) {
    convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  }
  return convex;
}

export function initConvex(url: string): ConvexReactClient {
  convex = new ConvexReactClient(url);
  return convex;
}
