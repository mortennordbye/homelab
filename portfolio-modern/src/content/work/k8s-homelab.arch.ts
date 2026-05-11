import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 560 },
  groups: [
    {
      id: "cluster",
      label: "K3s cluster — Era One",
      bounds: { x: 280, y: 50, w: 800, h: 480 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "user",
      kind: "external",
      label: "LAN clients",
      x: 40,
      y: 240,
      width: 140,
      detail: {
        role: "Internal and external users hitting the homelab",
        why: "A homelab does not have a managed load balancer, so MetalLB handed out L2 VIPs on the LAN to make services reachable.",
      },
    },
    {
      id: "metallb",
      kind: "ingress",
      label: "MetalLB (L2)",
      x: 320,
      y: 240,
      width: 150,
      detail: {
        role: "Bare-metal L2 load balancer",
        why: "Covers what a managed cloud LB would do in production. ARP-based VIPs on the LAN.",
      },
    },
    {
      id: "traefik",
      kind: "ingress",
      label: "Traefik",
      x: 520,
      y: 240,
      width: 150,
      detail: {
        role: "Ingress controller and TLS termination",
        why: "Same gateway I use at work. The homelab is where I try things out before they reach customers.",
      },
    },
    {
      id: "certmgr",
      kind: "security",
      label: "cert-manager",
      x: 520,
      y: 90,
      width: 150,
      detail: {
        role: "Automated TLS issuance",
        why: "All internal and public services get certificates without manual work, and they renew on their own.",
      },
    },
    {
      id: "k3s",
      kind: "compute",
      label: "K3s control plane + workers",
      x: 720,
      y: 240,
      width: 240,
      detail: {
        role: "Kubernetes cluster",
        scale: "Single rack, sized for personal infrastructure",
        why: "Moved off raw Docker. The homelab gets treated with the same care as customer infrastructure, because that is where I learn what works.",
      },
    },
    {
      id: "gitlab",
      kind: "gitops",
      label: "GitLab CE (self-hosted)",
      x: 320,
      y: 90,
      width: 200,
      detail: {
        role: "Source of truth and CI/CD",
        why: "Self-hosted so the homelab does not depend on anything outside the rack. Runs both source control and pipelines.",
      },
    },
    {
      id: "argocd",
      kind: "gitops",
      label: "ArgoCD",
      x: 320,
      y: 410,
      width: 150,
      detail: {
        role: "GitOps reconciler",
        why: "The cluster is whatever the repo says it is. No clicking around in the dashboard to make changes.",
      },
    },
    {
      id: "helm",
      kind: "gitops",
      label: "Helm",
      x: 520,
      y: 410,
      width: 140,
      detail: { role: "Application packaging" },
    },
    {
      id: "apps",
      kind: "compute",
      label: "Apps (incl. previous site)",
      x: 720,
      y: 410,
      width: 240,
      detail: {
        role: "Workloads on the cluster",
        why: "The previous version of this portfolio and its staging environment ran on this stack. The lab kept the lights on while I learned the platform.",
      },
    },
  ],
  edges: [
    { from: "user", to: "metallb" },
    { from: "metallb", to: "traefik" },
    { from: "traefik", to: "k3s" },
    { from: "certmgr", to: "traefik", style: "supply" },
    { from: "gitlab", to: "argocd", style: "supply" },
    { from: "argocd", to: "k3s", style: "supply", label: "syncs" },
    { from: "helm", to: "apps", style: "supply" },
    { from: "k3s", to: "apps" },
  ],
};

export default arch;
