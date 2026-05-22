import { Hero } from "@/components/sections/Hero";
import { AboutSection } from "@/components/sections/AboutSection";
import { ResumeSection } from "@/components/sections/ResumeSection";
import { FeaturedWork } from "@/components/sections/FeaturedWork";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { LatestWriting } from "@/components/sections/LatestWriting";
import { CtaContact } from "@/components/sections/CtaContact";
import { getAllWork } from "@/lib/work";

export default function Home() {
  const work = getAllWork();
  return (
    <>
      <Hero />
      <FeaturedWork items={work} />
      <ServicesGrid />
      <AboutSection />
      <ResumeSection />
      <LatestWriting />
      <CtaContact />
    </>
  );
}
