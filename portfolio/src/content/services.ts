import { serviceSchema, type Service } from "./schemas";

const raw: Service[] = [
  {
    slug: "azure-engineering-and-architecture",
    title: "Azure Engineering & Architecture",
    accent: "brand",
    proof: {
      label: "Architect on an Azure migration · ~30 microservices to AKS, 33M+ requests/day at peak",
      workSlug: "betting-platform-cloud-migration",
    },
    blurb:
      "Azure platforms designed and built in Terraform, from landing zone and networking to AKS and observability.",
    summary:
      "I design and build Azure environments that hold up in production and stay understandable for the team that runs them. That covers the architecture decisions, the Terraform that implements them, and the migration of existing workloads onto the result.",
    bullets: [
      "Design landing zones, networking and identity sized to the workload and its compliance needs.",
      "Build the platform in Terraform: AKS, Front Door, vWAN, Key Vault, ACR and monitoring.",
      "Plan and run migrations onto Azure, service by service, with rollback at each step.",
      "Set up observability and alerting against the Azure Monitor baseline.",
      "Record architecture decisions so the reasoning outlives the engagement.",
    ],
  },
  {
    slug: "platform-engineering",
    title: "Platform Engineering",
    accent: "material",
    proof: {
      label: "Built a GitOps platform on Talos · ArgoCD app-of-apps on a 6-node cluster",
      workSlug: "k8s-homelab",
    },
    blurb:
      "Kubernetes platforms, GitOps and CI/CD that let teams ship safely without thinking about the plumbing.",
    summary:
      "I build the platform layer that application teams deploy onto: Kubernetes clusters, GitOps delivery and the pipelines around them. The goal is a platform that is stable, observable and reversible, where a change goes through a pull request like the rest of the code.",
    bullets: [
      "Design and run Kubernetes clusters, covering networking, storage, ingress and autoscaling.",
      "Set up GitOps with ArgoCD so every change is reviewed, versioned and reversible.",
      "Build CI/CD pipelines with promotion between environments and working rollbacks.",
      "Manage secrets, certificates and policy as part of the platform, not as extras.",
      "Harden clusters against CIS and Pod Security baselines.",
    ],
  },
  {
    slug: "technical-troubleshooting",
    title: "Technical Troubleshooting",
    accent: "brand2",
    proof: {
      label: ".NET thread-pool starvation found and fixed · production stabilised after an async refactor",
      workSlug: "dotnet-thread-pool-rca",
    },
    blurb:
      "Root-cause analysis when production misbehaves and nobody can say why, across infrastructure, platform and application.",
    summary:
      "When something breaks in a way nobody can explain, I dig until the cause is found and proven, then make sure it stays fixed. I work across the whole stack, because the problem rarely sits where it first shows up.",
    bullets: [
      "Reproduce intermittent failures and narrow them down with logs, metrics and traces.",
      "Trace issues across network, Kubernetes, operating system and application code.",
      "Get production back to a steady state quickly, then fix the cause, not the symptom.",
      "Write up what happened and why, so the team can spot it next time.",
      "Add the monitoring that would have caught it earlier.",
    ],
  },
];

export const services: Service[] = raw.map((s) => serviceSchema.parse(s));
