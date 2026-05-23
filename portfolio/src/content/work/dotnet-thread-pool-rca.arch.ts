import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 520 },
  groups: [
    {
      id: "harness",
      label: "Replication harness — isolated reproduction",
      bounds: { x: 350, y: 260, w: 520, h: 180 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "spike",
      kind: "external",
      label: "Spike load",
      x: 40,
      y: 140,
      width: 170,
      detail: {
        role: "Production peak that broke the app",
        why: "Symptom surfaced under spike conditions and again on the next peak. Couldn't be reproduced on demand without the harness.",
      },
    },
    {
      id: "prod",
      kind: "compute",
      label: ".NET app on AKS",
      x: 260,
      y: 140,
      width: 220,
      detail: {
        role: "Production application",
        why: "Liveness and readiness probes were tripping under load. Restarts cascaded and the app couldn't scale up to absorb the spike.",
      },
    },
    {
      id: "probes",
      kind: "security",
      label: "Liveness / readiness probes",
      x: 520,
      y: 60,
      width: 240,
      detail: {
        role: "Failure surface",
        why: "What the rest of the team saw: restarts and scale-up errors in Log Analytics. The symptom, not the cause.",
      },
    },
    {
      id: "logs",
      kind: "observ",
      label: "Log Analytics",
      x: 800,
      y: 60,
      width: 240,
      detail: {
        role: "Symptom telemetry",
        why: "Enough to know something was wrong, not enough to identify the cause. The harness closed that gap.",
      },
    },
    {
      id: "repl",
      kind: "compute",
      label: "Replication harness",
      x: 400,
      y: 310,
      width: 220,
      detail: {
        role: "Isolated rebuild of the failure path",
        why: "Same components as production, smaller surface. Once it failed deterministically, the cause was clear: thread-pool saturation under sync-heavy load.",
      },
    },
    {
      id: "hc",
      kind: "security",
      label: "Hill Climbing flag",
      x: 660,
      y: 310,
      width: 200,
      detail: {
        role: "Runtime tuning",
        why: "Lets the thread-pool scaling algorithm react aggressively under spikes. Short-term mitigation while the refactor landed.",
      },
    },
    {
      id: "async",
      kind: "gitops",
      label: "Async refactor (customer-led)",
      x: 660,
      y: 410,
      width: 200,
      detail: {
        role: "Long-term fix",
        why: "Customer's developers refactored the sync call paths. I reviewed the diffs. Application has been stable since.",
      },
    },
  ],
  edges: [
    { from: "spike", to: "prod" },
    { from: "prod", to: "probes", label: "trips" },
    { from: "prod", to: "logs", style: "telemetry" },
    { from: "prod", to: "repl", style: "migration", label: "reproduced in" },
    { from: "hc", to: "prod", style: "supply", label: "mitigation" },
    { from: "async", to: "prod", style: "supply", label: "fix" },
  ],
};

export default arch;
