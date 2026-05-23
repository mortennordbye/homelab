import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 580 },
  groups: [
    {
      id: "azure",
      label: "Azure landing zone",
      bounds: { x: 240, y: 90, w: 800, h: 420 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "users",
      kind: "external",
      label: "Customers · 33M req / peak day",
      x: 40,
      y: 270,
      width: 180,
      detail: {
        role: "Betting platform traffic",
        why: "Migration had to be service-by-service. A big-bang cutover wasn't acceptable risk at peak load.",
      },
    },
    {
      id: "fd",
      kind: "ingress",
      label: "Front Door + WAF",
      x: 260,
      y: 130,
      width: 220,
      detail: {
        role: "Global edge + perimeter",
        why: "Single edge with WAF in front of the cluster. Customer-facing TLS terminates here.",
      },
    },
    {
      id: "traefik",
      kind: "ingress",
      label: "Traefik (Gateway API)",
      x: 260,
      y: 270,
      width: 220,
      detail: {
        role: "Cluster ingress",
        why: "Replaced NGINX with Traefik on Gateway API. The multi-cert listener patch upstream came from this customer's requirements.",
      },
    },
    {
      id: "aks",
      kind: "compute",
      label: "AKS — ~30 .NET services",
      x: 520,
      y: 270,
      width: 220,
      detail: {
        role: "Microservices runtime",
        why: "Each predecessor stayed in place until its successor was verified in production, then traffic switched. Zero forced regressions across the cutover.",
      },
    },
    {
      id: "windows",
      kind: "external-old",
      label: "Orange-hosted Windows fleet",
      x: 520,
      y: 130,
      width: 220,
      detail: {
        role: "Pre-migration host",
        why: "Each service moved off independently. The old host stayed online next to the new one until traffic switched, so rollback was a routing change.",
      },
    },
    {
      id: "tfargo",
      kind: "gitops",
      label: "Terraform + ArgoCD + Helm",
      x: 260,
      y: 410,
      width: 240,
      detail: {
        role: "Platform delivery",
        why: "All infra as code, GitOps on top. Alerts are Terraform against the AMBA baseline — same source of truth as the workloads.",
      },
    },
    {
      id: "monitor",
      kind: "observ",
      label: "Azure Monitor + Log Analytics",
      x: 780,
      y: 130,
      width: 240,
      detail: {
        role: "Telemetry pipeline",
        why: "Built from scratch on Azure Monitor Workspace + Log Analytics. Feeds Managed Grafana for the operational view.",
      },
    },
    {
      id: "grafana",
      kind: "observ",
      label: "Managed Grafana",
      x: 780,
      y: 410,
      width: 240,
      detail: {
        role: "Dashboards + on-call",
        why: "Single Grafana surface across all telemetry workspaces. Managed service means no Grafana hosts for the team to operate.",
      },
    },
  ],
  edges: [
    { from: "users", to: "fd" },
    { from: "fd", to: "traefik" },
    { from: "traefik", to: "aks" },
    { from: "windows", to: "aks", style: "migration" },
    { from: "tfargo", to: "aks", style: "supply" },
    { from: "aks", to: "monitor", style: "telemetry" },
    { from: "monitor", to: "grafana", style: "telemetry" },
  ],
};

export default arch;
