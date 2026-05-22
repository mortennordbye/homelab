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
  GitBranch,
  GitMerge,
  ShieldCheck,
  Activity,
  HardDrive,
  KeyRound,
  Container,
  LineChart,
  Mail,
  ScrollText,
  Globe2,
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
  | "gitlab"
  | "argocd"
  | "helm"
  | "harbor"
  | "cert-manager"
  | "metallb"
  | "telegraf"
  | "influxdb"
  | "fluent"
  | "f5"
  | "splunk"
  | "wazuh"
  | "ipa"
  | "postfix"
  | "bind"
  | "gitops"
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
  gitlab: { Icon: GitBranch, color: "#fc6d26", label: "GitLab" },
  argocd: { Icon: GitMerge, color: "#ef7b4d", label: "ArgoCD" },
  helm: { Icon: Package, color: "#0f1689", label: "Helm" },
  harbor: { Icon: Container, color: "#60b932", label: "Harbor" },
  "cert-manager": { Icon: ShieldCheck, color: "#326ce5", label: "cert-manager" },
  metallb: { Icon: Globe2, color: "#7d8df1", label: "MetalLB" },
  telegraf: { Icon: Activity, color: "#22adf6", label: "Telegraf" },
  influxdb: { Icon: LineChart, color: "#22adf6", label: "InfluxDB" },
  fluent: { Icon: ScrollText, color: "#48c0ee", label: "Fluent Bit" },
  f5: { Icon: ShieldCheck, color: "#e4002b", label: "F5" },
  splunk: { Icon: Activity, color: "#000000", label: "Splunk" },
  wazuh: { Icon: ShieldCheck, color: "#00a4a6", label: "Wazuh" },
  ipa: { Icon: KeyRound, color: "#cc0000", label: "FreeIPA" },
  postfix: { Icon: Mail, color: "#3478bd", label: "Postfix" },
  bind: { Icon: HardDrive, color: "#1f6feb", label: "BIND" },
  gitops: { Icon: GitMerge, color: "#5d6c8a", label: "GitOps" },
  default: { Icon: Package, color: "#5d6c8a", label: "Platform" },
};

/**
 * Pick the brand identity for a project from its `stack` list. Walks
 * the stack in order and returns the first matching brand. Returns the
 * `default` brand when nothing matches.
 */
function classify(label: string): BrandKey | null {
  const n = label.toLowerCase();
  if (n.includes("kubernetes") || n.includes("aks") || n === "k8s" || n.includes("k3s")) return "kubernetes";
  if (n.includes("azure")) return "azure";
  if (n === "aws" || n.includes("amazon eks")) return "aws";
  if (n.includes("rhel") || n.includes("red hat")) return "rhel";
  if (n.includes("ansible")) return "ansible";
  if (n.includes("postgres")) return "postgres";
  if (n.includes(".net") || n.includes("dotnet")) return "dotnet";
  if (n.includes("traefik")) return "traefik";
  if (n.includes("grafana") || n.includes("chronograf") || n.includes("kapacitor")) return "grafana";
  if (n.includes("influxdb")) return "influxdb";
  if (n.includes("telegraf")) return "telegraf";
  if (n.includes("fluent")) return "fluent";
  if (n.includes("terraform")) return "terraform";
  if (n.includes("gitlab")) return "gitlab";
  if (n.includes("argocd") || n.includes("argo cd")) return "argocd";
  if (n.includes("helm")) return "helm";
  if (n.includes("harbor")) return "harbor";
  if (n.includes("cert-manager") || n.includes("cert manager")) return "cert-manager";
  if (n.includes("metallb")) return "metallb";
  if (n.includes("f5")) return "f5";
  if (n.includes("splunk")) return "splunk";
  if (n.includes("wazuh")) return "wazuh";
  if (n.includes("ipa") || n.includes("freeipa")) return "ipa";
  if (n.includes("postfix")) return "postfix";
  if (n.includes("bind")) return "bind";
  if (n.includes("gitops")) return "gitops";
  return null;
}

export function pickBrand(stack: readonly string[]): {
  key: BrandKey;
  brand: Brand;
} {
  for (const item of stack) {
    const key = classify(item);
    if (key) return { key, brand: BRANDS[key] };
  }
  return { key: "default", brand: BRANDS.default };
}

/**
 * Return brand entries for every recognised tech in a stack, in stack order.
 * Each entry carries the original `label` from the stack so the tile can
 * render the project-specific spelling (e.g. "AKS · production" rather than
 * the generic "Kubernetes" label).
 */
export function pickAllBrands(
  stack: readonly string[],
): { label: string; key: BrandKey; brand: Brand }[] {
  const seen = new Set<BrandKey>();
  const out: { label: string; key: BrandKey; brand: Brand }[] = [];
  for (const item of stack) {
    const key = classify(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ label: item, key, brand: BRANDS[key] });
  }
  return out;
}
