/** Title and description per route, read by the page metadata and the Markdown copies. */
export const pageMeta = {
  infrastructure: {
    title: "Infrastructure",
    description:
      "This site runs on a self-hosted Talos Kubernetes cluster, reconciled by ArgoCD. The request path, the deploy pipeline, and live cluster status.",
  },
  api: {
    title: "API",
    description:
      "The public JSON API this site serves: endpoints, authentication, caching and example responses.",
  },
  fun: {
    title: "The room",
    description:
      "An explorable 3D room built from this site's own content: a shelf of case studies, the certifications, the career timeline, and real source code on the desk monitor.",
  },
  brand: {
    title: "Brand system",
    description: "Colour, type, spacing and imagery specification.",
  },
} as const;
