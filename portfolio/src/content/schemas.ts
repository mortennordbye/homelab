import { z } from "zod";

export const skillSchema = z.object({
  label: z.string(),
  level: z.number().min(0).max(100),
  group: z.enum(["platform", "ops", "delivery", "soft"]),
});
export type Skill = z.infer<typeof skillSchema>;

export const serviceSchema = z.object({
  slug: z.string(),
  title: z.string(),
  blurb: z.string(),
  summary: z.string(),
  bullets: z.array(z.string()),
  accent: z.enum(["arctic", "copper", "teal"]).default("arctic"),
  proof: z
    .object({
      label: z.string(),
      workSlug: z.string().optional(),
    })
    .optional(),
});
export type Service = z.infer<typeof serviceSchema>;

export const certSchema = z.object({
  title: z.string(),
  issuer: z.string(),
  date: z.string(),
  credentialId: z.string().optional(),
  href: z.string().optional(),
});
export type Cert = z.infer<typeof certSchema>;

export const educationSchema = z.object({
  title: z.string(),
  institution: z.string(),
  period: z.string(),
  detail: z.string().optional(),
});
export type Education = z.infer<typeof educationSchema>;

export const experienceSchema = z.object({
  role: z.string(),
  company: z.string(),
  location: z.string().optional(),
  period: z.string(),
  description: z.union([z.string(), z.array(z.string())]),
  current: z.boolean().optional(),
  // All experience entries appear on the About-section career timeline by default.
  // Set `hidden: true` to opt an entry out. `note`, `role`, and `company` are
  // optional display overrides used only by the timeline visual (the résumé and
  // LaTeX CV always render the full `role`/`company`/`description`).
  timeline: z
    .object({
      hidden: z.boolean().optional(),
      note: z.string().optional(),
      role: z.string().optional(),
      company: z.string().optional(),
    })
    .optional(),
});
export type Experience = z.infer<typeof experienceSchema>;

export const workFrontmatterSchema = z.object({
  title: z.string(),
  slug: z.string(),
  kind: z.enum(["professional", "homelab"]),
  summary: z.string(),
  client: z.string(),
  role: z.string(),
  period: z.string(),
  stack: z.array(z.string()),
  outcomes: z.array(z.string()),
  cover: z.string(),
  gallery: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  order: z.number().optional(),
});
export type WorkFrontmatter = z.infer<typeof workFrontmatterSchema>;

export const nodeKindSchema = z.enum([
  "ingress",
  "compute",
  "data",
  "registry",
  "gitops",
  "observ",
  "security",
  "external",
  "external-old",
]);
export type NodeKind = z.infer<typeof nodeKindSchema>;

export const edgeStyleSchema = z
  .enum(["solid", "supply", "telemetry", "migration"])
  .default("solid");
export type EdgeStyle = z.infer<typeof edgeStyleSchema>;

export const archNodeDetailSchema = z.object({
  role: z.string().optional(),
  scale: z.string().optional(),
  why: z.string().optional(),
  links: z
    .array(z.object({ label: z.string(), href: z.string() }))
    .optional(),
});

export const archNodeSchema = z.object({
  id: z.string(),
  kind: nodeKindSchema,
  label: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  detail: archNodeDetailSchema.optional(),
});

export const archEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  style: edgeStyleSchema.optional(),
  label: z.string().optional(),
});

export const archGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  bounds: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  tone: z.enum(["accent-dashed", "muted-dashed"]).default("accent-dashed"),
});

export const architectureSchema = z.object({
  viewBox: z.object({ w: z.number(), h: z.number() }),
  groups: z.array(archGroupSchema).optional(),
  nodes: z.array(archNodeSchema),
  edges: z.array(archEdgeSchema),
});
export type Architecture = z.infer<typeof architectureSchema>;
export type ArchNode = z.infer<typeof archNodeSchema>;
export type ArchEdge = z.infer<typeof archEdgeSchema>;
export type ArchGroup = z.infer<typeof archGroupSchema>;
