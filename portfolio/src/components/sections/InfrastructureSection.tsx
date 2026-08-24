import { Section } from "@/components/primitives/Section";
import { InfraBench } from "@/components/infrastructure/InfraBench";

export function InfrastructureSection() {
  return (
    <Section
      id="infrastructure"
      heading="This site is the case study."
      description="No Vercel, no Netlify. The page you are reading was built by CI, pushed to a registry, and reconciled by ArgoCD onto a self-hosted Talos Kubernetes cluster in Oslo. This is the cabinet it runs in, and the set is reading the cluster."
      className="section-rule"
      bleed={<InfraBench />}
    />
  );
}
