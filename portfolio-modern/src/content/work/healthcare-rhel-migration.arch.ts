import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 560 },
  groups: [
    {
      id: "prod",
      label: "Hardened production estate",
      bounds: { x: 200, y: 50, w: 880, h: 470 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "patient",
      kind: "external",
      label: "Patient traffic",
      x: 40,
      y: 240,
      width: 140,
      detail: {
        role: "End users of the life-critical service",
        why: "Their session can't break. Zero downtime was the main constraint of the whole migration.",
      },
    },
    {
      id: "rhel7",
      kind: "external-old",
      label: "RHEL 7 — legacy",
      x: 240,
      y: 80,
      width: 170,
      detail: {
        role: "Original platform, now decommissioned",
        why: "Past its useful life and close to losing vendor support. Moved off before end-of-life.",
      },
    },
    {
      id: "ansible",
      kind: "gitops",
      label: "Ansible roles",
      x: 470,
      y: 80,
      width: 170,
      detail: {
        role: "Provisioning and configuration",
        why: "RHEL9 was built next to RHEL7 from scratch instead of migrated in place. The same playbooks can rebuild the estate years from now.",
      },
    },
    {
      id: "f5",
      kind: "security",
      label: "F5 WAF",
      x: 240,
      y: 240,
      width: 150,
      detail: {
        role: "L7 web application firewall",
        why: "Rule sets standardised and put in version control. Fewer one-off rules per environment and fewer surprises during incidents.",
      },
    },
    {
      id: "rhel9",
      kind: "compute",
      label: "RHEL 9 app servers",
      x: 460,
      y: 240,
      width: 190,
      detail: {
        role: "Hardened application platform",
        scale: "Deployed in parallel with RHEL7, traffic flipped at cutover",
        why: "Built with Ansible from a clean ISO rather than lifted from RHEL7. Anything odd about the old boxes stayed on the old boxes.",
      },
    },
    {
      id: "pg",
      kind: "data",
      label: "PostgreSQL",
      x: 720,
      y: 240,
      width: 160,
      detail: {
        role: "Primary application database",
        why: "Rebuilt under Ansible-managed config. Backup and recovery were rehearsed before cutover.",
      },
    },
    {
      id: "jumphost",
      kind: "security",
      label: "Jumphost",
      x: 240,
      y: 410,
      width: 150,
      detail: {
        role: "Controlled admin access path",
        why: "Replaced ad-hoc admin SSH from anywhere. Every privileged session now goes through an audited entry point.",
      },
    },
    {
      id: "filebeat",
      kind: "observ",
      label: "Filebeat",
      x: 460,
      y: 410,
      width: 130,
      detail: { role: "Log shipper on each host" },
    },
    {
      id: "logstash",
      kind: "observ",
      label: "Logstash",
      x: 640,
      y: 410,
      width: 130,
      detail: {
        role: "Central log pipeline",
        why: "Logs gathered in one place, so incident response no longer means logging into each host to check.",
      },
    },
    {
      id: "siem",
      kind: "security",
      label: "Mnemonic SIEM",
      x: 830,
      y: 410,
      width: 170,
      detail: {
        role: "Managed security monitoring",
        why: "End-to-end correlation and incident response. Healthcare regulators care less about whether logs are collected and more about whether anyone is actually looking at them.",
      },
    },
  ],
  edges: [
    { from: "patient", to: "f5" },
    { from: "f5", to: "rhel9" },
    { from: "rhel9", to: "pg" },
    { from: "rhel7", to: "rhel9", style: "migration", label: "migrated" },
    { from: "ansible", to: "rhel9", style: "supply" },
    { from: "ansible", to: "pg", style: "supply" },
    { from: "jumphost", to: "rhel9", style: "supply" },
    { from: "rhel9", to: "filebeat", style: "telemetry" },
    { from: "filebeat", to: "logstash", style: "telemetry" },
    { from: "logstash", to: "siem", style: "telemetry" },
  ],
};

export default arch;
