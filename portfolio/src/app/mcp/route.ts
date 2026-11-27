import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { mcp } from "@/content/api";
import { site } from "@/content/site";
import { getMarkdownPages } from "@/lib/markdown";
import { getAllWork } from "@/lib/work";
import { getLatestBlogPosts } from "@/lib/blog";
import { readClusterStatus } from "@/lib/cluster-status";

// Read-only and stateless: a new server and transport per request, no sessions.
export const dynamic = "force-dynamic";

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const page = (segments: string[]) =>
  getMarkdownPages().find((p) => p.segments.join("/") === segments.join("/"));
const describe = (name: (typeof mcp.tools)[number]["name"]) =>
  mcp.tools.find((t) => t.name === name)!.description;

function buildServer(): McpServer {
  const server = new McpServer(
    { name: mcp.name, version: "1.0.0", websiteUrl: site.url },
    {
      instructions: `Answers questions about ${site.firstName} ${site.lastName}, ${site.role} in ${site.location}, from the content of ${site.url}. All tools are read-only.`,
    },
  );
  const readOnly = { readOnlyHint: true, openWorldHint: false };

  server.registerTool(
    "get_profile",
    { description: describe("get_profile"), annotations: readOnly },
    async () => text(page(["index"])!.render()),
  );

  server.registerTool(
    "list_case_studies",
    {
      description: describe("list_case_studies"),
      inputSchema: { stack: z.string().optional().describe("Technology to filter on, case-insensitive") },
      annotations: readOnly,
    },
    async ({ stack }) => {
      const q = stack?.toLowerCase();
      const work = getAllWork().filter((w) => !q || w.stack.some((s) => s.toLowerCase().includes(q)));
      if (!work.length) return text(`No case studies use "${stack}".`);
      return text(
        work
          .map(
            (w) =>
              `- ${w.title} (slug: ${w.slug})\n  Client: ${w.client}. Period: ${w.period}. Stack: ${w.stack.join(", ")}.\n  ${w.summary}\n  ${site.url}/work/${w.slug}/`,
          )
          .join("\n"),
      );
    },
  );

  server.registerTool(
    "get_case_study",
    {
      description: describe("get_case_study"),
      inputSchema: { slug: z.string().describe("Case study slug, e.g. k8s-homelab") },
      annotations: readOnly,
    },
    async ({ slug }) => {
      const md = page(["work", slug]);
      if (md) return text(md.render());
      const slugs = getAllWork().map((w) => w.slug).join(", ");
      return { ...text(`No case study "${slug}". Known slugs: ${slugs}`), isError: true };
    },
  );

  server.registerTool(
    "search_blog",
    {
      description: describe("search_blog"),
      inputSchema: { query: z.string().describe("Words to look for, e.g. 'KEDA' or 'Talos'") },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ query }) => {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const posts = (await getLatestBlogPosts(100)).filter((p) =>
        words.every((w) => `${p.title} ${p.excerpt}`.toLowerCase().includes(w)),
      );
      if (!posts.length) return text(`No blog posts match "${query}". All posts: https://blog.nordbye.it/`);
      return text(posts.map((p) => `- ${p.title} (${p.date})\n  ${p.excerpt}\n  ${p.url}`).join("\n"));
    },
  );

  server.registerTool(
    "cluster_status",
    { description: describe("cluster_status"), annotations: readOnly },
    async () => {
      const { live, data } = await readClusterStatus();
      // The 30-day history is too long for a model's context.
      const rest = { ...data, history: undefined };
      const source = live
        ? "Live: written by an in-cluster job every 5 minutes."
        : "Not live: a build-time snapshot, the status feed is not available.";
      return text(`${source}\n\n${JSON.stringify(rest, null, 2)}`);
    },
  );

  return server;
}

async function handle(req: Request): Promise<Response> {
  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export { handle as GET, handle as POST, handle as DELETE };
