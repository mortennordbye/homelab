---
name: setup-github-repo
description: Sets up a public GitHub repository with best-practice metadata, community health files, security hardening, branch rulesets, CI/CD, and dependency automation. Works on empty or existing repos, offers a light profile (personal projects) and a strict profile (team-grade guardrails), plus an audit-only dry-run mode. Never overwrites existing files — audits them for gaps and offers additive improvements instead. Writes a plan file the user must approve before any file or API change happens.
---

# Setup GitHub Repo

When invoked, configure the current repository to the standard below using `git`,
the GitHub CLI (`gh`), and automated commits.

## What this skill does not do

State the boundaries up front so nothing lands by surprise. This skill:

- **Never overwrites your content unasked.** Existing non-empty files are audited
  read-only and improvements are offered *additively* (Principle 7). `.gitignore` and
  `.gitattributes` only ever gain missing lines. The one path that reorganizes existing
  prose — restructuring a badly-organized README — happens only after you approve it
  explicitly, and even then it reflows your content without rewording it (Phase 3).
- **Never treats "already present" as "done."** Every skipped file is still audited for
  gaps against the standard below, in setup mode as well as audit mode (Principle 7).
- **Never picks a license.** Legal decision — asked in Phase 1, never auto-selected.
- **Never invents CI commands.** If the stack can't be detected, CI is skipped and
  reported; a green check that tests nothing is worse than none (Principle 3).
- **Never installs GitHub Apps.** Renovate needs the Mend app installed by hand — the
  skill commits the config and prints the install URL as a manual step.
- **Never does what has no API.** Social preview image, and anything else GitHub exposes
  only in the UI, land in the manual-steps summary rather than being attempted.
- **Never runs interactive auth.** `gh auth login` / `gh auth refresh` are yours to run;
  the skill detects the gap and stops (Phase 0).
- **Never force-pushes, deletes branches, or rewrites history** — the ruleset it installs
  forbids exactly that.
- **Never commits secrets, and never `git add .`** — files are staged by explicit path
  (Principle 5).
- **Never applies protection that can lock you out.** Solo repos never require
  self-approval; light-profile direct pushes stay open.
- **Never touches a repo it shouldn't.** Archived, fork, or non-admin aborts in Phase 0;
  a private repo drops the public-only features instead of erroring through them.

## Modes

Two switches, both resolved before anything runs.

**Run mode — setup (default) or audit.** When invoked with "audit" or "dry-run", execute
Phase 0 plus every read-only check from Phases 5–7 and print the compliance table
(compliant / missing / would-change) without writing anything. Use it before a first run,
and re-run it later to detect drift on repos that were set up earlier. Setup mode audits
too: it never overwrites an existing file, but it still reads each one against the standard
and reports the gaps (Principle 7) — audit-only mode just stops before the writing.

**Profile — light (default) or strict.** Security that runs invisibly is always on;
what the profile controls is friction. A hobby project should not feel like filing a
change request to push to its default branch.

| | light (personal / hobby) | strict (team / corporate) |
|---|---|---|
| Invisible security: Dependabot alerts + security updates, secret scanning, private vulnerability reporting, CodeQL, dependency review, Trivy, OpenSSF Scorecard, read-only Actions token | yes | yes |
| Core files: README, LICENSE, SECURITY.md, .gitignore, .gitattributes, .editorconfig, dependabot.yml | yes | yes |
| CI workflow | yes, informational | yes, required check |
| Default-branch ruleset | block deletion + force-push only; direct pushes to the default branch keep working | PRs required, review count from team size, required status checks |
| PR template | yes | yes |
| Community files: CONTRIBUTING, CODE_OF_CONDUCT, SUPPORT, issue forms, CODEOWNERS | no | yes |
| Conventional-Commits PR title check | no | yes |
| Dependabot auto-merge | no (no required checks to gate it) | opt-in |
| Release automation + tag protection | ask | ask |
| AGENTS.md agent guide | ask | ask |

## Principles

1. **Idempotent.** Safe to re-run. Never overwrite a non-empty existing file; skip it,
   note it, and audit it (Principle 7). Settings calls (`gh repo edit`, `gh api
   PUT/PATCH`) are naturally idempotent. End every run with a summary table: applied /
   skipped (already present, with any audit gaps) / manual steps.
2. **Ordering matters.** Files first, merge them, *then* rulesets and required checks.
   Applying protection that requires reviews or status checks before those exist locks
   the maintainer out of their own repo.
3. **Detect before generating.** Infer language/ecosystem from lockfiles and manifests,
   and only generate what applies. Never commit a CI workflow with `echo` placeholder
   steps — if you cannot fill in real commands for the detected stack, skip CI and report
   it. A meaningless green check is worse than no check.
4. **Practice what you preach.** Every workflow you commit must itself pass the standard:
   actions pinned to a version tag (never `@master`/`@main`), an explicit least-privilege
   `permissions:` block, a `concurrency` group on CI, and never `pull_request_target`
   combined with a checkout of PR head code.
5. **Commit surgically.** Stage generated files by explicit path. Never `git add .`. For
   every commit use the same three steps: `git status --porcelain` (confirm only intended
   files changed) → `git add <exact/path> ...` → `git commit -m "type(scope): summary"`.
6. **No heredocs for API bodies.** Some agent harnesses corrupt shell heredocs
   (`<<'EOF'`) through quote or newline handling. For any `gh api` call that takes a JSON
   body, write the payload to a temp file *outside the working tree* (so it can't be
   staged or trip the clean-tree check — use your file-writing tool or `printf`, not a
   heredoc), apply it with `gh api ... --input "$f"`, and delete it after. The JSON blocks
   below are payloads to write, not commands to paste into a shell.
7. **Audit, don't just skip.** A skipped file is not a finished file. For every existing
   file on the skip-list — README, LICENSE, SECURITY.md, dependabot.yml, existing
   workflows, dotfiles — audit it read-only against this skill's standard and record every
   gap as a finding in the Phase 7 summary, then offer to apply the missing pieces
   *additively* (insert blocks, keep the author's content). This runs in setup mode, not
   only the dedicated audit mode: an "already present" line in the summary must always be
   paired with what, if anything, that file still lacks — never a bare skip. The README
   brownfield checklist in Phase 3 is the worked example; hold every other skipped file to
   the same read-and-report discipline. Existing workflows in particular: check they carry
   a least-privilege `permissions:` block, version-pinned actions that still resolve, and a
   `concurrency` group (Principle 4) — report deviations, don't rewrite silently.

## Error handling

Phase 0 gates the hard blockers — auth, admin rights, archived, fork, dirty tree — and
those abort the run. Once past Phase 0, a single failed settings call must never halt the
run or pause to ask: log it, add it to the manual-steps summary, and continue. Specific
cases:

| Failure | Action |
|---|---|
| CodeQL default-setup 409 (language unsupported, or already configured) | log "Skipped: CodeQL not available for this language", continue |
| Ruleset 403 (org restrictions / insufficient rights) | log it, add "apply branch ruleset manually" to the summary, continue |
| Auto-merge 422 (org policy blocks auto-merge) | skip the repo auto-merge enable, drop `dependabot-automerge.yml`, note the block in the summary, continue |
| private-vulnerability-reporting / secret-scanning 403 (no Advanced Security, e.g. a private repo) | expected when Phase 0 flagged a non-public repo; skip and note, continue |

Anything not listed: if it is a settings call, treat it like the rows above (log,
summarize, continue); if it is a blocker that makes later phases meaningless — the
scaffold failed to push, say — stop and report.

## Phase 0 — Preflight

Run these checks; abort with a clear message if any fail:

| Check | How |
|---|---|
| Authenticated, correct account | `gh auth status`. If not signed in, stop: the user must run `gh auth login` themselves (it is interactive), then preflight resumes. The signed-in account is echoed in the Phase 2 plan |
| Token can push workflow files | only relevant when the remote uses HTTPS (`git remote get-url origin`): then the token needs the `workflow` scope, fix with `gh auth refresh -s workflow`. SSH remotes are unaffected; do not block on this check for SSH |
| Repo identity + state | `gh repo view --json nameWithOwner,defaultBranchRef,visibility,isFork,isArchived,description,homepageUrl` |
| Not archived | `isArchived` must be false; every write fails on an archived repo |
| Not a fork | if `isFork` is true, stop and confirm: health files belong upstream, and settings changes on forks are usually unwanted |
| Public repo | this skill targets public repos. If `visibility != "public"`, warn: Scorecard and dependency review are public-only, and private vulnerability reporting / secret scanning depend on GitHub Advanced Security — those steps will be skipped or 403 on a private repo. Confirm before continuing, and drop the affected workflows/settings from the plan |
| No classic branch protection | `gh api /repos/{owner}/{repo}/branches/<default>/protection` should 404. Existing classic rules stack with the new ruleset and the most restrictive combination wins (an old "1 required review" rule re-creates the solo lockout); offer to migrate and delete them first |
| Empty vs populated | `git rev-parse HEAD` exit code; `defaultBranchRef == null` means empty |
| Clean working tree | `git status --porcelain` must be empty |
| Admin rights | `gh api /repos/{owner}/{repo} -q .permissions.admin` must be `true` (settings calls 403 otherwise) |
| Language/stack | lockfiles (`package-lock.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, ...), `Dockerfile`, existing `.github/workflows/` |
| Existing health files | list README, LICENSE, CONTRIBUTING, etc. to build the skip-list |
| Baseline health score | `gh api /repos/{owner}/{repo}/community/profile -q .health_percentage` (compare again at the end) |

## Phase 1 — Ask the user (one batched round)

Ask only what cannot be decided automatically:

1. **Profile: light or strict?** — suggest light for personal and hobby projects, strict
   for team or corporate repos. Light presets questions 2, 4, 5, and 6 (solo, Dependabot,
   no stale bot, no auto-merge), so a light run usually collapses to license + releases
   + metadata.
2. **Solo maintainer or team?** (strict only) — drives the ruleset's required review
   count (0 vs 1+). A solo repo requiring 1 approval is permanently unmergeable: you
   cannot approve your own PR. Light mode needs no answer: its ruleset never requires PRs.
3. **License** — legal decision, never auto-pick. Suggest MIT or Apache-2.0.
4. **Dependabot (default) or Renovate?** — Dependabot is fully automatable. A committed
   `renovate.json` is inert until the Mend Renovate GitHub App is installed, which no API
   call can do; if the user picks Renovate, commit the config and print the app install
   URL as a manual step. Never ship both (duplicate update PRs).
5. **Stale bot?** (strict only) — opt-in even then; auto-closing issues is hostile as a
   default.
6. **Auto-merge Dependabot patch/minor updates?** (strict only) — safe only because the
   strict ruleset gates merges on required status checks; see the workflow in Phase 3.
   `--auto` only completes once *all* required approvals are in, so it merges hands-free
   only when the review count is 0 (solo). On a team repo (1+ reviews) the PR still parks
   waiting for a human approval — flag this so auto-merge isn't mistaken for zero-touch.
7. **Does this project cut versioned releases?** — only generate release-please (and the
   tag-protection ruleset, Phase 6) if yes. Continuously deployed apps (GitOps,
   sha-tagged images, `"private": true` packages) get perpetual meaningless version-bump
   PRs from release automation; skip it for those.
   **If yes, follow up: should releases carry prebuilt binaries?** Default yes for
   anything a user installs and runs directly (a CLI, a desktop app); no for libraries
   that install from a registry, and no for services whose artifact is the container
   image. Answering yes adds `release.yml` (Phase 3) and changes
   `can_approve_pull_request_reviews` in Phase 5. Answering no is fine, but then say
   plainly in the summary that releases are source-only — a release page with no assets
   otherwise looks like a bug.
8. **Description / homepage / topics** — propose inferred values, confirm.
9. **Add an `AGENTS.md` agent guide?** (both profiles) — a short root file that hands
   coding agents (Claude Code and others) the repo's real build/test/lint commands,
   layout, and guardrails, so they don't have to re-derive them. Suggest yes: it reuses
   the commands already detected for CONTRIBUTING/CI and is skipped if the repo already
   has an `AGENTS.md`. This is the only "AI blueprint" the skill seeds — always ask, never
   assume it, and don't scaffold empty `ai/`, `skills/`, or `docs/` folders (a generic run
   can't know what belongs in them; `AGENTS.md` gives an agent enough to create the right
   ones later).

## Phase 2 — Plan file and approval (before anything is written)

Nothing mutates — no file, no commit, no settings API call — until the user has approved
a written plan. (Audit mode skips this phase: it is read-only by definition.)

Write `SETUP-PLAN.md` in the repo root. Never stage or commit it, and delete it at the
end of the run. Keep it to one screen, tables where they fit:

- **Access** — the `gh` account the run will act as (from Phase 0) and that admin rights
  were confirmed, so the user knows whose credentials do the writing. If preflight found
  an auth gap, it goes here as a blocking prerequisite: not signed in → the user must run
  `gh auth login` themselves (it is interactive); HTTPS remote without the `workflow`
  scope → `gh auth refresh -s workflow`.
- **Answers** — profile and the Phase 1 answers being acted on.
- **Files** — what will be created, and the skip-list of existing files left untouched.
- **Commits** — how changes land (direct push to the default branch in light, PR in strict).
- **Settings calls** — every API write in plain words: "enable secret scanning push
  protection", "set Actions token read-only", "create default-branch ruleset blocking
  deletion + force-push", ...
- **Manual steps** expected to remain after the run.

Then stop and ask for approval. Only after an explicit yes, run Phases 3–7 unattended.
If the user edits the plan file instead of replying, re-read it and honor the edits.

For the rest of the run, `SETUP-PLAN.md` is the authoritative record of the profile and
Phase 1 answers — consult it when branching in Phases 3–7 rather than relying on memory,
and keep it on disk until Phase 7 deletes it.

## Phase 3 — Generate files (honor the skip-list)

### Documentation and community health

GitHub scores these via `gh api /repos/{owner}/{repo}/community/profile` — that endpoint
is the built-in verification for this section.

**Light profile:** generate only LICENSE, README.md, SECURITY.md, and the PR template from
this section. The rest (CONTRIBUTING, CODE_OF_CONDUCT, SUPPORT, issue forms, CODEOWNERS) is
strict-profile; a personal project doesn't need contribution process scaffolding, and its
health score staying below 100 is by design. The PR template is the exception because it is
not contribution scaffolding — it is a self-review checklist the solo maintainer fills in
for their own changes, and it costs one file with no process attached.

- **`LICENSE`** — fetch the chosen license: `gh api /licenses/mit -q .body`, substitute
  year and full name.
- **`README.md`** — use the template below. Fill `<owner>/<repo>` from introspection and
  only include badges for workflows that actually get created. Style rules:

  - **Emojis: at most one, in the H1** (plus the fixed star-footer line). None in other
    headings, body text, or tables.
  - **No AI-tell prose.** Ban "blazingly fast", "powerful", "seamless", "effortless",
    "comprehensive", exclamation marks, and feature lists where every line starts with a
    bolded superlative. Write plainly: what it is, why it exists, how to run it.
  - **Tables for enumerable facts** (components, tech stack, workflows, config options,
    hardware) — prose only where something needs explaining. `---` separators between
    major sections.
  - **Three badge rows in the centered header**, in this order: tech badges
    (`img.shields.io/badge/...` with logos, 3–5 core technologies), workflow status
    badges (only workflows that exist), repo-meta badges (License, Last Commit, Stars).

~~~markdown
<div align="center">

# [one emoji] [Project Name]

### One line: what this is.

[![Tech](https://img.shields.io/badge/<Tech>-<color>?logo=<logo>&logoColor=white)](https://example.com) [...3–5 core technologies]

[![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)](https://github.com/<owner>/<repo>/actions/workflows/ci.yml)

[![License](https://img.shields.io/github/license/<owner>/<repo>?style=flat-square)](LICENSE) [![Last Commit](https://img.shields.io/github/last-commit/<owner>/<repo>?style=flat-square)](https://github.com/<owner>/<repo>/commits/main) [![Stars](https://img.shields.io/github/stars/<owner>/<repo>?style=flat-square)](https://github.com/<owner>/<repo>/stargazers)

[Two or three plain sentences: why this exists, what problem it solves.]

</div>

---

## Overview

Explain the core architecture or main features. If they enumerate, use a table:

| Component | Purpose |
| --------- | ------- |
| ...       | ...     |

---

## Getting Started

1. **Clone**: `git clone https://github.com/<owner>/<repo>.git`
2. **Install**: [real detected command]
3. **Run**: [real detected command]

---

## Repository structure

Simplified tree, one line per entry, ignored/generated dirs omitted:

```text
<repo>/
├── src/            # ...
├── .github/
│   └── workflows/  # CI and security pipelines
└── ...
```

---

## Workflows

One row per workflow this repo actually has:

| Workflow | Trigger | Purpose |
| -------- | ------- | ------- |
| CI | push, PR | lint, test[, build image] |
| Dependency Review | PR | block known-vulnerable dependency changes |
| Scorecard | push, weekly | OpenSSF supply-chain grade |
| Container Scan | push, weekly | Trivy image scan → Security tab |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

### ⭐ Star this repo if you find it useful ⭐

<a href="https://www.star-history.com/#<owner>/<repo>&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=<owner>/<repo>&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=<owner>/<repo>&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=<owner>/<repo>&type=Date" width="600" />
  </picture>
</a>

Made by [<name>](<homepage or github profile>)

</div>
~~~

  (Omit the Contributing section in the light profile — CONTRIBUTING.md doesn't exist
  there. Keep the star footer in both profiles. List only workflows that exist in the
  Workflows table, and only badges for workflows that were actually created.)

  **Brownfield README (file already exists — skip-list hit).** "Never overwrite" protects
  the author's prose; it does not mean *contribute nothing*. When README.md already exists,
  audit it read-only against the template above and report each gap as a finding in the
  Phase 7 summary, then offer to apply the missing pieces **additively** — insert the
  blocks, never rewrite existing prose. The checklist:

  1. **Badge block** — the three rows (workflow status incl. Scorecard, tech stack, repo-meta
     license/last-commit/issues/stars). Add any row that's missing.
  2. **Centered header** — title, tagline, badges, intro, and any hero images wrapped in one
     `<div align="center">` block.
  3. **Star-history footer** — the `⭐ Star this repo` block plus the "Made by" credit.
  4. **Workflows table** — a `Workflow | Trigger | Purpose` table covering every pipeline
     the skill just added; without it the user can't see what now runs.
  5. **Repository structure** — the simplified tree with one-line comments.

  Items 1–3 are already in the greenfield template; the only reason a brownfield README
  lacks them is that the skip protected the file. Items 4–5 are worth adding to both. Same
  additive-only rule applies to other existing core files (LICENSE, SECURITY.md): report
  deviations, never silently rewrite.

  **When the structure itself is the problem — ask, then restructure.** Additive insertion
  fixes a README that's *missing* pieces; it can't fix one that's badly *organized* — a
  wall of prose with no headings, the install steps buried under trivia, no Overview or
  Getting Started, sections in a random order, the same thing explained twice. Detecting
  that is part of the audit (Principle 7). When you find it, don't force it into the
  additive mold and don't rewrite it unasked — flag the specific structural problems and
  ask the user one question: keep it additive-only (default), or reorganize the README into
  the template's shape? Offer this only when there's a real structural issue; a
  well-ordered README that's merely missing a badge row needs no such prompt.

  If the user says yes to a restructure, it is a reflow, not a rewrite:

  - **Preserve every fact.** Reorder and re-section the author's existing content into the
    template's shape (header → Overview → Getting Started → structure → Workflows → footer);
    never drop information and never invent a claim the old README didn't make. If something
    doesn't fit a template section, keep it under its own heading rather than deleting it.
  - **Keep the author's voice.** Reheading, resequencing, and merging duplicated passages is
    in scope; rewording their prose into your own style is not — the AI-tell ban still holds.
  - **Show before applying.** Present the proposed section outline (or a diff) for approval
    before writing, since this is the one case where the skill touches existing prose. Record
    it as its own line in the Phase 7 summary, distinct from the additive insertions.

- **`CONTRIBUTING.md`** — standard fork → branch → PR flow, plus the *real* detected
  commands for running tests and lint locally. Wrong commands are worse than none.
  Document the commit/PR-title convention (Conventional Commits) with two or three
  example messages — the PR title check and release-please both depend on contributors
  knowing it, and a check that fails with no documented rule just reads as hostile.
- **`SECURITY.md`** — this file points contributors at the "Report a vulnerability"
  button, so the feature must exist before the file lands. Pull that single Phase 5
  call forward and run it before committing:
  `gh api -X PUT /repos/{owner}/{repo}/private-vulnerability-reporting`

```markdown
# Security Policy

## Supported Versions

Only the latest release is actively supported with security updates.

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues.
Use the "Report a vulnerability" button under this repository's **Security** tab
(private vulnerability reporting is enabled). You will receive an acknowledgement
within 48 hours.
```

- **`CODE_OF_CONDUCT.md`** — full Contributor Covenant v2.1 with its attribution footer
  intact (it is CC BY 4.0; the attribution is required). Fetch it rather than retyping:
  `curl -fsSL https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md`
  and fill in a real enforcement contact email.
- **`SUPPORT.md`** — short: where to ask questions (issues/discussions). Counts toward
  the community profile.
- **Issue forms** — modern YAML forms, not legacy markdown templates.
  `.github/ISSUE_TEMPLATE/bug_report.yml`:

```yaml
name: Bug report
description: Report something that is broken
labels: [bug]
body:
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Also tell us what you expected to happen.
    validations:
      required: true
  - type: textarea
    id: repro
    attributes:
      label: Steps to reproduce
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: Version / environment
```

  `.github/ISSUE_TEMPLATE/feature_request.yml`:

```yaml
name: Feature request
description: Suggest an idea
labels: [enhancement]
body:
  - type: textarea
    id: problem
    attributes:
      label: What problem does this solve?
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
```

  `.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: false
```

- **`.github/PULL_REQUEST_TEMPLATE.md`** — both profiles. Fill the Verification list with the
  *real* detected checks, one row per gate a contributor can actually run; the same rule as
  CONTRIBUTING and CI applies, so a repo with no test suite gets its actual validation
  commands (`terraform plan`, `kubectl diff`, an image build) rather than a "tests pass"
  box that nothing backs. Drop the CONTRIBUTING.md row in the light profile, where that
  file doesn't exist.

```markdown
## Why

<!-- The problem this solves. Link any related issue. -->

## What

<!-- What changed. -->

## Verification

<!-- Delete the rows that don't apply. -->

- [ ] <real detected test command> passes locally
- [ ] <real detected lint command> is clean
- [ ] Docs only, no verification needed
- [ ] I have read CONTRIBUTING.md   <!-- strict only -->
```

- **`.github/CODEOWNERS`**:

```text
*                    @<owner>
/.github/workflows/  @<owner>
```

### Developer experience

- **`.gitignore`** — use the native API, not gitignore.io:
  `gh api /gitignore/templates/Node -q .source` (per detected language), plus a common
  OS/IDE block. **Append to an existing file, never overwrite it.**
- **`.gitattributes`** (prevents CRLF churn from Windows contributors):

```text
* text=auto eol=lf
*.png binary
*.jpg binary
*.gif binary
*.ico binary
*.woff2 binary
```

- **`.editorconfig`**:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_size = 2
indent_style = space
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- **`Makefile`** — only if the repo has no task runner yet, and only with real detected
  commands wired into `test` / `lint` targets. Skip for an empty repo.
- **`AGENTS.md`** — both profiles, only if the user opted in (Phase 1 Q9) and the repo has
  none. The agent-facing counterpart to CONTRIBUTING: the same detected commands, aimed at
  a coding agent. Include only commands that were actually detected — omit a line rather
  than guess (a wrong command sends an agent down the wrong path, same rule as CI). The
  "open a PR, don't push to the default branch" line is strict-profile only; drop it in
  light, where direct pushes are the intended workflow. Substitute the real default branch
  (Phase 0) for `<default-branch>`.

```markdown
# AGENTS.md

Guidance for coding agents (Claude Code and others) working in this repository.

## Commands

| Task | Command |
| ---- | ------- |
| Install | <detected, or omit row> |
| Build | <detected, or omit row> |
| Test | <detected> |
| Lint | <detected> |

## Layout

One line per meaningful top-level directory (from Phase 0 detection):

- `<dir>/` — <what lives here>

## Conventions

- Commits follow Conventional Commits (see CONTRIBUTING.md).
- Never commit secrets or credentials.
- Open a pull request; don't push directly to `<default-branch>`.  <!-- strict only -->
```

### Automation and CI/CD

The workflow templates below write `branches: [main]` for readability. `main` is the
common case, but substitute the actual default branch from Phase 0 (`defaultBranchRef`)
wherever these templates say `main` — a repo on `master`/`trunk` would otherwise never
trigger CI on push, which also breaks the Phase 6 check-run discovery.

- **`.github/workflows/ci.yml`** — language-detected. Skeleton (fill in real setup and
  commands; if the stack is unknown, skip this file and report it). Give the job a
  human-readable `name:` — that display name is the check-run context the ruleset
  references in Phase 6. When a `Dockerfile` exists, the image build goes into this
  same workflow as a second job gated with `needs:` (next bullet), not into a separate
  workflow file:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: Lint & test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # language setup, e.g. actions/setup-node@v4 with caching
      # real install command
      # real lint command
      # real test command
```

- **`.github/workflows/pr-title.yml`** (strict profile only) — Conventional Commits
  check on PR titles.
  `pull_request_target` is safe here only because nothing is checked out; never add a
  checkout step to this workflow:

```yaml
name: PR Title

on:
  pull_request_target:
    types: [opened, edited, synchronize]

permissions:
  pull-requests: read
  statuses: write

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- **`.github/workflows/release-please.yml`** — only if the user confirmed versioned
  releases in Phase 1. Produces releases and a CHANGELOG from Conventional Commits
  (replacing both a hand-maintained CHANGELOG and release-drafter). It only computes
  correct versions if the commits on the default branch actually follow the convention;
  strict mode guarantees this (validated PR titles become the squash commits), but the
  light profile has no title check and allows direct pushes — so when light + releases
  are combined, tell the user their versioning depends on them keeping the convention
  by hand, and make sure it is documented in the README.

  **Use the manifest form, not inline `with:` config.** A `release-type:` passed as a
  workflow input cannot express per-package settings, and moving to it later means
  rewriting the workflow. Committing `release-please-config.json` plus
  `.release-please-manifest.json` costs two small files and is what every non-trivial
  repo ends up needing. Set `release-type` per stack — `rust` bumps `Cargo.toml` *and*
  `Cargo.lock`, `node` bumps `package.json`, `simple` bumps only the manifest; `go`,
  `python`, `terraform-module` likewise. Seed the manifest with the version already in
  the manifest file of the project (`Cargo.toml`, `package.json`, ...), not `0.0.0`, or
  the first release PR proposes a version that moves backwards.

  `release-please-config.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "packages": {
    ".": {
      "release-type": "rust",
      "changelog-path": "CHANGELOG.md",
      "include-component-in-tag": false,
      "bump-minor-pre-major": true,
      "bump-patch-for-minor-pre-major": false
    }
  }
}
```

  `.release-please-manifest.json` (match the project's current version):

```json
{
  ".": "0.1.0"
}
```

  `bump-minor-pre-major` matters pre-1.0: without it a `feat:` on a `0.x` project bumps
  to `1.0.0` on the first feature, which is almost never what the author wants.

```yaml
name: Release Please

on:
  push:
    branches: [main]

# Read-only at the top level, write scoped to the one job that needs it. A
# workflow-wide write token is handed to every job and every step in it, including any
# action added later; Scorecard's Token-Permissions check scores exactly this.
permissions:
  contents: read

jobs:
  release:
    name: Release PR
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      # SHA-pinned: this action takes a write token, so a moved tag would be a supply
      # chain problem rather than an inconvenience. Dependabot keeps the pin current.
      - uses: googleapis/release-please-action@45996ed1f6d02564a971a2fa1b5860e934307cf7 # v5
```

  **Strict profile only — the release PR and the PR-title check.** A pull request opened
  with `GITHUB_TOKEN` does not trigger `pull_request_target` workflows. If `pr-title.yml`
  runs on `pull_request_target` *and* the Conventional Commits check is a required status
  check, every release-please PR sits with that check permanently pending and can only be
  merged by bypassing the ruleset. Run `pr-title.yml` on `pull_request` instead, where it
  reports normally. No PAT, no GitHub App and no bypass actor are needed.

  **Verify after the first run.** `feat:` and `fix:` produce a release PR; `docs:`,
  `chore:` and `ci:` on their own produce nothing, and neither do commits that are not
  Conventional at all. A green Release Please run with no PR is the correct outcome in
  that case, not a failure — but say so in the summary, or it reads as broken.

- **`.github/workflows/release.yml`** — only when releases were chosen *and* the project
  produces a runnable artifact users install (a CLI, a desktop binary, a static site
  bundle). Skip it for libraries, which install from the registry, and for services, which
  ship the container image the Docker job already publishes.

  Without this, release-please cuts a tag and publishes a release page with **no
  artifacts**, and "install" means "build from source" — which is easy to miss, because
  every workflow is green. If you generate release-please, say explicitly in the summary
  whether binaries are attached or not.

  **The trigger is the part that goes wrong.** `on: release: types: [published]` and
  `on: push: tags: ['v*']` both look right and both silently never fire, because
  release-please creates the tag and the release with `GITHUB_TOKEN`, and **GitHub does
  not start new workflow runs from events raised by that token.** There is no error; the
  workflow simply never appears. Make the build a *reusable workflow that release-please
  calls*, so it runs inside the same run where the restriction does not apply:

```yaml
# in release-please.yml
jobs:
  release:
    # ...
    outputs:
      release_created: ${{ steps.release.outputs.release_created }}
      tag_name: ${{ steps.release.outputs.tag_name }}
    steps:
      - uses: googleapis/release-please-action@<sha> # v5
        id: release            # `id:` is required for the outputs above to resolve

  binaries:
    needs: release
    if: needs.release.outputs.release_created == 'true'
    permissions:
      contents: write
    uses: ./.github/workflows/release.yml
    with:
      tag: ${{ needs.release.outputs.tag_name }}
```

```yaml
# release.yml — callable, plus a manual entry point for backfilling an existing tag
name: Release Binaries
on:
  workflow_call:
    inputs:
      tag: { required: true, type: string }
  workflow_dispatch:
    inputs:
      tag: { required: true, type: string }

permissions:
  contents: read

jobs:
  build:
    runs-on: ${{ matrix.runner }}
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix: # native runners avoid cross-toolchain setup; ubuntu-24.04-arm is GA
        include:
          - { runner: ubuntu-latest,   target: x86_64-unknown-linux-gnu,  arch: x86_64 }
          - { runner: ubuntu-24.04-arm, target: aarch64-unknown-linux-gnu, arch: aarch64 }
    steps:
      - uses: actions/checkout@v7
        with:
          ref: ${{ inputs.tag }}
      # Packaging helpers come from the workflow's ref, not the tag: backfilling assets
      # onto a tag cut before a helper script existed fails on a missing file otherwise.
      - uses: actions/checkout@v7
        with:
          path: .workflow-ref
      # ... build, then package into <name>.tar.gz + .sha256 ...
      - name: Upload to release
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh release upload "${{ inputs.tag }}" <assets> --clobber
```

  **Use `gh release upload`, not `softprops/action-gh-release`.** That action resolves the
  release from `github.ref`, which is a *branch* when the workflow is called or dispatched
  rather than triggered by a tag. It finds the release by `tag_name`, then 403s updating
  it under `refs/heads/main`, with `contents: write` correctly set — an error that reads
  like a permissions problem and is not one. `gh` takes the tag explicitly and drops a
  third-party action from the release path.

  **Prefer one fat/universal artifact per OS over per-architecture downloads** where the
  toolchain supports it (macOS `lipo -create` of two Rust targets, .NET single-file, Go
  with per-arch builds combined by the packager). Users should not have to know their own
  CPU. Verify the combined artifact still runs, and that any embedded metadata section
  survived the merge.

- **`.github/dependabot.yml`** — always include `github-actions` (keeps the pinned
  actions in these very workflows current), plus each detected ecosystem. Scan
  subdirectories too, not just the repo root: a nested lockfile or manifest (e.g.
  `server/package-lock.json`) needs its own `directory:` entry, one per location.
  Give every ecosystem a `groups:` block for minor+patch updates (like the
  `github-actions` entry below): the light profile has no auto-merge, so ungrouped
  updates mean one manual PR per dependency instead of one per ecosystem per week —
  the difference between a repo that stays updated and Dependabot PRs that pile up
  until they get ignored. Major updates stay individual PRs on purpose.

  Do NOT generate a separate verification pipeline for dependency PRs: Dependabot and
  Renovate open ordinary pull requests, so ci.yml's `pull_request` trigger already runs
  lint, test, and the build-only image job on every one of them — the same gate human
  PRs get, which is the point. One caveat to preserve: Dependabot-triggered
  `pull_request` runs get a read-only `GITHUB_TOKEN` and no repository secrets. The CI
  above needs neither on PRs (the image push is skipped), but never add a
  secrets-dependent step to the `pull_request` path — it would make every dependency PR
  fail permanently.

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "chore(deps):"
    groups:
      github-actions:
        patterns: ["*"]
  # add detected ecosystems: npm, gomod, pip, cargo, docker, terraform ...
  # one entry per directory containing a lockfile/manifest, e.g. "/" AND "/server"
```

- **`.github/workflows/dependency-review.yml`** — blocks PRs that introduce known-vulnerable
  dependencies; free on public repos:

```yaml
name: Dependency Review

on: [pull_request]

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # NOT `@v4`: this action publishes no moving major tag, so the usual short form
      # fails at action resolution before doing any work. Pin the full release and let
      # the pin-resolution check below confirm it still exists.
      - uses: actions/dependency-review-action@v5.0.0
```

- **`.github/workflows/dependabot-automerge.yml`** (strict profile, opt-in from Phase 1)
  — auto-merges Dependabot patch/minor PRs once required checks pass. Safe ONLY when the
  ruleset requires status checks and repo auto-merge is enabled (Phase 5); with no
  required checks, `--auto` merges immediately and unverified — never generate this in
  the light profile:

```yaml
name: Dependabot Auto-merge

on: pull_request

permissions:
  contents: write
  pull-requests: write

jobs:
  automerge:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
      - if: contains(fromJSON('["version-update:semver-patch", "version-update:semver-minor"]'), steps.metadata.outputs.update-type)
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- **Docker build & publish job** — only if a `Dockerfile` exists. Not a separate
  workflow: append this job to ci.yml with `needs: verify`, so lint and test run before
  every image build — on direct pushes to the default branch just as on PRs. The branch ruleset only
  guards PR merges (and the light profile allows direct pushes at all times), so this
  `needs:` gate is the only thing stopping a broken push from shipping an image to the
  registry; that friction is deliberate. On PRs the image is built as a smoke test but
  not pushed (login and `push:` are gated on the event). If ci.yml was skipped (unknown
  stack), still create the workflow with this job alone and report that images publish
  unverified:

```yaml
  build:
    name: Build & push image
    runs-on: ubuntu-latest
    needs: verify
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Log in to GHCR
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=raw,value=latest,enable={{is_default_branch}}
            type=sha,prefix=sha-,format=short
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

  If the user opted into versioned releases (Phase 1), also add `tags: ['v*.*.*']` to
  the workflow's `push:` trigger and a `type=semver,pattern={{version}}` line to the
  metadata tags, so releases produce version-tagged images.

- **`.github/workflows/container-scan.yml`** — only if a `Dockerfile` exists. Findings go
  to the Security tab as SARIF instead of failing scheduled runs into email noise:

```yaml
name: Container Scan

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * 0'

permissions:
  contents: read
  security-events: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t local-scan-image .
      - uses: aquasecurity/trivy-action@v0.36.0   # tag is v-prefixed; verify it resolves (see below)
        with:
          image-ref: local-scan-image
          format: sarif
          output: trivy-results.sarif
          ignore-unfixed: true
          severity: CRITICAL,HIGH
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results.sarif
```

- **`.github/workflows/scorecard.yml`** — both profiles, public repos only. OpenSSF
  Scorecard grades the repo's own supply-chain posture (token permissions, branch
  protection, dependency pinning, ...) weekly, publishes findings to the Security tab,
  and earns a README badge
  (`https://api.securityscorecards.dev/projects/github.com/<owner>/<repo>/badge`) —
  zero friction, pure signal. One expectation to set: Scorecard rewards SHA-pinned
  actions, and this skill pins to version tags for readability, which costs a few
  points; that trade is deliberate, don't chase the score:

```yaml
name: Scorecard

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 3 * * 1'

permissions: read-all

jobs:
  analysis:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: ossf/scorecard-action@v2.4.0
        with:
          results_file: results.sarif
          results_format: sarif
          publish_results: true
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

- **`.github/workflows/stale.yml`** — only if the user opted in during Phase 1:

```yaml
name: Stale

on:
  schedule:
    - cron: '30 1 * * *'

permissions:
  issues: write
  pull-requests: write

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v9
        with:
          days-before-stale: 60
          days-before-close: 14
          stale-issue-message: 'Marked stale after 60 days of inactivity. Comment to keep open; closes in 14 days otherwise.'
          stale-pr-message: 'Marked stale after 60 days of inactivity. Comment to keep open; closes in 14 days otherwise.'
          exempt-issue-labels: 'never-stale'
          exempt-pr-labels: 'never-stale'
```

Before committing, validate the generated workflows:

- **`actionlint`** if available — but note it validates *syntax*, not whether a pinned tag
  exists. It will pass a workflow that references a non-existent action version.
- **Confirm every pinned action tag resolves *and* is current.** Hard-coded versions in
  this skill go stale in two distinct ways, and checking only the first is not enough:

  1. **The tag does not exist.** `actions/dependency-review-action@v4` is the standing
     example — that action publishes no moving major tag, so the short form was never
     valid. A workflow pinned to a missing tag fails at action resolution on its first
     run, before doing any work.
  2. **The tag exists but is majors behind.** `actions/checkout@v5` resolves fine while
     v7 is current. Nothing fails, so the existence check above passes it — and
     Dependabot opens a bump PR minutes after the first push, which makes the freshly
     generated scaffold look stale on arrival.

  Check both for every pin, `actions/*` included — the first-party ones move too:

  ```bash
  repo=actions/checkout; tag=v5
  gh api "/repos/$repo/git/matching-refs/tags/$tag" -q '.[].ref' | grep -qx "refs/tags/$tag" \
    || echo "$repo@$tag does not exist"
  gh api "/repos/$repo/releases/latest" -q .tag_name   # compare majors; bump if behind
  ```

  Use `matching-refs`, not `git/ref/tags/<tag>`: the latter returns prefix matches, so it
  reports success for `v4` purely because `v4.8.0` exists. Prefer a floating major tag
  when the action publishes one, and the full `vX.Y.Z` when it does not.

## Phase 4 — Commit

### Commit message style

Every commit this skill makes follows Conventional Commits — the same convention the
strict profile enforces on PR titles, so the setup practices what it enforces:

- Format: `type(scope): summary`, e.g. `chore(repo): add dependabot config`. Scope is
  optional; drop it when it adds nothing.
- Types used here: `docs` (README, LICENSE, community files), `ci` (workflow files),
  `chore` (dotfiles, dependabot.yml, everything else).
- Subject: imperative mood ("add", not "added"/"adds"), lowercase after the colon, no
  trailing period, 72 characters max.
- Body only when the subject can't carry the *why* (a non-obvious skip, a workaround);
  wrap at 72. Never restate *what* changed — the diff shows that.

Split the scaffold into logical commits instead of one blob, so the history reads as a
reviewable sequence:

1. `docs: add README, LICENSE, and security policy`
2. `chore: add editor, git, and dependabot config`
3. `ci: add CI and security workflows`

### Landing the commits

- **Empty repo** (no commits): commit the scaffold directly to the default branch and
  `git push -u origin <default-branch>` (usually `main`). There is no history to protect
  and no base branch for a PR.
- **Existing code, light profile**: commit directly to the default branch and push.
  Direct pushes to the default branch are the workflow this profile is built around; the setup itself
  is no exception. CI runs on the push, which also produces the check-run names Phase 6
  needs to discover.
- **Existing code, strict profile**: create branch `chore/setup-github-repo`, stage the
  generated files by explicit path, commit, `gh pr create`, wait for CI, and merge.
  Settings and rulesets come after the merge. Write the PR body in the Why / What /
  Verification shape the generated PR template uses — no boilerplate beyond that.

## Phase 5 — Repository settings (after the scaffold has landed on the default branch)

Metadata and features:

```bash
gh repo edit -d "<description>" -h "<homepage>" \
  --add-topic <topic1> --add-topic <topic2> \
  --enable-wiki=false --enable-projects=false
```

Topics must be lowercase alphanumeric/hyphens, max 20 topics. The social preview image
has no API — report it as a manual step (Settings > Social preview).

Labels — create any label a generated file references that the repo lacks. GitHub seeds
`bug` and `enhancement` (used by the issue forms) by default, and Dependabot creates
`dependencies` itself, but the stale workflow's exemption label exists nowhere:

```bash
# only when the stale bot was opted in (Phase 1)
gh label create never-stale -d "Exempt from the stale bot" -c 0e8a16 --force
```

Merge behavior — squash-only, and squash commits inherit the validated PR title (without
the PATCH, squash commits default to branch-name text and the PR title check is pointless):

```bash
gh repo edit --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false \
  --delete-branch-on-merge --enable-auto-merge --allow-update-branch
gh api -X PATCH /repos/{owner}/{repo} \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
```

Security hardening:

```bash
# Dependabot alerts + security updates (distinct from version updates in dependabot.yml)
gh api -X PUT /repos/{owner}/{repo}/vulnerability-alerts
gh api -X PUT /repos/{owner}/{repo}/automated-security-fixes

# Private vulnerability reporting (SECURITY.md points at this button)
gh api -X PUT /repos/{owner}/{repo}/private-vulnerability-reporting

# Secret scanning push protection (default-on for public repos since 2024; verify anyway)
# no heredoc: write the body to a temp file, apply, remove
body=$(mktemp)
printf '%s' '{ "security_and_analysis": { "secret_scanning_push_protection": { "status": "enabled" } } }' > "$body"
gh api -X PATCH /repos/{owner}/{repo} --input "$body" && rm -f "$body"

# CodeQL default setup — only for CodeQL-supported languages; handle a 409 gracefully
gh api -X PATCH /repos/{owner}/{repo}/code-scanning/default-setup -f state=configured

# Actions token read-only by default; workflows request write per-job via permissions:
gh api -X PUT /repos/{owner}/{repo}/actions/permissions/workflow \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false

# ...BUT if release-please was chosen in Phase 1, that flag must be `true` instead:
#   gh api -X PUT /repos/{owner}/{repo}/actions/permissions/workflow \
#     -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true
# See the note below — with `false`, release-please cannot open its release PR at all.
```

**`can_approve_pull_request_reviews` and release automation conflict — resolve it here,
not by debugging a red run later.** That single flag governs whether Actions may *create
or approve* pull requests, not just approve them. Setting it `false` while also installing
release-please guarantees a failure the first time a releasable commit lands:

```
release-please failed: GitHub Actions is not permitted to create or approve pull requests.
```

The branch gets created and the run fails at the very last step, so it reads like a token
scope problem rather than a repo setting. Rules:

- **release-please (or any bot that opens PRs) chosen → set it `true`.**
- **No PR-opening automation → keep it `false`.**
- `default_workflow_permissions=read` stays `read` in both cases; that part is unrelated.

The approve half of the flag is the security-relevant one. On a solo/light repo nothing
requires review, so it costs nothing. On a strict repo with required reviews, note in the
summary that Actions can now approve as well as create — if that is unacceptable,
release-please needs a PAT or a GitHub App instead, and that trade belongs to the user.

**Expect bot-authored PRs to need run approval.** Checks on a release-please PR land as
`action_required` rather than running, because the PR author is the `github-actions` app.
Approve them so the release is actually verified before merge — a green merge button on a
PR whose checks never ran is worse than a red one:

```bash
gh run list -L 10 --json databaseId,conclusion \
  -q '.[] | select(.conclusion=="action_required") | .databaseId' \
  | xargs -I{} gh api -X POST /repos/{owner}/{repo}/actions/runs/{}/approve
```

## Phase 6 — Branch ruleset (last, after CI has reported at least once)

Use rulesets, not classic branch protection (classic is legacy, and `gh api -f` cannot
express its required JSON types). Rules:

- **Light profile: keep only the `deletion` and `non_fast_forward` rules.** Drop the
  `pull_request` and `required_status_checks` blocks entirely so direct pushes to the
  default branch keep working. The owner loses nothing they'd feel, and the branch can
  no longer be deleted or force-pushed.
- `required_approving_review_count` (strict): **0 for solo maintainers, 1+ for teams**
  (Phase 1 answer).
- **Discover the real check names, never assume them.** The `context` is the check run's
  display name (the job's `name:` field, e.g. `Typecheck, lint & test`), not the workflow
  filename or job id. Read them from an actual run before writing the ruleset:
  `gh api /repos/{owner}/{repo}/commits/$(git rev-parse HEAD)/check-runs -q '.check_runs[].name'`
  (or `gh pr checks <pr>`). A required check that never reports blocks all merges forever,
  so only list contexts that have produced at least one run.
- Bypass actor `actor_id: 5` is the repository-admin role, keeping a solo maintainer able
  to hotfix.
- Idempotency: `gh api /repos/{owner}/{repo}/rulesets` first; if a ruleset with this name
  exists, update it by ID (`PUT /repos/{owner}/{repo}/rulesets/{id}`) instead of creating
  a duplicate.

Write this payload to a temp file outside the repo and apply it with
`gh api -X POST /repos/{owner}/{repo}/rulesets --input "$f"` (per the no-heredoc rule),
then delete the file:

```json
{
  "name": "protect-default-branch",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      } },
    { "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [ { "context": "<check-run name discovered above>" } ]
      } }
  ],
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ]
}
```

If no CI workflow was generated (unknown stack), omit the `required_status_checks` rule.

If the user opted into versioned releases (Phase 1), add a second ruleset protecting
release tags from deletion or moving — released tags being immutable is a real
supply-chain property, and release-please can still create new tags freely:

Same handling — write to a temp file, then
`gh api -X POST /repos/{owner}/{repo}/rulesets --input "$f"`:

```json
{
  "name": "protect-release-tags",
  "target": "tag",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "rules": [ { "type": "deletion" }, { "type": "update" } ]
}
```

Apply the same idempotency check here as for the default-branch ruleset: list
`gh api /repos/{owner}/{repo}/rulesets` first, and if `protect-release-tags` already
exists, update it by ID rather than creating a duplicate.

## Phase 7 — Verify and report

- `gh api /repos/{owner}/{repo}/community/profile -q .health_percentage` improved
  (target 100 in strict; light intentionally skips the community files, so just confirm
  it went up).
- `gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed,deleteBranchOnMerge,description,repositoryTopics`
  matches what was applied.
- `gh api /repos/{owner}/{repo}/rulesets` shows exactly one `protect-default-branch` ruleset.
- `gh api /repos/{owner}/{repo}/actions/permissions/workflow` shows
  `default_workflow_permissions: read`.
- `gh workflow list` shows the expected workflows, and **every workflow the skill just
  added has a green first run — not only CI.** A green CI run says nothing about the
  security workflows (dependency-review, scorecard, container-scan); a broken third-party
  action pin (issue this check exists to catch) fails Container Scan on push while CI stays
  green. Check each generated workflow's latest conclusion and treat any failure as a
  finding to fix or report, not a pass:

  ```bash
  for wf in ci.yml dependency-review.yml scorecard.yml container-scan.yml release-please.yml; do
    echo "$wf: $(gh run list --workflow="$wf" -L1 --json conclusion -q '.[0].conclusion // "no run yet"')"
  done
  ```

  Two readings that are *not* failures, and must be labelled as such rather than chased:
  `dependency-review.yml` shows "no run yet" until the first pull request, since it has no
  push trigger; and a transient `scorecard` network error against `codeload.github.com`
  is worth one re-run before treating it as real.

- **If release binaries were generated, prove the whole chain, not just a green run.** The
  failure mode here is silent: workflows pass, a release exists, and it has no assets.

  ```bash
  tag=$(gh release list -L1 --json tagName -q '.[0].tagName')
  gh release view "$tag" --json assets -q '.assets[] | "\(.name) \(.size)"'   # must be non-empty
  ```

  If the release predates the workflow, backfill it with
  `gh workflow run release.yml -f tag=<tag>` rather than leaving an assetless release as
  the project's newest. Then actually download one artifact, verify its checksum, and run
  the binary — a packaged artifact that unpacks to something that will not execute (wrong
  arch, broken signature, missing bundle) passes every check above.
- Strict profile: `gh api /repos/{owner}/{repo}/codeowners/errors` returns no errors — a
  broken CODEOWNERS file fails silently otherwise.
- Strict profile: open a one-line smoke-test PR (e.g. a docs touch) to prove the
  guardrails end to end: the PR title check fires, CI is required, the merge button
  offers squash only, and the branch auto-deletes on merge. The ruleset lands after the
  setup PR merges, so without this nothing has ever exercised it.

Finish with a summary table: **applied** / **skipped (already present)** / **manual steps
remaining** (social preview image, Renovate app install if chosen, enforcement contact in
CODE_OF_CONDUCT.md if the user's email was not confirmed). Every skipped file carries its
audit result (Principle 7): either "compliant" or the specific gaps found, each with an
offer to apply them additively — a bare skip with no audit line is incomplete. Delete
`SETUP-PLAN.md` — the summary supersedes it, and it must never end up committed.
