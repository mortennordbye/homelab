import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 560 },
  groups: [
    {
      id: "sovereign",
      label: "Sovereign border — data inside Norway",
      bounds: { x: 200, y: 50, w: 880, h: 470 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "citizen",
      kind: "external",
      label: "Norwegian citizens",
      x: 60,
      y: 270,
      width: 130,
      detail: {
        role: "End users of the transport operator's services",
        why: "Their personal data has to stay on Norwegian soil under GDPR and national rules.",
      },
    },
    {
      id: "eks",
      kind: "external-old",
      label: "Amazon EKS — legacy",
      x: 250,
      y: 90,
      width: 170,
      detail: {
        role: "Original platform, now decommissioned",
        scale: "Multi-AZ EKS in eu-west-*",
        why: "Production traffic was carrying personal data of Norwegian citizens. The regulator required workloads to run inside national borders, on hardware the operator controls.",
      },
    },
    {
      id: "tf",
      kind: "gitops",
      label: "Terraform + GitOps",
      x: 480,
      y: 90,
      width: 170,
      detail: {
        role: "Declarative infrastructure and delivery",
        why: "Every change goes through version control and code review, and can be rolled back. Cutover ran service by service, with rollback paths committed before the switch.",
      },
    },
    {
      id: "harbor",
      kind: "registry",
      label: "Harbor",
      x: 720,
      y: 90,
      width: 150,
      detail: {
        role: "Image registry and vulnerability scanner",
        why: "Every image was scanned before it could run on the cluster. No unscanned base layers in production.",
        links: [{ label: "goharbor.io", href: "https://goharbor.io" }],
      },
    },
    {
      id: "traefik",
      kind: "ingress",
      label: "Traefik",
      x: 280,
      y: 270,
      width: 150,
      detail: {
        role: "L7 ingress and TLS termination",
        why: "Mature gateway with good K3s integration. Replaced the EKS ALB layer without changing any of the services behind it.",
        links: [{ label: "traefik.io", href: "https://traefik.io" }],
      },
    },
    {
      id: "k3s",
      kind: "compute",
      label: "K3s cluster",
      x: 520,
      y: 270,
      width: 170,
      detail: {
        role: "On-prem Kubernetes, inside Norwegian borders",
        scale: "3 control plane, n workers on customer hardware",
        why: "Lightweight Kubernetes that fits self-hosted operation. Same APIs as EKS, so workloads moved over without much code change.",
      },
    },
    {
      id: "workloads",
      kind: "compute",
      label: "Customer workloads",
      x: 790,
      y: 270,
      width: 200,
      detail: {
        role: "Production transport services",
        why: "Cutover ran per service rather than all at once. Each workload moved when its rollback path had been rehearsed.",
      },
    },
    {
      id: "telegraf",
      kind: "observ",
      label: "Telegraf",
      x: 480,
      y: 450,
      width: 130,
      detail: {
        role: "Per-node metrics agent",
      },
    },
    {
      id: "fluent",
      kind: "observ",
      label: "Fluent Bit",
      x: 660,
      y: 450,
      width: 130,
      detail: {
        role: "Log forwarder",
      },
    },
  ],
  edges: [
    { from: "citizen", to: "traefik" },
    { from: "traefik", to: "k3s" },
    { from: "k3s", to: "workloads" },
    { from: "eks", to: "k3s", style: "migration", label: "migrated" },
    { from: "tf", to: "k3s", style: "supply" },
    { from: "harbor", to: "k3s", style: "supply" },
    { from: "k3s", to: "telegraf", style: "telemetry" },
    { from: "k3s", to: "fluent", style: "telemetry" },
  ],
};

export default arch;
