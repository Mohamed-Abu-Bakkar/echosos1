let convexUrl: string | null = null;

function getConvexUrl(): string {
  if (!convexUrl) {
    convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  }
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  return convexUrl;
}

async function convexQuery(functionPath: string, args: Record<string, any>): Promise<any> {
  const res = await fetch(`${getConvexUrl()}/api/v1/query/${functionPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });
  if (!res.ok) throw new Error(`Convex query ${functionPath} failed: ${res.statusText}`);
  const data = await res.json();
  return data.data;
}

async function convexMutation(functionPath: string, args: Record<string, any>): Promise<any> {
  const res = await fetch(`${getConvexUrl()}/api/v1/mutation/${functionPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });
  if (!res.ok) throw new Error(`Convex mutation ${functionPath} failed: ${res.statusText}`);
  const data = await res.json();
  return data.data;
}

export { convexQuery, convexMutation };
