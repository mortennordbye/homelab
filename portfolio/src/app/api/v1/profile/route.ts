import { json } from "@/lib/api";
import { site } from "@/content/site";
import { certs, summary } from "@/content/resume";
import { skills } from "@/content/skills";

// Identity, certifications and skills, straight from the site's content
// modules (single source of truth). Static: refreshed on each deploy.
export const dynamic = "force-static";

export function GET() {
  return json({
    name: site.name,
    role: site.role,
    location: site.location,
    url: site.url,
    summary,
    socials: site.socials.map((s) => ({ label: s.label, href: s.href })),
    certifications: certs.map((c) => ({
      title: c.title,
      issuer: c.issuer,
      date: c.date,
      ...(c.credentialId ? { credentialId: c.credentialId } : {}),
    })),
    skills: skills.map((s) => ({ label: s.label, level: s.level, group: s.group })),
  });
}
