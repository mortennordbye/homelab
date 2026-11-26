import { getCollection } from "astro:content";

export const SITE_URL = "https://docs.nordbye.it";
export const SUMMARY =
  "How the Genesis homelab is built and run: a 3-node Proxmox cluster running Talos Kubernetes, provisioned by Terraform and reconciled by Argo CD.";

export const pageUrl = (id: string) => `${SITE_URL}/${id}/`;
export const mdUrl = (id: string) => `${SITE_URL}/${id}.md`;
// Site links become absolute, so the Markdown still works when read outside the site.
export const absolute = (body: string) => body.replace(/\]\(\//g, `](${SITE_URL}/`);

export async function pages() {
  return (await getCollection("docs")).sort((a, b) => a.id.localeCompare(b.id));
}
