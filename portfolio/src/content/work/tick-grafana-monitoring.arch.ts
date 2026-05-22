import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 560 },
  groups: [
    {
      id: "tick",
      label: "TICK stack",
      bounds: { x: 290, y: 175, w: 540, h: 245 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "fleet",
      kind: "compute",
      label: "Homelab fleet",
      x: 40,
      y: 240,
      width: 170,
      detail: {
        role: "All hosts on the LAN: physical, virtual and containers",
        why: "A host that is not being measured is a blind spot, so every node ran the same agent.",
      },
    },
    {
      id: "telegraf",
      kind: "observ",
      label: "Telegraf",
      x: 310,
      y: 240,
      width: 140,
      detail: {
        role: "Metrics collector on each host",
        scale: "OS level: CPU, memory, disk I/O, network",
      },
    },
    {
      id: "influx",
      kind: "data",
      label: "InfluxDB",
      x: 500,
      y: 240,
      width: 140,
      detail: {
        role: "Time-series database",
        why: "Built for high-cardinality metric ingest. Telegraf and InfluxDB are designed to work together (the T and I in TICK).",
      },
    },
    {
      id: "chrono",
      kind: "observ",
      label: "Chronograf",
      x: 690,
      y: 200,
      width: 130,
      detail: {
        role: "Exploration UI",
        why: "Good for quick 'what does this metric look like' checks before deciding if it deserves a permanent Grafana panel.",
      },
    },
    {
      id: "kapacitor",
      kind: "observ",
      label: "Kapacitor",
      x: 690,
      y: 320,
      width: 130,
      detail: {
        role: "Streaming alert engine",
        why: "Alert logic sits next to the data instead of on top of dashboards.",
      },
    },
    {
      id: "grafana",
      kind: "observ",
      label: "Grafana",
      x: 880,
      y: 240,
      width: 160,
      detail: {
        role: "Dashboards I actually look at",
        why: "Chronograf was for exploration. Grafana held the panels I came back to. Keeping them separate kept the main dashboards readable.",
      },
    },
    {
      id: "discord",
      kind: "external",
      label: "Discord channel",
      x: 880,
      y: 410,
      width: 160,
      detail: {
        role: "Alert destination via webhook",
        why: "Alerts go to where I already am. An alert pipeline nobody reads is the same as not having one.",
      },
    },
    {
      id: "ansible",
      kind: "gitops",
      label: "Ansible",
      x: 40,
      y: 80,
      width: 140,
      detail: {
        role: "Deploys agents and collector config",
      },
    },
    {
      id: "gitlab",
      kind: "gitops",
      label: "GitLab CI",
      x: 240,
      y: 80,
      width: 140,
      detail: {
        role: "Triggers playbooks on commit",
        why: "Same pipeline pattern as the rest of the homelab. Observability config drifts the same way application config does, so it gets the same treatment.",
      },
    },
  ],
  edges: [
    { from: "fleet", to: "telegraf", style: "telemetry" },
    { from: "telegraf", to: "influx", style: "telemetry" },
    { from: "influx", to: "chrono", style: "telemetry" },
    { from: "influx", to: "kapacitor", style: "telemetry" },
    { from: "influx", to: "grafana", style: "telemetry", label: "queries" },
    { from: "kapacitor", to: "discord", style: "telemetry", label: "webhook" },
    { from: "gitlab", to: "ansible", style: "supply" },
    { from: "ansible", to: "fleet", style: "supply" },
  ],
};

export default arch;
