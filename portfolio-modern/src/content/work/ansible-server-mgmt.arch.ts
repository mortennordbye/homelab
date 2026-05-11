import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 480 },
  groups: [
    {
      id: "fleet",
      label: "Managed Linux fleet",
      bounds: { x: 730, y: 50, w: 340, h: 380 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "engineer",
      kind: "external",
      label: "Me (commits)",
      x: 40,
      y: 200,
      width: 150,
      detail: {
        role: "Single operator pushing change",
        why: "Solo homelab, but run with the same review and CI flow I would build for a team. That muscle memory carries over to client work.",
      },
    },
    {
      id: "gitlab",
      kind: "gitops",
      label: "GitLab CE + CI",
      x: 240,
      y: 200,
      width: 180,
      detail: {
        role: "Source of truth and pipeline runner",
        why: "Every change goes through lint, dry-run and then apply. No more ad-hoc SSH and edit.",
      },
    },
    {
      id: "ansible",
      kind: "gitops",
      label: "Ansible",
      x: 470,
      y: 200,
      width: 160,
      detail: {
        role: "Agentless config management",
        why: "Version-controlled, pipeline-executed configuration. The same pattern I want at work, practised at home first.",
      },
    },
    {
      id: "bootstrap",
      kind: "compute",
      label: "Bootstrap role",
      x: 760,
      y: 90,
      width: 170,
      detail: {
        role: "Fresh host to a known-good baseline",
        why: "Users, hardening, base packages, monitoring agents. Every freshly installed Linux host starts from the same place on purpose.",
      },
    },
    {
      id: "bind",
      kind: "compute",
      label: "BIND DNS role",
      x: 760,
      y: 200,
      width: 170,
      detail: {
        role: "Internal authoritative DNS",
        why: "Homelab DNS rebuilds in a pipeline run, not half a day of editing zonefiles by hand.",
      },
    },
    {
      id: "hosts",
      kind: "compute",
      label: "Linux hosts",
      x: 760,
      y: 310,
      width: 170,
      detail: {
        role: "The actual fleet",
        why: "Hardware changes are quiet now. Wipe, install, run the pipeline, done.",
      },
    },
  ],
  edges: [
    { from: "engineer", to: "gitlab" },
    { from: "gitlab", to: "ansible", style: "supply", label: "triggers" },
    { from: "ansible", to: "bootstrap", style: "supply" },
    { from: "ansible", to: "bind", style: "supply" },
    { from: "bootstrap", to: "hosts", style: "supply" },
    { from: "bind", to: "hosts", style: "supply" },
  ],
};

export default arch;
