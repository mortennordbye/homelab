import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  workFrontmatterSchema,
  type Architecture,
  type WorkFrontmatter,
} from "@/content/schemas";
import sovereignArch from "@/content/work/sovereign-cloud-migration.arch";
import healthcareArch from "@/content/work/healthcare-rhel-migration.arch";
import puppetArch from "@/content/work/puppet-to-ansible.arch";
import k8sHomelabArch from "@/content/work/k8s-homelab.arch";
import tickArch from "@/content/work/tick-grafana-monitoring.arch";
import ansibleMgmtArch from "@/content/work/ansible-server-mgmt.arch";
import workspaceAzureArch from "@/content/work/workspace-azure-platform.arch";
import traefikGwArch from "@/content/work/traefik-gateway-api-pr.arch";
import ocSecretArch from "@/content/work/oc-shared-secret-aws.arch";
import postgresTlsArch from "@/content/work/postgres-tls-healthcare.arch";
import nasPciArch from "@/content/work/nas-pci-rhel-upgrade.arch";
import bettingArch from "@/content/work/betting-platform-cloud-migration.arch";
import dotnetRcaArch from "@/content/work/dotnet-thread-pool-rca.arch";

const WORK_DIR = path.join(process.cwd(), "src/content/work");

const archBySlug: Record<string, Architecture | undefined> = {
  "sovereign-cloud-migration": sovereignArch,
  "healthcare-rhel-migration": healthcareArch,
  "puppet-to-ansible": puppetArch,
  "k8s-homelab": k8sHomelabArch,
  "tick-grafana-monitoring": tickArch,
  "ansible-server-mgmt": ansibleMgmtArch,
  "workspace-azure-platform": workspaceAzureArch,
  "traefik-gateway-api-pr": traefikGwArch,
  "oc-shared-secret-aws": ocSecretArch,
  "postgres-tls-healthcare": postgresTlsArch,
  "nas-pci-rhel-upgrade": nasPciArch,
  "betting-platform-cloud-migration": bettingArch,
  "dotnet-thread-pool-rca": dotnetRcaArch,
};

export type WorkMeta = WorkFrontmatter & {
  body: string;
  arch?: Architecture;
};

let cache: WorkMeta[] | null = null;

export function getAllWork(): WorkMeta[] {
  if (cache) return cache;
  const files = fs.readdirSync(WORK_DIR).filter((f) => f.endsWith(".mdx"));
  const items = files.map((file) => {
    const raw = fs.readFileSync(path.join(WORK_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const fm = workFrontmatterSchema.parse(data);
    return { ...fm, body: content, arch: archBySlug[fm.slug] };
  });
  items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  cache = items;
  return items;
}

export function getWorkBySlug(slug: string): WorkMeta | undefined {
  return getAllWork().find((w) => w.slug === slug);
}
