import { json, API_VERSION } from "@/lib/api";
import { site } from "@/content/site";

// Discovery index — the API's "front door". Static: the endpoint map only
// changes when the code does.
export const dynamic = "force-static";

export function GET() {
  return json({
    name: `${site.name} — portfolio API`,
    version: API_VERSION,
    docs: `${site.url}/api/${API_VERSION}`,
    endpoints: [
      { method: "GET", path: "/api/health", desc: "Liveness probe." },
      { method: "GET", path: "/api/v1", desc: "This index." },
      { method: "GET", path: "/api/v1/profile", desc: "Identity, certifications, skills, socials." },
      { method: "GET", path: "/api/v1/infra", desc: "Live Talos cluster status and 30-day uptime." },
      { method: "GET", path: "/api/v1/blog", desc: "Latest posts from blog.nordbye.it." },
      { method: "POST", path: "/api/v1/echo", desc: "Authenticated write example (Bearer key)." },
    ],
    notes: "Reads are public. Writes require an API key.",
  });
}
