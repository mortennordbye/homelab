import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 480 },
  groups: [
    {
      id: "listener",
      label: "Single Gateway API listener — after the patch",
      bounds: { x: 290, y: 80, w: 540, h: 320 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "clients",
      kind: "external",
      label: "TLS clients",
      x: 50,
      y: 200,
      width: 170,
      detail: {
        role: "Hostnames a.example, b.example, c.example",
        why: "Real-world TLS setup. Distinct hostnames per listener, each with its own certificate. The customer's situation, and not unusual.",
      },
    },
    {
      id: "upstream",
      kind: "gitops",
      label: "Traefik upstream (v3.7.0)",
      x: 50,
      y: 60,
      width: 220,
      detail: {
        role: "Open-source repository",
        why: "The patch touched cert-secret resolution and the SNI matching path. Reviewed and released as v3.7.0 after iteration with the maintainers.",
      },
    },
    {
      id: "traefik",
      kind: "ingress",
      label: "Traefik HTTPS listener",
      x: 320,
      y: 200,
      width: 200,
      detail: {
        role: "TLS termination + SNI-based cert selection",
        why: "Before the patch, only one cert per listener was honoured. After the patch, the listener resolves multiple cert secrets and picks one by SNI hostname.",
      },
    },
    {
      id: "cert-a",
      kind: "security",
      label: "Cert secret · a.example",
      x: 580,
      y: 110,
      width: 220,
    },
    {
      id: "cert-b",
      kind: "security",
      label: "Cert secret · b.example",
      x: 580,
      y: 200,
      width: 220,
      detail: {
        role: "One TLSSecret per hostname",
        why: "Customer's existing certificate layout. The patch lets the listener bind all of them at once.",
      },
    },
    {
      id: "cert-c",
      kind: "security",
      label: "Cert secret · c.example",
      x: 580,
      y: 290,
      width: 220,
    },
    {
      id: "backends",
      kind: "compute",
      label: "Backend services",
      x: 870,
      y: 200,
      width: 180,
      detail: {
        role: "HTTPRoute targets",
        why: "Once TLS terminates, traffic routes to the matching service. The patch sits at the TLS layer; routing is unchanged.",
      },
    },
  ],
  edges: [
    { from: "clients", to: "traefik", label: "SNI" },
    { from: "upstream", to: "traefik", style: "supply", label: "patch" },
    { from: "traefik", to: "cert-a", style: "supply" },
    { from: "traefik", to: "cert-b", style: "supply" },
    { from: "traefik", to: "cert-c", style: "supply" },
    { from: "traefik", to: "backends" },
  ],
};

export default arch;
