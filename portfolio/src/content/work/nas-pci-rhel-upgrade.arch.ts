import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 580 },
  groups: [
    {
      id: "pci",
      label: "PCI-DSS perimeter",
      bounds: { x: 230, y: 100, w: 740, h: 420 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "ad",
      kind: "external",
      label: "Customer AD domain",
      x: 40,
      y: 140,
      width: 170,
      detail: {
        role: "PCI Windows Active Directory",
        why: "The trusted identity source for the cardholder environment. The new IPA layer trusts it directly instead of syncing passwords.",
      },
    },
    {
      id: "ipa-old",
      kind: "external-old",
      label: "IPA on RHEL7 (legacy)",
      x: 260,
      y: 140,
      width: 200,
      detail: {
        role: "Previous auth layer",
        why: "Password sync had drift problems and ran on a host nobody wanted to upgrade. Replaced rather than patched.",
      },
    },
    {
      id: "ipa-new",
      kind: "security",
      label: "IPA on RHEL9 (AD trust)",
      x: 500,
      y: 140,
      width: 220,
      detail: {
        role: "Auth + SSO into the fleet",
        why: "Fresh build, AD trust instead of password sync. The drift class of incident disappears with this change.",
      },
    },
    {
      id: "jump",
      kind: "security",
      label: "Jump host (RSA 2FA)",
      x: 760,
      y: 140,
      width: 220,
      detail: {
        role: "Single entry into the cardholder zone",
        why: "Every interactive session goes through here. RSA two-factor is enforced at this hop — no direct shells onto the fleet.",
      },
    },
    {
      id: "ansible",
      kind: "gitops",
      label: "Ansible (CIS + OTel rollout)",
      x: 260,
      y: 280,
      width: 220,
      detail: {
        role: "Configuration management",
        why: "Drove the per-host upgrade pipeline and the OpenTelemetry agent rollout across all 150 hosts. CIS hardening lives as a role so the baseline is re-applied after every in-place upgrade.",
      },
    },
    {
      id: "fleet",
      kind: "compute",
      label: "~40 RHEL8 hosts (PCI fleet)",
      x: 520,
      y: 280,
      width: 240,
      detail: {
        role: "Cardholder workloads",
        why: "In-place RHEL7 → RHEL8 upgrade — no parallel infrastructure was available. CIS baseline reapplied per host after each upgrade so the audit cycle stayed intact.",
      },
    },
    {
      id: "otel",
      kind: "observ",
      label: "OpenTelemetry agent",
      x: 360,
      y: 420,
      width: 220,
      detail: {
        role: "Host + Java metrics",
        why: "One agent across all 150 hosts (not just the PCI 40) — single rollout, single update path.",
      },
    },
    {
      id: "sumologic",
      kind: "observ",
      label: "Sumologic",
      x: 640,
      y: 420,
      width: 220,
      detail: {
        role: "Central log + metric platform",
        why: "All telemetry lands here for the audit trail. Tenable and Wazuh sit beside this as the rest of the PCI evidence chain.",
      },
    },
  ],
  edges: [
    { from: "ad", to: "ipa-new", style: "supply", label: "trust" },
    { from: "ipa-old", to: "ipa-new", style: "migration" },
    { from: "ipa-new", to: "jump", style: "supply" },
    { from: "jump", to: "fleet" },
    { from: "ansible", to: "fleet", style: "supply" },
    { from: "ansible", to: "otel", style: "supply" },
    { from: "fleet", to: "otel", style: "telemetry" },
    { from: "otel", to: "sumologic", style: "telemetry" },
  ],
};

export default arch;
