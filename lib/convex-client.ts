/**
 * Browser-safe Convex HTTP client for Capacitor static export.
 * NEXT_PUBLIC_CONVEX_URL is inlined at build time.
 */

function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  return url.replace(/\/$/, "");
}

async function convexRequest(
  endpoint: "query" | "mutation",
  functionPath: string,
  args: Record<string, unknown>
): Promise<any> {
  const url = `${getConvexUrl()}/api/${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: functionPath,
      format: "convex_encoded_json",
      args: [args],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex ${endpoint} ${functionPath} failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(`Convex ${endpoint} ${functionPath} error: ${data.error.message}`);
  }
  return data.result ?? data.value;
}

export async function convexQuery(
  functionPath: string,
  args: Record<string, unknown> = {}
): Promise<any> {
  return convexRequest("query", functionPath, args);
}

export async function convexMutation(
  functionPath: string,
  args: Record<string, unknown> = {}
): Promise<any> {
  return convexRequest("mutation", functionPath, args);
}

/** Convex docs use `_id`; UI layers key on `id`. */
export function mapDoc<T extends { _id: string }>(doc: T | null | undefined): any {
  if (!doc) return doc ?? null;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export function mapDocs<T extends { _id: string }>(
  docs: T[] | null | undefined
): any[] {
  if (!docs) return [];
  return docs.map((d) => mapDoc(d)!);
}
