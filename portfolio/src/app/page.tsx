import { Hero } from "@/components/sections/Hero";
import { AboutSection } from "@/components/sections/AboutSection";
import { ResumeSection } from "@/components/sections/ResumeSection";
import { FeaturedWork } from "@/components/sections/FeaturedWork";
import { InfrastructureSection } from "@/components/sections/InfrastructureSection";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { LatestWriting } from "@/components/sections/LatestWriting";
import { CtaContact } from "@/components/sections/CtaContact";
import { getAllWork } from "@/lib/work";
import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: `${site.firstName} ${site.lastName} — ${site.role}`,
    description: site.description,
  },
};

// The page's subject is the Person, not an article. ProfilePage + mainEntity
// is what ties this URL to the identity a name query is looking for.
const profileJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": `${site.url}/#webpage`,
  url: `${site.url}/`,
  name: `${site.firstName} ${site.lastName} — ${site.role}`,
  isPartOf: { "@id": `${site.url}/#website` },
  about: { "@id": `${site.url}/#person` },
  mainEntity: { "@id": `${site.url}/#person` },
  primaryImageOfPage: `${site.url}/images/profile.webp`,
  inLanguage: "en-GB",
};

export default function Home() {
  const work = getAllWork();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />
      <Hero />
      <AboutSection />
      <ResumeSection />
      <FeaturedWork items={work} />
      <InfrastructureSection />
      <ServicesGrid />
      <LatestWriting />
      <CtaContact />
    </>
  );
}
