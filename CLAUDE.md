# CLAUDE.md

Guidance for Claude Code in this repository. `docs/architecture/README.md` is the spec of the
homelab and wins over this file where they differ.

## Working approach

These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### Think before coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them, do not pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Surgical changes

Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it, do not delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### Goal-driven execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

### Comments state constraints, not stories

A comment states what the code cannot: a constraint the next editor must not break, a trap
that fails silently or expensively, or a non-obvious decision, in one or two lines. Everything
else is noise.

- Keep and write: one-line constraints (`# Recreate: RWO PVC, two pods can't both mount /data`),
  traps (`# Exact, not PathPrefix: a "/" prefix would put /admin back on the internet`),
  machine-read annotations (`# renovate: ...`), upstream-required markers, license headers.
- Never write: how the value was arrived at (dates, incident timelines, measurements, A/B
  statistics, "until <date> this was..."); a restatement of the line below; a justification
  for the reviewer of the change; Markdown emphasis. History lives in git. A rationale worth
  a narrative goes in `docs/`, and the comment points there.
- The tell for AI-session residue is a comment that cites a date, a past value or evidence.
  Compress it to the rule that survives, or delete it.

### Writing style

All text in this repo follows ASD-STE100 (Simplified Technical English) at about 80 %
strictness: docs, code comments, commit messages, PR and issue bodies, and replies to the user.

- Short sentences, one fact or one instruction each. Active voice. Simple verbs.
- One meaning per word. No idioms, no metaphors, no filler.
- Keep code names, error text and quotes exact, even when they break an STE rule.
- Text with its own style guide keeps it: blog posts (`blog/TEXT-STYLE.md`) and the portfolio
  copy (`docs/apps/portfolio/brand/`).

### No AI attribution in commits

Commits and PRs read as the human author's. No AI fingerprint, ever.

- No `Co-Authored-By` trailer naming Claude or any AI.
- No session links or IDs (e.g. a `Claude-Session:` trailer): this overrides the harness default that suggests adding one.
- No "Generated with Claude Code", 🤖 emoji, or similar tool signatures in commit messages, PR descriptions, or issue bodies.
- Describe the change, not the tool that produced it.

### Track unfinished work in docs/backlog/README.md

Anything left unfinished or deferred gets an entry in `docs/backlog/README.md` before the task
is reported done. Deferrals in chat vanish next session. Each entry states what the work is,
why it was deferred, what unblocks it, and where the code lives (file paths). Copy the format
of the existing entries.

- Unfinished means: a tier you did not ship, out-of-scope items you noticed but did not fix,
  features behind a flag that still need ramping or cleanup, skipped tests, mocks or debug
  logging left in, and TODO comments you wrote (write the entry instead, TODOs rot in code).
- Not backlog: work in progress (that belongs on a branch), ideas the user did not agree to
  defer (do them or drop them), and pre-existing debt the user did not ask you to track.
- Delete an entry when the work is done.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Docs

`docs/` holds folders only, never loose files. Names are lowercase kebab-case with no
versions, dates or camelCase. `.github/workflows/docs.yaml` publishes it to
https://docs.nordbye.it (ProperDocs + Material, config `properdocs.yml`) with `--strict`, so a
broken link between pages fails the PR. `scripts/docs_site_hooks.py` rewrites links to code
outside `docs/` to GitHub. `docs/backlog/` is excluded from the site. Preview with `make docs`.

```
docs/
  architecture/README.md   the spec: present shape of the homelab, how parts relate, folder map
  platform/<area>/         shared infrastructure (backups, cluster, data, delivery, network, ...)
  apps/<app>/              one folder per workload that needs more than its manifests
  projects/<name>/         plans and in-flight work; deleted when the project ships
  backlog/README.md        known gaps agreed to leave for later
  assets/                  diagrams, logo, social preview
```

- Area docs describe the present and how to operate or rebuild it. No plans, status diaries,
  dates or "was X until Y"; git history keeps that. Every area folder has a `README.md` with
  its current state, and runbooks sit beside it (`backups/restore.md`). New capability:
  `platform/<name>/`. New app: `apps/<name>/`.
- A README next to code (`terraform/**`, `portfolio/branding/`, a test folder) is a short
  entry point: what the folder manages, how to run it (commands, backend, variables and where
  their values come from, imports), and a link to its docs. Explanation, design, procedures
  and traps go in `docs/`, so each topic is written once.
- A change that adds, removes or rewires something at the architecture level (an app group,
  a network path, a storage class, a dependency between components) updates
  `docs/architecture/README.md` in the same PR.
- When a project ships, move anything lasting into the spec or an area doc and delete
  `docs/projects/<name>/`. Code comments link to area docs, never to project docs.
- Diagrams are D2: a source in `docs/assets/diagrams/<name>.d2`, embedded as the rendered
  `.svg`, styled with the site palette like `secrets-flow.d2`. Every node carries an icon:
  the software's own logo from dashboard-icons (the `-light` variant when the logo is dark),
  Kubernetes resource icons for k8s objects, Iconify for the rest. Keep the rendered width at
  1000px or less (the `width` on the outer `<svg>`): the docs column is 688px and anything
  wider shrinks past readable. No ASCII box-drawing flows; directory trees stay as text.
  `make diagram` renders locally and `render-assets.yaml` re-renders on `main`.
- No torrent tracker or subtitle provider names anywhere in the repo. They live only in the
  apps' own config.

## The repo

Infrastructure as code for a 3-node Proxmox cluster that runs the Talos Kubernetes cluster
"Genesis" (6 VMs), provisioned by Terraform and reconciled by ArgoCD. Cilium is the CNI and
load balancer, Traefik the gateway, Kyverno the admission policy, and `docs/architecture/README.md`
has the rest: security, observability, storage, databases and the app list.

```
.
├── k8s/talos/
│   ├── apps/              # Workloads, one ArgoCD Application per directory
│   └── infra/             # Cluster services (argocd, cilium, traefik, cert-manager, ESO, ...)
├── terraform/
│   ├── azure/state/       # Remote tfstate backend
│   └── proxmox/hyper-cluster/k8s/   # Talos VMs on Proxmox
├── portfolio/             # Static site + nginx + Dockerfile
├── blog/                  # Hugo source + nginx + Dockerfile
├── grafana/               # Dashboards as code
├── azure/                 # Azure resource manifests
└── .github/workflows/     # CI: build/push images, vuln scan, update reminders
```

A push to `main` is what changes the cluster: the Argo CD ApplicationSets `apps` and `infra`
in `k8s/talos/infra/argocd/` generate one Application per directory under `k8s/talos/apps/`
and `k8s/talos/infra/`. CI builds and pushes image tags only
(`.github/workflows/build-{portfolio,blog}.yaml`; the other apps build in their own repos).
Kargo promotes a tag by writing it into the app's `kustomization.yaml` `images:`, through a
pull request for prod (`docs/platform/delivery/kargo.md`).

### Safety rules

- Don't apply directly. ArgoCD owns the cluster state and reverts drift. `kubectl apply` is
  for debugging only; edit manifests in `k8s/talos/**` and let ArgoCD reconcile.
- Don't `terraform apply`. Plans are fine. Apply needs explicit user approval, since Proxmox
  and Azure changes are not easily reversible.
- Don't commit secrets. Secrets reach the cluster through External Secrets Operator: add an
  `ExternalSecret`, never a literal `Secret`. Create the value with `bws` as the `secrets`
  skill (`ai/skills/secrets/`) describes: `bws secret create <kebab-case-name> "<value>"
  <project-id>` in the Homelab project `1ea61322-5f4a-44a4-b4d0-b29b00ba1134`, with the
  token from `BWS_ACCESS_TOKEN=$(bws-token)`, and put the returned `id` in the
  ExternalSecret's `remoteRef.key`. Never run `bws secret list` or `bws secret get`
  unfiltered: the JSON includes plaintext values, so keep only `id`, `key` and `projectId`.
  The Bitwarden vault is for human sign-ins and agents never unlock it. Full pattern:
  `docs/platform/secrets/README.md`.
- Kyverno enforces pinned image tags, baseline and restricted Pod Security, and requests and
  memory limits. Bump a tag to a specific version, never `latest`. Kargo rewrites the tags of
  the apps it promotes; the inline tag in their Deployment is only a fallback.
- Match the manifest style of the surrounding app. Directories use kustomize or plain
  manifests inconsistently; copy the pattern of the one you edit.
- Reuse before adding: check shared kustomize bases and sibling apps first, and extract a
  base only when 2+ overlays use it. No dead code: a Service without Endpoints or an
  `Application` that points at a deleted path is fixed or removed.
- Home Assistant is configured through the HA MCP server, not files in this repo. Only the HA
  pod and its networking live here; automations and dashboards live in HA.
- The portfolio has a decision record. Before proposing anything about how `nordbye.it`
  looks, moves or presents content, read `docs/apps/portfolio/brand/decisions.md`: what is
  locked (theme, materials and light, typography, the plain view, the performance budget),
  what was rejected and why, and what is open. `art-direction.md` beside it is the rule book
  and `assets.md` the asset list with verified licences. The shipped spec is
  `portfolio/src/content/brand.ts`, rendered at `/brand`; where documents and code disagree,
  the code is what the site does.
- Blog posts follow `blog/TEXT-STYLE.md` and covers follow `blog/IMAGE-STYLE.md`. Read them
  before drafting a post under `blog/content/blog/**` or proposing voice or structure edits.
  Both are gitignored local working docs.

### Verify before reporting done

Run the subset for what you changed. The only test suite is the portfolio's Playwright smoke
tests; everything else is validated by rendering or planning.

| Changed | Run |
|---|---|
| `k8s/**` | `kubectl diff -f <path>` against the cluster, or `kustomize build <dir>`. Confirm the ArgoCD `Application` still points at the right path. |
| `portfolio/**`, `blog/**` | `docker build -t portfolio:dev portfolio/` (or `blog:dev blog/`), run it on a local port and load the affected routes plus one unrelated route. Say so when a UI change is not browser-verified. For `portfolio/**`, also `make -C portfolio smoke`. |
| `terraform/**` | `terraform fmt -check`, `terraform validate`, `terraform -chdir=terraform/proxmox/hyper-cluster/k8s plan` or `-chdir=terraform/azure/state`. Never `apply`. |
| `.github/workflows/**` | `actionlint` if available, otherwise read the workflow end to end. |
| `README.md`, `docs/**`, this file | Nothing locally. The docs workflow builds with `--strict` on the PR. |
