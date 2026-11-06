/**
 * The repos pinned on the GitHub profile. Names only — everything else is
 * fetched at request time. Curated by hand because pins need an authenticated
 * GraphQL call; keep in step with the profile.
 */
export const pinnedRepos: readonly string[] = [
  "homelab",
  "headroom",
  "lawless-waf",
  "logeverylift",
];

export type ProjectRepo = {
  name: string;
  /** What stands for it on the /fun shelf. Shown under the name. */
  object: string;
  /** Used only when GitHub has no description or cannot be reached. */
  about: string;
};

/**
 * Every repo that is a project rather than a script, in /fun shelf order: top
 * row left to right, then down. Each name needs an object in
 * `components/fun/repo-objects/` (the repo's icon, made physical), or it gets
 * a plain box. The shelf holds 12.
 */
export const projectRepos: readonly ProjectRepo[] = [
  { name: "homelab", object: "an apple on its branch", about: "GitOps homelab on Talos Kubernetes, Argo CD and Terraform." },
  { name: "lawless-waf", object: "a shield in an outlaw hat", about: "Tunes Azure WAF false positives without Log Analytics prices." },
  { name: "agentic-dr", object: "a failover arc", about: "Generates disaster-recovery infrastructure from production IaC on demand." },
  { name: "verksted", object: "a pocket workshop", about: "A self-hosted workbench for driving coding agents from a phone." },
  { name: "headroom", object: "an arrow under the ceiling", about: "Self-hosted personal finance: budgets, assets, investments and loans." },
  { name: "logeverylift", object: "a 20 kg plate", about: "Mobile-first workout tracking PWA." },
  { name: "ruter-cli", object: "a runner chasing a tram", about: "Terminal departure board for Norwegian public transport." },
  { name: "innestemme", object: "a house with a voice", about: "Local voice assistant in Rust that replaces Home Assistant's Assist." },
  { name: "openself", object: "a fingerprint", about: "An open file format for a person's record." },
  { name: "openvita", object: "a CV with a fingerprint", about: "Turns an OpenSelf profile into tailored CVs." },
  { name: "northlight", object: "a north light", about: "A quiet, readable Hugo theme for technical writing." },
  { name: "reelsmith", object: "a hot play button on an anvil", about: "Automated short-video pipeline." },
];
