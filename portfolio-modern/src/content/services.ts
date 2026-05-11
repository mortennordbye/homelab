import { serviceSchema, type Service } from "./schemas";

const raw: Service[] = [
  {
    slug: "kubernetes-and-containerization",
    title: "Kubernetes & Containerization",
    blurb:
      "Cluster design, workload migration and platform hardening for teams running Kubernetes in production.",
    summary:
      "I help teams design and run Kubernetes platforms that work in production. Whether you are moving your first app into containers or sorting out a cluster that has grown past its original design, the goal is the same: a platform that is stable, observable and stays out of the way of the people shipping code on top of it.",
    bullets: [
      "Design Kubernetes setups sized to the workload and the compliance requirements.",
      "Move existing applications into containers with as little downtime as possible.",
      "Set up clusters end to end: networking, storage, identity, ingress, autoscaling.",
      "Wire up CI/CD and GitOps so deployments are repeatable and reversible.",
      "Audit clusters against CIS and Pod Security baselines and fix what comes up.",
    ],
    cover: "/images/services/kubernetes-containerization.webp",
  },
  {
    slug: "gitops-and-ansible",
    title: "GitOps & Ansible",
    blurb:
      "Infrastructure as code your team can trust. Version-controlled, reviewed, reversible.",
    summary:
      "I set up GitOps workflows and Ansible automation so infrastructure changes go through pull requests like the rest of your code. The point is fewer late-night surprises, a clear audit trail, and the ability to roll back when something does go wrong.",
    bullets: [
      "Look at the current state and plan a GitOps rollout that fits your team size.",
      "Write and maintain Ansible roles and playbooks for the systems you actually run.",
      "Set up continuous delivery pipelines with rollbacks that work.",
      "Apply IaC practices: module structure, state handling, secrets.",
      "Add security and compliance checks into the pipeline so they happen automatically.",
    ],
    cover: "/images/services/gitops-ansible.webp",
  },
  {
    slug: "technical-consulting",
    title: "Technical Consulting",
    blurb:
      "Technical consulting for teams going through cloud migrations, infrastructure rebuilds or fast growth.",
    summary:
      "Technical support and consulting for teams in the middle of cloud transitions, infrastructure rebuilds or growth that is outpacing the original setup. I work alongside the team rather than from above it, and I try to leave the place better than I found it.",
    bullets: [
      "Find and resolve operational incidents, with the goal of getting back to steady state quickly.",
      "Help shape the longer-term plan for infrastructure and operations.",
      "Put security and data-protection practices in place across the stack.",
      "Lead infrastructure upgrades and cloud migrations, with rollback plans in place.",
      "Hand things over properly so the team owns the result after I leave.",
    ],
    cover: "/images/services/technical-support-consulting.webp",
  },
];

export const services: Service[] = raw.map((s) => serviceSchema.parse(s));
export const getService = (slug: string) => services.find((s) => s.slug === slug);
