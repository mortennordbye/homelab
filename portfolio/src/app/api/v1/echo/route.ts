import { json, apiError, preflight, requireApiKey } from "@/lib/api";

// Reference write endpoint: proves the authenticated POST seam without any
// persistence. Real stateful writes (guestbook, etc.) build on this pattern
// and add a datastore — see BACKLOG. Reads elsewhere stay public; this one
// refuses unless a valid API key is presented.
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  if (!requireApiKey(req)) return apiError(401, "missing or invalid API key");

  let body: unknown = null;
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    return apiError(400, "body must be valid JSON");
  }

  return json({ ok: true, echo: body }, { cache: "no-store" });
}
