let convexUrl: string | undefined;

function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  return url;
}

async function convexRequest(
  endpoint: "query" | "mutation",
  functionPath: string,
  args: Record<string, any>,
): Promise<any> {
  const url = `${getConvexUrl()}/api/${endpoint}`;
  const body = JSON.stringify({
    path: functionPath,
    format: "convex_encoded_json",
    args: [args],
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
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

export function convexQuery(functionPath: string, args: Record<string, any>): Promise<any> {
  return convexRequest("query", functionPath, args);
}

export function convexMutation(functionPath: string, args: Record<string, any>): Promise<any> {
  return convexRequest("mutation", functionPath, args);
}
