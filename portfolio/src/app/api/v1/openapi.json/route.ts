import { json } from "@/lib/api";
import { buildOpenApi } from "@/content/api";

// OpenAPI 3.1 document, generated from the endpoint definitions in
// @/content/api. Static: the spec only changes when the code does.
export const dynamic = "force-static";

export function GET() {
  return json(buildOpenApi());
}
