import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 560 },
  groups: [
    {
      id: "estate",
      label: "Clinical estate — Norsk Helsenett-connected",
      bounds: { x: 220, y: 90, w: 720, h: 400 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "clinical",
      kind: "compute",
      label: "Clinical Kubernetes apps",
      x: 40,
      y: 260,
      width: 180,
      detail: {
        role: "Patient-facing services",
        why: "Production traffic that cannot drop during a host migration. Cluster upgrades ran sequentially through test, stage and prod for each customer.",
      },
    },
    {
      id: "traefik",
      kind: "ingress",
      label: "Traefik (ingress)",
      x: 260,
      y: 130,
      width: 200,
      detail: {
        role: "Cluster ingress",
        why: "Routing layer stayed put through the upgrade. Only the host stack underneath the database changed.",
      },
    },
    {
      id: "pg-old",
      kind: "external-old",
      label: "Postgres on RHEL7",
      x: 260,
      y: 260,
      width: 200,
      detail: {
        role: "Previous host stack",
        why: "RHEL7 reached end of support. The migration was forced by the OS lifecycle, not chosen.",
      },
    },
    {
      id: "pg-new",
      kind: "data",
      label: "Postgres on RHEL9 (TLS)",
      x: 500,
      y: 260,
      width: 220,
      detail: {
        role: "New host stack with encrypted connection strings",
        why: "TLS with certificates replaced cleartext client connections. RHEL9 keeps the OS in support for the next cycle.",
      },
    },
    {
      id: "ansible",
      kind: "gitops",
      label: "Ansible",
      x: 500,
      y: 130,
      width: 220,
      detail: {
        role: "Host build and upgrade",
        why: "Same playbooks across both customers. Re-runnable for the next major OS upgrade rather than another from-scratch project.",
      },
    },
    {
      id: "fluentbit",
      kind: "observ",
      label: "Fluent Bit",
      x: 500,
      y: 390,
      width: 220,
      detail: {
        role: "Log forwarding",
        why: "Continued telemetry through the cutover. No gap in clinical audit trail.",
      },
    },
    {
      id: "nhn",
      kind: "external",
      label: "Norsk Helsenett",
      x: 770,
      y: 260,
      width: 200,
      detail: {
        role: "National healthcare network",
        why: "Clinical data exchange. Integration stayed stable across both customer upgrades — that was the bar.",
      },
    },
  ],
  edges: [
    { from: "clinical", to: "traefik" },
    { from: "traefik", to: "pg-new", label: "TLS" },
    { from: "pg-old", to: "pg-new", style: "migration" },
    { from: "ansible", to: "pg-new", style: "supply" },
    { from: "pg-new", to: "fluentbit", style: "telemetry" },
    { from: "clinical", to: "nhn" },
  ],
};

export default arch;
