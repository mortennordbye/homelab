/**
 * Single source of truth for the public API surface under /api.
 *
 * Three consumers derive from this module and must never be edited to
 * describe an endpoint directly:
 *   - the human docs page at /api            (src/app/api/page.tsx)
 *   - the machine index at /api/v1           (src/app/api/v1/route.ts)
 *   - the OpenAPI document at /api/v1/openapi.json
 *
 * Adding a route means adding an entry here and nothing else. Sample bodies
 * are real objects (not display strings) so the same value renders on the
 * page and serves as the OpenAPI example — keep them short but valid, and
 * re-check them against the live endpoint when a route changes.
 */
import { site } from "@/content/site";

export const API_VERSION = "v1";

/** JSON Schema fragment. Loose by design — this module writes them by hand. */
type Schema = Record<string, unknown>;

export type Endpoint = {
  method: "GET" | "POST";
  operationId: string;
  path: string;
  auth: "public" | "api key";
  summary: string;
  detail: string;
  caching: string;
  curl: string;
  sample: unknown;
  /** Response body schema, typed down to the field level. */
  schema: Schema;
  /**
   * Failure responses the handler can actually return, beyond the 401 that
   * every authenticated route gets automatically. Message strings must match
   * what the route passes to apiError().
   */
  errors?: readonly { status: number; description: string; message: string }[];
};

// Shorthands so the schemas below stay readable at a glance.
const str: Schema = { type: "string" };
const int: Schema = { type: "integer" };
const bool: Schema = { type: "boolean" };
const dateTime: Schema = { type: "string", format: "date-time" };
const uri: Schema = { type: "string", format: "uri" };

function obj(properties: Record<string, Schema>, required?: string[]): Schema {
  return {
    type: "object",
    properties,
    required: required ?? Object.keys(properties),
  };
}

function arr(items: Schema): Schema {
  return { type: "array", items };
}

export const apiIntro = {
  base: site.url,
  blurb:
    "The site serves its own content over a small JSON API. Reads are public and need no key, responses carry permissive CORS headers so they work from a browser, and every route returns the same error envelope. It runs in the same Node process as the pages you are reading, on the cluster described on the infrastructure page.",
};

export const endpoints: readonly Endpoint[] = [
  {
    method: "GET",
    operationId: "getHealth",
    path: "/api/health",
    auth: "public",
    summary: "Liveness probe.",
    detail:
      "Unversioned and always dynamic, so it reflects the running process rather than a build-time cache. This is the target Kubernetes uses for its probes.",
    caching: "no-store",
    curl: "curl -s https://nordbye.it/api/health",
    sample: { status: "ok" },
    schema: obj({ status: { type: "string", enum: ["ok"] } }),
  },
  {
    method: "GET",
    operationId: "getIndex",
    path: "/api/v1",
    auth: "public",
    summary: "Discovery index.",
    detail:
      "The front door: a machine-readable map of every endpoint, generated from the same source as this page. Static, because the map only changes when the code does.",
    caching: "public, max-age=60",
    curl: "curl -s https://nordbye.it/api/v1",
    // Shape excerpt. The live response lists every endpoint below.
    sample: {
      name: "Morten Nordbye — portfolio API",
      version: "v1",
      docs: "https://nordbye.it/api",
      openapi: "https://nordbye.it/api/v1/openapi.json",
      endpoints: [
        { method: "GET", path: "/api/health", desc: "Liveness probe." },
      ],
      notes: "Reads are public. Writes require an API key.",
    },
    schema: obj({
      name: str,
      version: str,
      docs: uri,
      openapi: uri,
      endpoints: arr(
        obj({
          method: { type: "string", enum: ["GET", "POST"] },
          path: str,
          desc: str,
        }),
      ),
      notes: str,
    }),
  },
  {
    method: "GET",
    operationId: "getOpenapi",
    path: "/api/v1/openapi.json",
    auth: "public",
    summary: "OpenAPI 3.1 document.",
    detail:
      "The whole surface as a spec you can import into Postman, Bruno, Swagger UI or a client generator. Generated from the same endpoint definitions that render this page, so it cannot drift from the routes it describes.",
    caching: "public, max-age=60",
    curl: "curl -s https://nordbye.it/api/v1/openapi.json",
    sample: {
      openapi: "3.1.0",
      info: { title: "Morten Nordbye — portfolio API", version: "v1" },
      servers: [{ url: "https://nordbye.it" }],
      paths: { "/api/health": { get: { operationId: "getHealth" } } },
    },
    // The response is itself an OpenAPI document; describing its full grammar
    // here would restate the OpenAPI meta-schema, so pin the top level only.
    schema: {
      type: "object",
      properties: {
        openapi: { type: "string", const: "3.1.0" },
        info: { type: "object" },
        servers: { type: "array" },
        components: { type: "object" },
        paths: { type: "object" },
      },
      required: ["openapi", "info", "paths"],
      additionalProperties: true,
    },
  },
  {
    method: "GET",
    operationId: "getProfile",
    path: "/api/v1/profile",
    auth: "public",
    summary: "Identity, certifications, skills and socials.",
    detail:
      "Served straight from the content modules that render the site itself, so the API and the pages can never disagree. Refreshed on each deploy.",
    caching: "public, max-age=60",
    curl: "curl -s https://nordbye.it/api/v1/profile",
    sample: {
      name: "Morten Nordbye",
      role: "Cloud Engineer & Architect",
      location: "Oslo, Norway",
      url: "https://nordbye.it",
      summary: "Cloud engineer working on automated, secure infrastructure…",
      socials: [{ label: "GitHub", href: "https://github.com/mortennordbye" }],
      certifications: [
        {
          title: "CKA: Certified Kubernetes Administrator",
          issuer: "The Linux Foundation",
          date: "Jan 2024",
        },
      ],
      skills: [{ label: "Kubernetes", level: 80, group: "platform" }],
    },
    schema: obj({
      name: str,
      role: str,
      location: str,
      url: uri,
      summary: str,
      socials: arr(obj({ label: str, href: uri })),
      certifications: arr(
        obj(
          {
            title: str,
            issuer: str,
            date: str,
            // Omitted entirely for certifications without a public ID.
            credentialId: str,
          },
          ["title", "issuer", "date"],
        ),
      ),
      skills: arr(
        obj({
          label: str,
          // Proficiency as a percentage, the scale the skill bars render.
          level: { type: "integer", minimum: 0, maximum: 100 },
          group: str,
        }),
      ),
    }),
  },
  {
    method: "GET",
    operationId: "getInfra",
    path: "/api/v1/infra",
    auth: "public",
    summary: "Live Talos cluster status and 30-day history.",
    detail:
      "A CronJob in the cluster writes a status ConfigMap every five minutes; it is mounted into the pod and read fresh per request. When the file is not mounted the route falls back to a baked snapshot and marks it with a source field. This is what drives the infrastructure page.",
    caching: "public, max-age=30",
    curl: "curl -s https://nordbye.it/api/v1/infra",
    sample: {
      generatedAt: "2026-07-19T08:05:03Z",
      build: "0.0.80",
      argocd: { sync: "Synced", health: "Healthy" },
      nodes: { ready: 6, total: 6 },
      versions: { kubernetes: "v1.34.0", talos: "v1.11.6" },
      cert: { notAfter: "2026-09-25T11:41:28Z" },
      history: [{ d: "2026-07-16", ok: 286, total: 288 }],
    },
    // Passthrough of the status ConfigMap, so extra keys are allowed. Only
    // argocd and nodes are guaranteed: the baked fallback carries just those.
    schema: {
      type: "object",
      properties: {
        generatedAt: dateTime,
        build: str,
        deployedAt: dateTime,
        argocd: obj(
          { sync: str, health: str, syncedAt: dateTime },
          ["sync", "health"],
        ),
        nodes: obj({ ready: int, total: int }),
        versions: obj({ kubernetes: str, talos: str }),
        cert: obj({ notAfter: dateTime }),
        history: arr(
          obj({
            d: { type: "string", format: "date" },
            ok: int,
            total: int,
          }),
        ),
        // Present only when serving the baked fallback snapshot.
        source: { type: "string", enum: ["snapshot"] },
      },
      required: ["argocd", "nodes"],
      additionalProperties: true,
    },
  },
  {
    method: "GET",
    operationId: "getBlog",
    path: "/api/v1/blog",
    auth: "public",
    summary: "Latest five posts from blog.nordbye.it.",
    detail:
      "Parses the Hugo RSS feed and revalidates hourly, which keeps the blog origin from being hit once per request. Returns 502 with the standard error envelope when the feed is unreachable.",
    caching: "revalidated hourly",
    curl: "curl -s https://nordbye.it/api/v1/blog",
    errors: [
      {
        status: 502,
        description:
          "The blog feed could not be reached, or answered with a non-2xx status.",
        message: "blog feed unreachable",
      },
    ],
    sample: {
      source: "https://blog.nordbye.it/index.xml",
      count: 5,
      posts: [
        {
          title: "Tuning Azure WAF Without Paying Log Analytics Prices",
          url: "https://blog.nordbye.it/blog/lawless-waf/",
          publishedAt: "2026-07-16T00:00:00.000Z",
          published: "Thu, 16 Jul 2026 00:00:00 +0000",
        },
      ],
    },
    schema: obj({
      source: uri,
      count: int,
      posts: arr(
        obj({
          title: str,
          url: uri,
          // Null when the feed item carries no parseable pubDate.
          publishedAt: { type: ["string", "null"], format: "date-time" },
          published: { type: ["string", "null"] },
        }),
      ),
    }),
  },
  {
    method: "POST",
    operationId: "postEcho",
    path: "/api/v1/echo",
    auth: "api key",
    summary: "Authenticated write example.",
    detail:
      "A reference write that proves the authenticated POST seam without persisting anything. The key is compared in constant time, and writes are refused outright when no key is configured on the server. Real stateful writes build on this pattern and add a datastore.",
    caching: "no-store",
    curl: `curl -s -X POST https://nordbye.it/api/v1/echo \\
  -H 'authorization: Bearer $PORTFOLIO_API_KEY' \\
  -H 'content-type: application/json' \\
  -d '{"hello":"world"}'`,
    sample: { ok: true, echo: { hello: "world" } },
    errors: [
      {
        status: 400,
        description: "The request body was present but not valid JSON.",
        message: "body must be valid JSON",
      },
    ],
    schema: obj({
      ok: { ...bool, const: true },
      // Whatever JSON the caller sent back verbatim, or null for an empty body.
      echo: {},
    }),
  },
];

/** The uniform error shape every route returns on failure. */
export const errorEnvelope = {
  error: { status: 401, message: "missing or invalid API key" },
};

/** Pretty-print a sample body for display or embedding. */
export function formatSample(sample: unknown): string {
  return JSON.stringify(sample, null, 2);
}

/** Payload served by the discovery index at /api/v1. */
export function buildIndex() {
  return {
    name: `${site.name} — portfolio API`,
    version: API_VERSION,
    docs: `${site.url}/api`,
    openapi: `${site.url}/api/${API_VERSION}/openapi.json`,
    endpoints: endpoints.map((e) => ({
      method: e.method,
      path: e.path,
      desc: e.summary,
    })),
    notes: "Reads are public. Writes require an API key.",
  };
}

/** OpenAPI 3.1 document describing the whole surface. */
export function buildOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const e of endpoints) {
    const secured = e.auth === "api key";

    // Message strings mirror what the route handlers actually return.
    const errorResponse = (
      status: number,
      description: string,
      message: string,
    ) => ({
      [status]: {
        description,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: { status, message } },
          },
        },
      },
    });

    const operation: Record<string, unknown> = {
      operationId: e.operationId,
      summary: e.summary,
      description: e.detail,
      // Explicit on every operation: [] means the route needs no credentials.
      security: secured ? [{ bearerAuth: [] }] : [],
      responses: {
        "200": {
          description: "Success.",
          content: {
            "application/json": {
              schema: e.schema,
              example: e.sample,
            },
          },
        },
        ...(secured
          ? errorResponse(
              401,
              "Missing or invalid API key.",
              "missing or invalid API key",
            )
          : {}),
        ...(e.errors ?? []).reduce(
          (acc, err) => ({
            ...acc,
            ...errorResponse(err.status, err.description, err.message),
          }),
          {},
        ),
      },
    };

    if (secured) {
      operation.requestBody = {
        required: false,
        description:
          "Any JSON value. Returned verbatim under the echo key. An empty body echoes null.",
        content: {
          "application/json": {
            schema: {},
            example: { hello: "world" },
          },
        },
      };
    }

    paths[e.path] = {
      ...(paths[e.path] ?? {}),
      [e.method.toLowerCase()]: operation,
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: `${site.name} — portfolio API`,
      version: API_VERSION,
      description: apiIntro.blurb,
      contact: { name: site.name, url: `${site.url}/api` },
      license: {
        name: "Apache-2.0",
        identifier: "Apache-2.0",
      },
    },
    servers: [{ url: site.url, description: "Production." }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "Static API key presented as a Bearer token, or via the x-api-key header.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                status: { type: "integer" },
                message: { type: "string" },
              },
              required: ["status", "message"],
            },
          },
          required: ["error"],
        },
      },
    },
    paths,
  };
}
