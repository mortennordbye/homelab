import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 540 },
  groups: [
    {
      id: "alz",
      label: "WAF Application Landing Zone — Azure subscription",
      bounds: { x: 250, y: 90, w: 830, h: 380 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "team",
      kind: "external",
      label: "Receiving team",
      x: 40,
      y: 250,
      width: 170,
      detail: {
        role: "The Orange department that owns the app",
        why: "They keep ownership after handover. The platform has to be theirs to run from day one, not mine.",
      },
    },
    {
      id: "github",
      kind: "gitops",
      label: "GitHub Actions",
      x: 290,
      y: 130,
      width: 180,
      detail: {
        role: "Platform pipelines",
        why: "Every infra change goes through CI. The receiving team owns the repo and the runners.",
      },
    },
    {
      id: "tf",
      kind: "gitops",
      label: "Terraform",
      x: 290,
      y: 260,
      width: 180,
      detail: {
        role: "Declarative subscription + services",
        why: "Landing zone, container hosting and DNS are all code. The platform can be torn down and rebuilt from the same input.",
      },
    },
    {
      id: "acr",
      kind: "registry",
      label: "Azure Container Registry",
      x: 540,
      y: 130,
      width: 220,
      detail: {
        role: "Private image registry",
        why: "Inside the same subscription, IAM-controlled and scanned. No public pulls into the production runtime.",
      },
    },
    {
      id: "capps",
      kind: "compute",
      label: "Azure Container Apps",
      x: 540,
      y: 260,
      width: 220,
      detail: {
        role: "Workload runtime",
        why: "Fits the app's footprint without forcing AKS-grade operations onto the receiving team. Scales by revision, not by node.",
      },
    },
    {
      id: "dns",
      kind: "ingress",
      label: "Azure DNS",
      x: 540,
      y: 380,
      width: 220,
      detail: {
        role: "Custom domain + ingress",
        why: "Routes the public hostname onto the Container Apps environment.",
      },
    },
    {
      id: "users",
      kind: "external",
      label: "App users",
      x: 870,
      y: 380,
      width: 170,
      detail: {
        role: "IAM and Microsoft 365 staff at scale",
        why: "Thousands of users hitting the app. The platform sits under it; they never see it.",
      },
    },
  ],
  edges: [
    { from: "team", to: "github" },
    { from: "github", to: "tf", style: "supply" },
    { from: "tf", to: "acr", style: "supply" },
    { from: "tf", to: "capps", style: "supply" },
    { from: "tf", to: "dns", style: "supply" },
    { from: "acr", to: "capps", style: "supply", label: "images" },
    { from: "capps", to: "dns" },
    { from: "dns", to: "users" },
  ],
};

export default arch;
