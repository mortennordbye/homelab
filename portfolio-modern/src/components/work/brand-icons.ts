import {
  Boxes,
  Cloud,
  CloudFog,
  ServerCog,
  Workflow,
  Database,
  CodeXml,
  Network,
  Flame,
  Layers,
  Package,
  type LucideIcon,
} from "lucide-react";

export type BrandKey =
  | "kubernetes"
  | "azure"
  | "aws"
  | "rhel"
  | "ansible"
  | "postgres"
  | "dotnet"
  | "traefik"
  | "grafana"
  | "terraform"
  | "default";

export type Brand = {
  Icon: LucideIcon;
  color: string;
  label: string;
};

/**
 * Brand identity registry for portfolio cards. Each brand has a lucide
 * icon paired with its canonical brand colour and a display label. We
 * deliberately use category lucide icons (Boxes, Cloud, Database, ...)
 * rather than exact brand SVG marks to avoid trademark friction and to
 * keep a consistent stroke style across all covers. The brand colour
 * carries the recognition; the small label confirms it.
 */
export const BRANDS: Record<BrandKey, Brand> = {
  kubernetes: { Icon: Boxes, color: "#326ce5", label: "Kubernetes" },
  azure: { Icon: Cloud, color: "#0078d4", label: "Azure" },
  aws: { Icon: CloudFog, color: "#ff9900", label: "AWS" },
  rhel: { Icon: ServerCog, color: "#ee0000", label: "Red Hat" },
  ansible: { Icon: Workflow, color: "#bb0000", label: "Ansible" },
  postgres: { Icon: Database, color: "#336791", label: "PostgreSQL" },
  dotnet: { Icon: CodeXml, color: "#512bd4", label: ".NET" },
  traefik: { Icon: Network, color: "#24a1c1", label: "Traefik" },
  grafana: { Icon: Flame, color: "#f46800", label: "Grafana" },
  terraform: { Icon: Layers, color: "#623ce4", label: "Terraform" },
  default: { Icon: Package, color: "#5d6c8a", label: "Platform" },
};

/**
 * Pick the brand identity for a project from its `stack` list. Walks
 * the stack in order and returns the first matching brand. Returns the
 * `default` brand when nothing matches.
 */
export function pickBrand(stack: readonly string[]): {
  key: BrandKey;
  brand: Brand;
} {
  for (const item of stack) {
    const n = item.toLowerCase();
    if (n.includes("kubernetes") || n.includes("aks") || n === "k8s") {
      return { key: "kubernetes", brand: BRANDS.kubernetes };
    }
    if (n.includes("azure")) return { key: "azure", brand: BRANDS.azure };
    if (n === "aws") return { key: "aws", brand: BRANDS.aws };
    if (n.includes("rhel") || n.includes("red hat")) {
      return { key: "rhel", brand: BRANDS.rhel };
    }
    if (n.includes("ansible")) return { key: "ansible", brand: BRANDS.ansible };
    if (n.includes("postgres")) return { key: "postgres", brand: BRANDS.postgres };
    if (n.includes(".net") || n.includes("dotnet")) {
      return { key: "dotnet", brand: BRANDS.dotnet };
    }
    if (n.includes("traefik")) return { key: "traefik", brand: BRANDS.traefik };
    if (
      n.includes("grafana") ||
      n.includes("telegraf") ||
      n.includes("influxdb") ||
      n.includes("chronograf") ||
      n.includes("kapacitor")
    ) {
      return { key: "grafana", brand: BRANDS.grafana };
    }
    if (n.includes("terraform")) {
      return { key: "terraform", brand: BRANDS.terraform };
    }
  }
  return { key: "default", brand: BRANDS.default };
}
