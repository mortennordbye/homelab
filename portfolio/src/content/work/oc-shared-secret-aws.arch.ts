import type { Architecture } from "@/content/schemas";

const arch: Architecture = {
  viewBox: { w: 1100, h: 500 },
  groups: [
    {
      id: "aws",
      label: "AWS — Operations Centre tenancy",
      bounds: { x: 260, y: 80, w: 580, h: 360 },
      tone: "accent-dashed",
    },
  ],
  nodes: [
    {
      id: "sender",
      kind: "external",
      label: "Engineer sending",
      x: 50,
      y: 220,
      width: 170,
      detail: {
        role: "Holds a secret that needs to be handed over",
        why: "Before: email, chat, shared spreadsheet. None of those pass a security review and none of them age well.",
      },
    },
    {
      id: "idp",
      kind: "security",
      label: "Operations Centre IdP",
      x: 290,
      y: 100,
      width: 200,
      detail: {
        role: "Existing centre authentication",
        why: "No extra credentials to manage. Everyone who already has access to the centre can use the tool; nobody else can.",
      },
    },
    {
      id: "app",
      kind: "compute",
      label: "Shared-secret app",
      x: 290,
      y: 230,
      width: 200,
      detail: {
        role: "Python web service",
        why: "Single tool to replace the ad-hoc handover paths. Generates a one-time retrieval link and hands it to the sender to pass along.",
      },
    },
    {
      id: "store",
      kind: "data",
      label: "One-time store",
      x: 580,
      y: 230,
      width: 200,
      detail: {
        role: "Encrypted secret, single retrieval",
        why: "Link works once. Second click returns nothing. Removes the long-tail risk of a secret sitting in someone's inbox forever.",
      },
    },
    {
      id: "audit",
      kind: "observ",
      label: "Retrieval log",
      x: 580,
      y: 350,
      width: 200,
      detail: {
        role: "Who fetched what, when",
        why: "If a credential later needs rotating, the retrieval log is the trail. The whole point of moving off email was getting this trail.",
      },
    },
    {
      id: "recipient",
      kind: "external",
      label: "Receiving engineer",
      x: 880,
      y: 230,
      width: 170,
      detail: {
        role: "Opens the one-time link",
        why: "After retrieval the secret is gone from the store. Only the audit entry remains.",
      },
    },
  ],
  edges: [
    { from: "sender", to: "app" },
    { from: "idp", to: "app", style: "supply", label: "auth" },
    { from: "app", to: "store", style: "supply" },
    { from: "app", to: "audit", style: "telemetry" },
    { from: "app", to: "recipient", label: "one-time link" },
  ],
};

export default arch;
