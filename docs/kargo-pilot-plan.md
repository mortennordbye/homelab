# Kargo promotion pilot — plan

> **Historical planning record.** The pilot shipped; some decisions here were
> superseded in implementation. Notably: image selection is **SemVer** on
> `0.0.<run_number>` tags (not `NewestBuild`/SHA `allowTags`); sync uses
> **`argocd-update` + `argocd-wait`** (not selfHeal-only), with `desiredRevision`
> intentionally **unpinned**; and the pipelines live in a single
> `k8s/talos/infra/kargo-projects/` dir (shared ClusterPromotionTask + one file
> per app), not `kargo-portfolio/`. For the current state, see
> [`docs/kargo.md`](kargo.md); this file is kept for the decision journey.

Evaluate and pilot [Kargo](https://kargo.io/) (Akuity's GitOps promotion engine) on top of
the existing Argo CD setup, replacing the hand-rolled "CI rewrites the image tag and commits"
promotion flow with a real Warehouse → Freight → Stage → Promotion pipeline.

- Scope of the pilot: **portfolio only** (`portfolio-stage` → `portfolio`). Blog and headroom
  stay on the current flow until the pilot proves out.
- Docs + version snapshot date: **2026-07-16**.
- Everything under "Verified facts" was pulled from the live upstream docs / GitHub on that date.
  Everything under "Repo current state" was read from this repository. "Open decisions" are
  choices that must be made deliberately — they are not assumed here.

---

## 1. Version to pin

- Latest **stable** release: **`v1.10.9`**, published 2026-07-14 (GitHub `akuity/kargo` releases API).
- `v1.11.0` is still a pre-release (`v1.11.0-rc.3`, 2026-07-16). Do **not** pilot on an RC.
- Also current on their own maintenance lines: `v1.9.10`, `v1.8.14` (backport patch releases).
- Decision: pin the Helm chart to **`1.10.9`**. Revisit `1.11.x` only after it goes stable.

Helm chart is published as an OCI artifact: `oci://ghcr.io/akuity/kargo-charts/kargo`.

---

## 2. Verified facts from the official docs (v1.10.x)

### 2.1 Prerequisites (upstream "Basic Installation", tested versions)

| Component      | Tested version | Required?                                  |
|----------------|----------------|--------------------------------------------|
| Kubernetes     | v1.29.3        | Yes                                        |
| Helm           | v3.13.1        | Yes (>= 3.13.1 to auth against the OCI chart) |
| cert-manager   | v1.16.1        | Required for the default install config    |
| Argo CD        | v2.13.0        | Optional but strongly recommended          |
| Argo Rollouts  | v1.7.2         | Optional; only needed for Stage verification |

cert-manager and Argo CD are **already running in this cluster** (`k8s/talos/infra/`), so the
hard prerequisites are met. Argo Rollouts is **not** currently installed — it is only needed if
we adopt Stage verification (phase 3, optional).

### 2.2 Core concepts (from "Core Concepts")

- **Project**: unit of tenancy; maps 1:1 to a Kubernetes namespace; holds the pipeline resources
  and RBAC. Created as a `Project` CR (plus a `ProjectConfig` for policies).
- **Warehouse**: subscribes to artifact sources (container image repos, git repos, Helm charts)
  and, when it discovers a new revision, produces **Freight**.
- **Freight**: an immutable, versioned "box" referencing specific artifact revisions (e.g. one
  image digest/tag). This is the thing that gets promoted.
- **Stage**: a promotion target (an environment). Stages link together to form the pipeline.
  A Stage requests Freight either directly from a Warehouse or from an upstream Stage.
- **Promotion**: the act of moving a piece of Freight into a Stage by running that Stage's
  `promotionTemplate` steps (git writes + Argo CD sync). Distinct from the actual deploy, which
  Argo CD still performs.
- **PromotionTask**: optional reusable, parameterised bundle of promotion steps (DRY across stages).

### 2.3 Warehouse spec (from "Working with Warehouses")

```yaml
apiVersion: kargo.akuity.io/v1alpha1
kind: Warehouse
metadata:
  name: <name>
  namespace: <project-namespace>
spec:
  interval: 5m                 # poll frequency (clamped to a system minimum)
  freightCreationPolicy: Automatic   # or Manual
  subscriptions:
    - image:
        repoURL: <registry/repo>       # required, no tag
        imageSelectionStrategy: SemVer # SemVer | Lexical | Digest | NewestBuild
        constraint: <semver range>     # for SemVer
        discoveryLimit: 20
        allowTags: <regex>             # tag allowlist
        ignoreTags: [<regex>, ...]     # tag denylist
        platform: linux/amd64          # optional
```

Git and Helm-chart subscriptions exist too (`commitSelectionStrategy`, `branch`, `semverConstraint`, ...).

### 2.4 Stage spec (from "Working with Stages")

```yaml
apiVersion: kargo.akuity.io/v1alpha1
kind: Stage
metadata:
  name: <stage>
  namespace: <project-namespace>
spec:
  requestedFreight:
    - origin:
        kind: Warehouse
        name: <warehouse-name>
      sources:
        direct: true            # accept new Freight straight from the Warehouse
        # --- OR, for a downstream stage: ---
        # stages: [<upstream-stage>]        # only Freight verified upstream
        # availabilityStrategy: OneOf|All   # default OneOf
  promotionTemplate:
    spec:
      vars:
        - name: gitopsRepo
          value: https://github.com/mortennordbye/homelab.git
      steps:
        - uses: git-clone
          config:
            repoURL: ${{ vars.gitopsRepo }}
            checkout:
              - branch: main
                path: ./src
        # ...set image, commit, push, argocd-update...
```

Freight flow: Warehouse → Stage with `sources.direct: true` (stage) → downstream Stage with
`sources.stages: [stage]` (prod). A downstream Stage can only receive Freight that has been
**verified** in its upstream Stage(s).

### 2.5 Auto-promotion (from "Working with Stages")

- Auto-promotion is configured **only at the Project level**, in `ProjectConfig`
  (`spec.promotionPolicies`), never on a Stage. This is a deliberate security boundary: a user who
  can edit a Stage but lacks promote permission must not be able to trigger a promotion.
- Selection policies: `NewestFreight` (default) or `MatchUpstream`.
- Practical mapping for the pilot: **auto-promote to `stage`**, **manual-promote to `prod`**.

### 2.6 Promotion steps (from "Promotion Steps Reference")

Available steps include: `git-clone`, `git-clear`, `copy`, `kustomize-set-image`,
`kustomize-build`, `helm-update-image`, `yaml-update`, `helm-update-chart`, `helm-template`,
`git-commit`, `git-push`, `git-open-pr`, `git-wait-for-pr`, `argocd-update`.

- `kustomize-set-image`: rewrites the `images:` entry in a `kustomization.yaml`. **Requires an
  `images:` block to exist.**
- `yaml-update`: edits an explicit key path in an arbitrary YAML file (works on `deployment.yaml`
  directly without a kustomize `images:` block).
- `argocd-update`: forces an Argo CD Application to refresh/sync after the git push.

### 2.7 `argocd-update` + authorization annotation (from the step reference)

For Kargo to be allowed to sync an Argo CD Application, the Application **must** carry:

```yaml
metadata:
  annotations:
    kargo.akuity.io/authorized-stage: "<project>:<stage>"
```

Example step:

```yaml
- uses: git-commit
  as: commit
  config: { path: ./out, message: "promote portfolio to stage" }
- uses: git-push
  config: { path: ./out }
- uses: argocd-update
  config:
    apps:
      - name: portfolio-stage
        sources:
          - repoURL: https://github.com/mortennordbye/homelab.git
            desiredRevision: ${{ outputs.commit.commit }}
```

### 2.8 Credentials (from "Managing Secrets")

Kargo reads credentials from labelled Secrets **in the Project's namespace** (or a shared
operator-managed namespace):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: <any-name>
  namespace: <project-namespace>
  labels:
    kargo.akuity.io/cred-type: git   # git | helm | image | generic
stringData:
  repoURL: https://github.com/mortennordbye/homelab.git
  repoURLIsRegex: "false"            # optional
  username: <user>
  password: <PAT-or-token>           # or use sshPrivateKey for git
```

- `git` cred type: for cloning/pushing the GitOps repo. **Needs write (push) access** for promotion.
- `image` cred type: for reading a **private** container registry when discovering tags.

### 2.9 Verification (optional, from "Verifying Freight in a Stage")

- A Stage references one or more Argo Rollouts `AnalysisTemplate`s:

  ```yaml
  spec:
    verification:
      analysisTemplates:
        - name: portfolio-smoke
  ```

- On successful Promotion the Stage enters `Verifying`, spawns an `AnalysisRun`, and marks the
  Freight `verified` only if the run succeeds. Downstream (prod) Stages consume only verified Freight.
- Kargo reuses the **Argo Rollouts** `AnalysisTemplate` / `AnalysisRun` CRDs (`argoproj.io/v1alpha1`).
  Verification therefore requires Argo Rollouts (at least its CRDs + controller) to be installed.
- Note the expression syntax split: Kargo promotion uses `${{ }}`; Argo Rollouts AnalysisTemplates
  use `{{ }}` (no `$`).

---

## 3. Repo current state (read from this repository)

- Apps are generated by a single **ApplicationSet** (`k8s/talos/infra/argocd/apps.yaml`) using a
  git **directory generator** over `k8s/talos/apps/*`. Each app becomes an Argo CD `Application`
  named `{{ path.basename }}` (so `portfolio`, `portfolio-stage`, `blog`, `blog-stage`, `headroom`),
  in the `argocd` namespace, project `apps`, `targetRevision: HEAD`.
- The ApplicationSet template sets `syncPolicy.automated.selfHeal: true` and `prune: true`. So a
  git commit to `main` is reconciled automatically without any explicit sync trigger.
- Portfolio image reference (prod): `k8s/talos/apps/portfolio/deployment.yaml`
  → `image: ghcr.io/mortennordbye/homelab/portfolio:<tag>`.
  Stage: `k8s/talos/apps/portfolio-stage/deployment.yaml`.
- **Image tags are short git SHAs** (e.g. `def4da2`, `caa53f4`), plus a moving `stage` / `prod`
  tag. Produced by `.github/workflows/build-portfolio.yaml`:
  `tags: <repo>:<git-sha>` and `<repo>:<env>`. The deployment pins the immutable `<git-sha>` tag.
- The kustomizations (`k8s/talos/apps/portfolio*/kustomization.yaml`) have **no `images:` block** —
  the tag lives inline in `deployment.yaml`.
- Current promotion is `sed -i` on `deployment.yaml` + `git commit`/`rebase`/`push origin HEAD:main`
  inside the build workflow. Manual prod deploy = re-run the workflow with `environment: prod`,
  which **skips the CI gate**.
- headroom uses a **different** image repo (`ghcr.io/mortennordbye/headroom`, not `.../homelab/...`)
  and is built outside this repo's portfolio/blog CI. Out of pilot scope.

---

## 4. Gap analysis — what Kargo replaces

| Today (GitHub Actions)                                   | With Kargo                                              |
|----------------------------------------------------------|--------------------------------------------------------|
| CI `sed`s the tag into `deployment.yaml` and commits     | CI only builds + pushes image; **Warehouse** detects it |
| Moving `stage`/`prod` image tags carry "what's deployed" | Git (via Promotion commits) is the single source of truth |
| Manual `environment: prod` dispatch, **skips CI gate**   | Prod Stage consumes only Freight verified in `stage`   |
| Promotion order enforced by a workflow concurrency group | Enforced structurally by Stage `sources`               |
| No record of "which build is in which env" beyond git log| Freight + Stage status make it first-class + visible in UI |

The correctness win worth calling out: today the manual prod path can ship an image that never
passed CI. Kargo makes "prod only receives something already verified in stage" structural.

---

## 5. Design decisions for the pilot (recommended, but see §6)

1. **Image selection strategy = `NewestBuild`.** The tags are 7-char git SHAs, so SemVer and
   Lexical ordering are meaningless. `NewestBuild` orders by image build/creation time. Combine
   with `ignoreTags: ["^stage$", "^prod$"]` (or an `allowTags` regex `^[0-9a-f]{7,}$`) so the
   moving env tags are never selected as Freight.
2. **Promotion mechanism = restructure to a kustomize `images:` block + `kustomize-set-image`.**
   Add to each portfolio kustomization:

   ```yaml
   images:
     - name: ghcr.io/mortennordbye/homelab/portfolio
       newTag: <current-sha>
   ```

   and drop the inline tag from `deployment.yaml` (leave the untagged image, or a placeholder).
   This is the idiomatic Kargo path and keeps promotions to a one-field change. Alternative:
   keep the current structure and use `yaml-update` against
   `spec.template.spec.containers.0.image` in `deployment.yaml` (smaller diff, less idiomatic).
3. **Promote to `main`, same branch as today.** The ApplicationSet tracks `HEAD` and self-heals,
   so writing promotion commits to `main` mirrors the current model and needs no branch redesign.
   (A rendered-branch / stage-branch strategy is a possible later refinement, not needed now.)
4. **Skip `argocd-update` initially; rely on `selfHeal`.** Because the ApplicationSet already sets
   `selfHeal: true`, a promotion commit is reconciled without an explicit sync. This sidesteps the
   `kargo.akuity.io/authorized-stage` annotation problem (see §6.4). Add `argocd-update` later if we
   want immediate syncs.
5. **Auto to stage, manual to prod**, via `ProjectConfig.spec.promotionPolicies` (auto-promote the
   `portfolio-stage` Stage only).
6. **Install Kargo as an Argo CD-managed infra app**, consistent with the app-of-apps pattern —
   a new `Application` in `k8s/talos/infra/argocd/infra.yaml` pointing at the OCI Helm chart
   `oci://ghcr.io/akuity/kargo-charts/kargo` version `1.10.9`, with values in-repo. Admin password
   hash and API token signing key flow through **External Secrets Operator**, not literal Secrets.

---

## 6. Open decisions — decide before applying (no assumptions made here)

1. **Git write credential type.** Options: a fine-grained GitHub **PAT** with contents:write on this
   repo (simplest); a **GitHub App** installation token (cleaner rotation, but see upstream issue
   #5429 about App auth on the git-push step); or an SSH **deploy key** with write access. Whichever
   is chosen, it lands as a `kargo.akuity.io/cred-type: git` Secret in the Kargo project namespace,
   sourced via ESO. **Recommendation: fine-grained PAT (or deploy key) for the pilot.**
2. **Is the GHCR `portfolio` package public or private?** If public, the Warehouse needs no image
   credential. If private, add a `kargo.akuity.io/cred-type: image` Secret (GHCR user + PAT with
   read:packages). Must be confirmed, not assumed.
3. **Branch model.** Pilot recommendation is to promote to `main` (§5.3). Confirm we do not want a
   dedicated rendered branch per environment.
4. **`argocd-update` + `authorized-stage` annotation strategy.** The apps are templated by one
   ApplicationSet, so we cannot cleanly set a per-stage annotation value (`apps:portfolio-stage` vs
   `apps:portfolio`) without either (a) relying on `selfHeal` and skipping `argocd-update` [pilot
   recommendation], (b) breaking the two portfolio apps out of the ApplicationSet into their own
   annotated `Application` manifests, or (c) extending the ApplicationSet generator to inject a
   per-directory annotation. Pick one; the pilot assumes (a).
5. **Kargo project namespace name.** e.g. `kargo-portfolio` or reuse a convention. The Warehouse,
   Stages, credentials, and ProjectConfig all live here.
6. **CI change scope.** Confirm we stop the `sed`+commit step in `build-portfolio.yaml` (and
   whether to also stop pushing the moving `stage`/`prod` image tags, which Kargo makes redundant).
7. **Verification now or later.** Verification needs Argo Rollouts installed (§2.9). Decide whether
   to install Argo Rollouts as part of the pilot (phase 3) or defer and run promotions unverified
   at first.
8. **Kargo API/UI exposure.** Whether to expose the Kargo API/UI via an HTTPRoute (Traefik Gateway
   API, behind Authentik) or keep it cluster-internal + port-forward for the pilot.

---

## 7. Phased implementation plan

Each phase has an explicit verify step. Nothing is applied to the cluster without review; ArgoCD
owns reconciliation (no direct `kubectl apply` except read-only `diff`).

### Phase 0 — Decisions + spike (no cluster changes)
1. Resolve every item in §6.
2. Optional local spike: run Kargo's quickstart in a kind/k3d cluster to get hands-on with the CRDs
   and UI before touching the homelab. → verify: quickstart pipeline promotes an image end to end.

### Phase 1 — Install Kargo (infra)
1. Add a Kargo `Application` to `k8s/talos/infra/argocd/infra.yaml` (OCI Helm chart, version
   `1.10.9`), values file in-repo, admin secret + token signing key via ESO.
2. → verify: `KUBECONFIG=... kubectl -n kargo get pods` all Ready; ArgoCD shows the Kargo app
   Synced/Healthy; `kubectl get crds | grep kargo` lists the CRDs.

### Phase 2 — Portfolio pipeline (no CI change yet, runs in parallel with the old flow)
1. Restructure portfolio + portfolio-stage kustomizations to an `images:` block (§5.2).
   → verify: `kustomize build k8s/talos/apps/portfolio` renders the same image as before;
   `kubectl diff` shows no unintended change.
2. Create the Kargo `Project`, `ProjectConfig` (auto-promote stage), `Warehouse` (image sub,
   `NewestBuild` + ignore env tags), `Stage/portfolio-stage` (direct from warehouse),
   `Stage/portfolio-prod` (sources: [portfolio-stage]), and the git credential Secret (via ESO).
   → verify: `kubectl -n <ns> get warehouse,stage` healthy; Warehouse discovers current Freight.
3. Trigger a promotion (auto to stage on next image; manual to prod).
   → verify: Kargo writes the expected commit; ApplicationSet self-heals; the running pods report
   the promoted SHA (`kubectl -n portfolio-stage get deploy -o jsonpath=...`); the stage and prod
   HTTPRoutes serve the expected build.

### Phase 3 — Cut over CI + (optional) verification
1. Remove the `sed`+commit step from `build-portfolio.yaml` (build+push only). Decide on the moving
   env tags. → verify: a fresh push builds an image, Kargo picks it up, promotes to stage.
2. (Optional) Install Argo Rollouts CRDs+controller; add a `portfolio-smoke` AnalysisTemplate
   (HTTP GET on the stage URL, pass on 200) and wire `spec.verification` on the stage Stage.
   → verify: a bad build fails verification and is blocked from prod.

### Phase 4 — Decide on expansion
1. Assess: did Kargo earn its keep vs the `sed` approach? If yes, extend to blog (also has
   stage + prod). headroom is single-stage + external image repo, lowest priority.

---

## 8. Rollback

- Kargo runs **alongside** the existing flow. Until Phase 3 the old CI `sed`+commit path still works,
  so Phase 1–2 are additive and low-risk.
- To back out: delete the Kargo `Application` (removes the pipeline CRs), restore the inline image
  tag in `deployment.yaml` / drop the `images:` block, and re-enable the CI manifest-update step.
  Because promotions are just git commits to `main`, git history is the full audit + undo trail.

---

## 9. Risks / caveats

- Another always-on controller set (Kargo controller, API server, webhooks, management controller)
  in an already busy cluster, for a handful of apps. Weigh against a `sed` that already works.
- The multi-stage payoff really only exists for portfolio (and blog). On single-stage apps Kargo is
  mostly "replace the tag bump with a Warehouse" — real experience, modest functional gain.
- Kargo needs a git **write** credential. Scope it tightly (fine-grained PAT / deploy key), rotate it,
  and source it via ESO — never commit it.
- Pin the chart version; do not track `latest`. Watch for `1.11.x` going stable before upgrading.
- Verification is not free: it pulls in Argo Rollouts as a dependency.

---

## 10. Business / learning value

- Kargo is from the Argo CD maintainers (Akuity); progressive delivery + promotion gating is a real
  enterprise concern, and hands-on Kargo is a differentiated line for a cloud architect (stronger
  than "I run Argo CD," which is table stakes).
- Pairs with the existing blog/portfolio content strategy. portfolio, blog, and headroom are all
  LinkedIn-safe example apps, so a "gated stage→prod promotion on a homelab Argo CD with Kargo" post
  is on-brand. See `blog/TEXT-STYLE.md` / `blog/IMAGE-STYLE.md` before drafting.

---

## 12. Decisions locked (2026-07-16)

Supersedes the "recommended / open" framing in §5–§6:

- Git write credential: **GitHub App** `mortennordbye-homelab-deployer` (already installed, scoped
  to `mortennordbye/homelab`, Contents read/write). Cred keys: `githubAppClientID`,
  `githubAppInstallationID`, `githubAppPrivateKey`.
- Promotion mechanism: **kustomize `images:` block + `kustomize-set-image`**.
- Verification: **included now** — install Argo Rollouts, run an HTTP smoke test on the stage URL.
- Argo CD sync: **rely on `selfHeal`**; no `argocd-update`, no `authorized-stage` annotation.
- GHCR `portfolio` package is **public** (probed) → the Warehouse needs no image credential.
- Kargo project name/namespace: **`portfolio-cd`** (avoids colliding with the `portfolio` app namespace).
- Image selection: **`NewestBuild`** + `allowTags: ^[0-9a-f]{7,40}$` (tags are git short-SHAs).

## 13. Scaffolded files (structurally validated with `kustomize build`)

Installs (infra ApplicationSet picks up each dir as an Argo CD Application):

- `k8s/talos/infra/argo-rollouts/` — Helm chart `argo-rollouts` 2.41.0 (CRDs + controller for verification).
- `k8s/talos/infra/kargo/` — Helm OCI chart `kargo` 1.10.9; admin creds via ESO (`kargo-api-secret.yaml`
  → `ADMIN_ACCOUNT_PASSWORD_HASH`, `ADMIN_ACCOUNT_TOKEN_SIGNING_KEY`).

Pipeline (`k8s/talos/infra/kargo-portfolio/`, project `portfolio-cd`):

- `namespace.yaml` (labeled `kargo.akuity.io/project: "true"`), `project.yaml`, `projectconfig.yaml`
  (auto-promote `stage`), `warehouse.yaml`, `stage-stage.yaml`, `stage-prod.yaml`,
  `analysistemplate.yaml` (curl smoke test), `git-credentials.yaml` (ESO → GitHub App git cred).

Render check: pipeline dir → 8 objects; `kargo` → 96; `argo-rollouts` → 15. Kargo CR *field* validity
is only fully checked server-side once the CRDs are installed. Two spots are marked in-file to confirm
against the pinned version's reference: the `imageFrom(...).Tag` expression and `kustomize-set-image`
field names.

## 14. Inputs you must provide before applying

1. Bitwarden Secrets Manager items for Kargo admin (put UUIDs in `kargo/kargo-api-secret.yaml`):
   - password bcrypt hash: `htpasswd -bnBC 10 "" '<password>' | tr -d ':\n' | sed 's/$2y/$2a/'`
   - signing key: `openssl rand -base64 48`
2. Bitwarden items for the GitHub App (put UUIDs in `kargo-portfolio/git-credentials.yaml`):
   App **Client ID**, **Installation ID**, and a generated **private key** (PEM).

## 15. Rollout runbook (order matters)

1. Merge `infra/argo-rollouts` + `infra/kargo`. → verify: `kubectl -n kargo get pods` Ready,
   `kubectl get crd | grep kargo.akuity.io` present, both Argo apps Synced/Healthy.
2. Ensure the Bitwarden items from §14 exist and the two ExternalSecrets report `SecretSynced`.
3. **Coupled change (do together to avoid CI and Kargo fighting over the tag):**
   - Add an `images:` block to both portfolio kustomizations, e.g. in
     `k8s/talos/apps/portfolio-stage/kustomization.yaml`:

     ```yaml
     images:
       - name: ghcr.io/mortennordbye/homelab/portfolio
         newTag: def4da2   # current stage tag; prod uses its current tag
     ```

   - Remove the "Update Kubernetes Manifest" (`sed` + commit) step from
     `.github/workflows/build-portfolio.yaml` so CI only builds + pushes. Optionally drop the moving
     `stage`/`prod` image tags too. → verify: `kustomize build k8s/talos/apps/portfolio-stage`
     renders the same image; `kubectl diff` shows no change.
4. Merge `infra/kargo-portfolio`. → verify: `kubectl -n portfolio-cd get warehouse,stage`; the
   Warehouse discovers current Freight; the `stage` Stage auto-promotes, the smoke AnalysisRun
   succeeds, Argo self-heals `portfolio-stage`, and the running pod reports the promoted SHA.
5. Promote to prod manually (Kargo UI or `kargo promote`). → verify: only stage-verified Freight is
   offered; prod syncs the promoted SHA.

Do **not** merge `infra/kargo-portfolio` before steps 1 and 3: without the CRDs the CRs fail to
apply, and without the `images:` block the `kustomize-set-image` promotion step has nothing to edit.

## 16. Sources (fetched 2026-07-16)

- Latest release: `GET https://api.github.com/repos/akuity/kargo/releases/latest` → `v1.10.9` (2026-07-14)
- Project site: https://kargo.io/
- Docs home: https://docs.kargo.io/
- Core Concepts: https://docs.kargo.io/user-guide/core-concepts/
- Basic Installation: https://docs.kargo.io/operator-guide/basic-installation
- Working with Warehouses: https://docs.kargo.io/user-guide/how-to-guides/working-with-warehouses
- Working with Stages: https://docs.kargo.io/user-guide/how-to-guides/working-with-stages
- Promotion Steps Reference: https://docs.kargo.io/user-guide/reference-docs/promotion-steps
- argocd-update step: https://docs.kargo.io/user-guide/reference-docs/promotion-steps/argocd-update
- kustomize-set-image step: https://docs.kargo.io/user-guide/reference-docs/promotion-steps/kustomize-set-image
- Managing Secrets: https://docs.kargo.io/user-guide/security/managing-secrets
- Verifying Freight in a Stage: https://docs.kargo.io/user-guide/how-to-guides/verification
- Analysis Templates Reference: https://docs.kargo.io/user-guide/reference-docs/analysis-templates
