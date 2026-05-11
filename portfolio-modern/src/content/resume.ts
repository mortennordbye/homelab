import {
  certSchema,
  educationSchema,
  experienceSchema,
  type Cert,
  type Education,
  type Experience,
} from "./schemas";

const certsRaw: Cert[] = [
  {
    title: "Microsoft Certified: Azure Solutions Architect Expert",
    issuer: "Microsoft",
    date: "Feb 2026",
    credentialId: "1F5A74303E8DEC46",
  },
  {
    title: "Microsoft Certified: Azure Administrator Associate",
    issuer: "Microsoft",
    date: "Jan 2026",
    credentialId: "9AC5167520292789",
  },
  {
    title: "CKA: Certified Kubernetes Administrator",
    issuer: "The Linux Foundation",
    date: "Jan 2024",
    href: "/pdf/CKA.pdf",
  },
  {
    title: "LFS458: Kubernetes Administration",
    issuer: "The Linux Foundation",
    date: "Jan 2024",
    href: "/pdf/LFS458.pdf",
  },
  {
    title: "AWS Certified Cloud Practitioner",
    issuer: "Amazon Web Services",
    date: "Sep 2021",
  },
];

const educationRaw: Education[] = [
  {
    title: "Trade Certificate — Skilled ICT Service Operator",
    institution:
      "Royal Norwegian Ministry of Education & Research · Basefarm / Orange Business",
    period: "Issued Aug 2023",
    detail:
      "Two-year programme culminating in nationally recognised trade certificate. Passed with distinction.",
  },
  {
    title: "ICT Service Operator (vocational)",
    institution: "Kuben High School, Oslo",
    period: "2020 — 2021",
    detail:
      "Year-long programme covering ICT service fundamentals — troubleshooting, user communication, and maintaining IT systems and services. Hands-on work with Linux and Windows servers in real-world scenarios.",
  },
  {
    title: "Vocational Education in Electrical Studies",
    institution: "Ullern High School, Oslo",
    period: "2019 — 2020",
    detail:
      "Year-long programme in electrical engineering fundamentals. Built and analysed circuits, deepening the foundational hardware knowledge that informs my infrastructure work today.",
  },
];

const experienceRaw: Experience[] = [
  {
    role: "Cloud Engineer",
    company: "Orange Business",
    location: "Oslo",
    period: "Jan 2026 — Present",
    current: true,
    description: [
      "Cloud Engineer in the Public Cloud Transformation team, working directly with customers to build Azure infrastructure for their environments. Terraform and CI/CD pipelines for the deployments, with the goal of keeping the production setup boring and predictable.",
      "Running AKS and cloud-native platforms with ArgoCD for GitOps. Apps delivered through Helm and Kustomize. Platform pieces include Traefik, External Secrets Operator, cert-manager, Prometheus and OpenTelemetry.",
      "Azure networking and connectivity (Virtual WAN, ExpressRoute, Private Link, DNS), and Front Door + WAF for traffic. Observability through Azure Monitor, Managed Grafana, Log Analytics Workspaces and Azure Monitor Workspaces.",
    ],
    timeline: {
      note: "Azure platforms, Terraform, GitOps, observability.",
    },
  },
  {
    role: "System Consultant / Technical Account Manager",
    company: "Orange Business",
    location: "Oslo",
    period: "Aug 2025 — Jan 2026",
    description: [
      "Came back from military service as Technical Account Manager in the Service Delivery team. Focus on Kubernetes platforms and RHEL-based environments in regulated industries.",
      "For healthcare customers I ran on-prem Kubernetes clusters with ArgoCD for GitOps, GitLab for CI/CD, Fluent Bit for logs, Traefik for ingress, Cilium for networking and Postgres as the main data service. F5 WAF, SIEM and IDS integrations on top to meet compliance and availability requirements.",
      "I also managed PCI-compliant RHEL environments for aviation customers and other regulated sectors. Automation via Ansible and GitLab CI/CD, vulnerability management with Wazuh and Nessus, security operations through Splunk and IPA.",
    ],
    timeline: {
      role: "System Consultant",
      note: "Healthcare and aviation, on-prem Kubernetes and RHEL.",
    },
  },
  {
    role: "SSS Fire & Accident Instructor",
    company: "Royal Norwegian Navy",
    location: "KNM Tordenskjold",
    period: "Aug 2024 — Aug 2025",
    description: [
      "Trained naval personnel at the Navy's Security Center in fire and accident response. Worked with smoke divers (røykdykkere) and specialised teams through realistic drills, live-fire exercises and accident simulations.",
      "Also acted as the department's IT person. Wrote scripts and small automations for repetitive tasks the instructors had been doing by hand, so they could spend more time on actual instruction.",
      "Got internal training in leadership and teaching methods. A lot of the same thinking applies to incident response: small actions in the right order, done calmly by people who knew their roles before anything went wrong.",
    ],
    timeline: {
      role: "Navy Instructor",
      company: "KNM Tordenskjold",
      note: "Incident response, taught calmly under load.",
    },
  },
  {
    role: "System Consultant / Technical Account Manager",
    company: "Orange Business",
    location: "Oslo",
    period: "Aug 2023 — Aug 2024",
    description: [
      "Service Delivery team. Ran cloud and on-prem infrastructure for a broad customer base. Acted as Technical Account Manager for two of them alongside the project work.",
      "Customers ranged from small businesses to large enterprises. The work was a mix of setting things up, keeping them running and improving them where it mattered.",
      "Daily stack: Kubernetes, Linux (RHEL), GitLab, Ansible, SQL (Postgres, MySQL, MSSQL), Python / Bash / PowerShell, TICK (Telegraf, InfluxDB, Chronograf, Kapacitor), Grafana, F5 BIG-IP, AWS, Windows Server. Most of the time spent on automation and orchestration.",
    ],
    timeline: {
      role: "System Consultant",
      note: "Kubernetes and Linux for regulated customers.",
    },
  },
  {
    role: "Operations Technician",
    company: "Basefarm / Orange Business",
    location: "Oslo",
    period: "Aug 2021 — Aug 2023",
    description: [
      "Operations Center role. First-line support for customer requests and the alarm gateway. Handled events, incidents, changes and service requests across the full OSI model, working inside ITIL.",
      "Operational responsibility across hundreds of customers, which meant a lot of context-switching and quick problem-solving in environments I had not seen before.",
      "Appointed team lead for the Incident Team (INO) and Change Team (CNO), coordinating operations with ITIL. Also part of the maintenance team, planning monthly upgrades so they would land without surprise downtime.",
      "Worked the full shift rotation towards the end, including solo night shifts as 'senior'.",
    ],
    timeline: {
      note: "On-prem, alarm gateway, full shift rotation.",
    },
  },
  {
    role: "Programming Course Holder",
    company: "Oslo Municipality",
    location: "Oslo",
    period: "2018 — 2019",
    description: [
      "Taught school-age children block-based visual programming. First time teaching technology, and a lesson in how much explaining something simply actually helps.",
    ],
  },
];

export const certs: Cert[] = certsRaw.map((c) => certSchema.parse(c));
export const education: Education[] = educationRaw.map((e) => educationSchema.parse(e));
export const experience: Experience[] = experienceRaw.map((e) => experienceSchema.parse(e));

export type CareerStop = {
  year: string;
  role: string;
  company: string;
  note: string;
  current: boolean;
};

function startYearOf(period: string): string {
  return period.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? "";
}

/**
 * Career timeline rendered in the About section. Derived from `experience` —
 * every entry appears here by default, sorted chronologically (oldest first).
 * To opt an entry out, add `timeline: { hidden: true }` to it. To clean up
 * verbose résumé titles for the visual, use `timeline.role` / `timeline.company`.
 */
export const careerPath: CareerStop[] = experience
  .filter((e) => !e.timeline?.hidden)
  .map((e) => ({
    year: startYearOf(e.period),
    role: e.timeline?.role ?? e.role,
    company: e.timeline?.company ?? e.company,
    note: e.timeline?.note ?? "",
    current: e.current ?? false,
  }))
  .sort((a, b) => Number(a.year) - Number(b.year));

/**
 * Résumé summary paragraph. Drives the LaTeX `resume/summary.tex` and is
 * available for the website /resume page header should we choose to render it.
 */
export const summary =
  "Cloud engineer working on automated, secure infrastructure in regulated industries. Focus on Azure-native platforms, Kubernetes (AKS and on-prem K3s and Talos), GitOps with ArgoCD, and Terraform-based CI/CD. Worked with healthcare and aviation customers where F5 WAF, SIEM and IDS integrations are needed to meet strict compliance and availability requirements. Day to day I work with the platform pieces a cluster relies on: Traefik, Cilium, External Secrets Operator, cert-manager, Prometheus and OpenTelemetry. I also run a six-node Talos cluster at home as an open lab. Configurations and experiments live on GitHub.";
