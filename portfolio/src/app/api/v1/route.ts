import { json } from "@/lib/api";
import { buildIndex } from "@/content/api";

// Discovery index — the API's "front door". Generated from the endpoint
// definitions in @/content/api so it cannot drift from the docs page or the
// OpenAPI document. Static: the endpoint map only changes when the code does.
export const dynamic = "force-static";

export function GET() {
  return json(buildIndex());
}
