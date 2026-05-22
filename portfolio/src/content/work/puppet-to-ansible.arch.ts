import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 480 },
  groups: [
    {
      id: "managed",
      label: "Managed estate",
      bounds: { x: 510, y: 50, w: 560, h: 380 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "eng",
      kind: "external",
      label: "Engineers",
      x: 40,
      y: 200,
      width: 140,
      detail: {
        role: "The team running the estate day to day",
        why: "The new toolchain has to fit how they already work. Role layout is standardised so future engineers find their way around quickly.",
      },
    },
    {
      id: "gitlab",
      kind: "gitops",
      label: "GitLab CI",
      x: 240,
      y: 200,
      width: 150,
      detail: {
        role: "Pipeline and source of truth",
        why: "Every change goes through CI, so configuration drift is caught at PR review instead of during an incident.",
      },
    },
    {
      id: "puppet",
      kind: "external-old",
      label: "Puppet master — legacy",
      x: 240,
      y: 60,
      width: 200,
      detail: {
        role: "Original config management",
        why: "Customer's hosting provider was phasing out Puppet support. We moved off the tool but kept the same declarative idea. The runtime changed, the end state did not.",
      },
    },
    {
      id: "ansible",
      kind: "gitops",
      label: "Ansible",
      x: 560,
      y: 200,
      width: 160,
      detail: {
        role: "Agentless config management",
        why: "No agents, no certificates, no master to maintain. The Puppet resource model was translated into idempotent Ansible tasks that produce the same result without surprising the people running them.",
      },
    },
    {
      id: "mail",
      kind: "compute",
      label: "Mail servers (Postfix)",
      x: 780,
      y: 110,
      width: 200,
      detail: {
        role: "Customer-facing mail platform",
        why: "Rebuilt with Ansible roles. The new version ran next to the Puppet-managed one so the customer could compare both before traffic switched over.",
      },
    },
    {
      id: "critical",
      kind: "compute",
      label: "Other critical systems",
      x: 780,
      y: 220,
      width: 200,
      detail: {
        role: "Production Linux fleet",
        why: "Replacing a server is now a pipeline run rather than half a day of manual setup.",
      },
    },
    {
      id: "monitor",
      kind: "observ",
      label: "Drift checks",
      x: 780,
      y: 330,
      width: 160,
      detail: {
        role: "Periodic CI runs against the fleet",
        why: "Catches drift before it becomes the reason an incident takes longer than it should.",
      },
    },
  ],
  edges: [
    { from: "eng", to: "gitlab" },
    { from: "gitlab", to: "ansible", style: "supply" },
    { from: "puppet", to: "ansible", style: "migration", label: "migrated" },
    { from: "ansible", to: "mail", style: "supply" },
    { from: "ansible", to: "critical", style: "supply" },
    { from: "ansible", to: "monitor", style: "supply" },
  ],
};

export default arch;
