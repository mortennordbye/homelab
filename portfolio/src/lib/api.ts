import { timingSafeEqual } from "node:crypto";

/**
 * Shared helpers for the public portfolio API under /api/v1.
 *
 * Reads are public (permissive CORS); writes go through requireApiKey().
 * Keep this dependency-free so the API surface stays small and auditable.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

/** JSON response with permissive CORS + sensible caching for public reads. */
export function json(
  data: unknown,
  init?: { status?: number; cache?: string },
): Response {
  return new Response(JSON.stringify(data, null, 2) + "\n", {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": init?.cache ?? "public, max-age=60",
      ...CORS_HEADERS,
    },
  });
}

/** Uniform error envelope. */
export function apiError(status: number, message: string): Response {
  return json({ error: { status, message } }, { status, cache: "no-store" });
}

/** CORS preflight — export as OPTIONS from any route that needs it. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Gate for write endpoints. Compares a Bearer token (or x-api-key header)
 * against PORTFOLIO_API_KEY in constant time. Returns true when authorised.
 * If the key isn't configured, writes are always refused.
 */
export function requireApiKey(req: Request): boolean {
  const expected = process.env.PORTFOLIO_API_KEY;
  if (!expected) return false;

  const header = req.headers.get("authorization");
  const presented =
    header?.toLowerCase().startsWith("bearer ")
      ? header.slice(7).trim()
      : (req.headers.get("x-api-key")?.trim() ?? "");
  if (!presented) return false;

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
