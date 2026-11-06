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
 * `components/fun/repo-objects/`, or it gets a plain box. The shelf holds 12.
 */
export const projectRepos: readonly ProjectRepo[] = [
  { name: "homelab", object: "a three-node rack", about: "GitOps homelab on Talos Kubernetes, Argo CD and Terraform." },
  { name: "lawless-waf", object: "a brass sieve", about: "Tunes Azure WAF false positives without Log Analytics prices." },
  { name: "agentic-dr", object: "a letter-copying press", about: "Generates disaster-recovery infrastructure from production IaC on demand." },
  { name: "verksted", object: "a phone in a vise", about: "A self-hosted workbench for driving coding agents from a phone." },
  { name: "headroom", object: "a strongbox", about: "Self-hosted personal finance: budgets, assets, investments and loans." },
  { name: "logeverylift", object: "a training log", about: "Mobile-first workout tracking PWA." },
  { name: "ruter-cli", object: "a tram destination blind", about: "Terminal departure board for Norwegian public transport." },
  { name: "innestemme", object: "a radio", about: "Local voice assistant in Rust that replaces Home Assistant's Assist." },
  { name: "openself", object: "a card index", about: "An open file format for a person's record." },
  { name: "openvita", object: "a typewriter", about: "Turns an OpenSelf profile into tailored CVs." },
  { name: "northlight", object: "a lighthouse", about: "A quiet, readable Hugo theme for technical writing." },
  { name: "reelsmith", object: "a film rewind bench", about: "Automated short-video pipeline." },
];
