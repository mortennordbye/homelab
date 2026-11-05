# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Blueprint:** The repo template: copy this to `CLAUDE.md` in a new code repo. The **Working approach** (same principles as `generic.blueprint.md`) and **Security baseline** sections are project-agnostic, keep them verbatim. The `<!-- TODO -->` sections are a scaffold: replace each with this project's specifics, and delete the optional blocks that don't apply. Delete this note when done.

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

- Keep and write: one-line constraints, traps, machine-read annotations (`# renovate: ...`),
  upstream-required markers, license headers.
- Never write: how the value was arrived at (dates, incident timelines, measurements, A/B
  statistics, "until <date> this was..."); a restatement of the line below; a justification
  for the reviewer of the change; Markdown emphasis. History lives in git. A rationale worth
  a narrative goes in the docs, and the comment points there.
- The tell for AI-session residue is a comment that cites a date, a past value or evidence.
  Compress it to the rule that survives, or delete it.

### Track unfinished work in BACKLOG.md

Anything left unfinished or deferred gets an entry in `BACKLOG.md` in the repo root before the
task is reported done. Deferrals in chat vanish next session. Each entry states what the work
is, why it was deferred, what unblocks it, and where the code lives (file paths). Copy the
format of the existing entries.

- Unfinished means: a tier you did not ship, out-of-scope items you noticed but did not fix,
  features behind a flag that still need ramping or cleanup, skipped tests, mocks or debug
  logging left in, and TODO comments you wrote (write the entry instead, TODOs rot in code).
- Not backlog: work in progress (that belongs on a branch), ideas the user did not agree to
  defer (do them or drop them), and pre-existing debt the user did not ask you to track.
- Delete an entry when the work is done.

### No AI attribution in commits

Commits and PRs read as the human author's. No AI fingerprint, ever.

- No `Co-Authored-By` trailer naming Claude or any AI.
- No session links or IDs (e.g. a `Claude-Session:` trailer).
- No "Generated with Claude Code", 🤖 emoji, or similar tool signatures in commit messages, PR descriptions, or issue bodies.
- Describe the change, not the tool that produced it.

### Writing style

All text in this repo follows ASD-STE100 (Simplified Technical English) at about 80 %
strictness: docs, code comments, commit messages, PR and issue bodies, and replies to the user.

- Short sentences, one fact or one instruction each. Active voice. Simple verbs.
- One meaning per word. No idioms, no metaphors, no filler.
- Keep code names, error text and quotes exact, even when they break an STE rule.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Development

<!-- TODO: The commands to run, test, and watch this project locally. Note required env
vars (point to `.env.example`) and how to run a single test by name. -->

```bash
# dev:    <start the app locally>
# test:   <run the test suite>   (single test: <how>)
# watch:  <watch mode, if any>
```

**Build with containers in mind.** Develop, test, and ship inside containers so the app runs the same on a laptop, in CI, and in production, with no "works on my machine" drift. Provide a `Dockerfile` (and a `compose` file when the app needs a database or other services), and keep the toolchain out of the host where practical.

**Make the dev process easy.** Wrap the common workflows (setup, run, test, lint, build) behind short scripts or `make` targets so a newcomer (or an AI) runs one obvious command instead of memorizing flags. A documented one-liner beats a paragraph of setup steps.

## Before reporting a task complete

<!-- TODO: The one command (or short list) that must pass before a task is "done":
typically typecheck + lint + tests. Run it even when the change "looks obviously
correct"; the bugs that slip through are the unexpected ones. -->

```bash
# verify: <the gate command>
```

<!-- Optional: pre-commit / pre-push hooks (how to install them, what they run, so the
AI doesn't bypass them by accident), and any smoke / end-to-end protocol for critical
flows. State skip rules: doc-only, test-only, dependency bump, formatting changes.
For any change touching the network, auth, or data surface, also run the Security
baseline pre-ship checklist below before declaring the task done. -->

## Security baseline

Applies to any project with a network, auth, or data surface: APIs, web apps, services. Skip it for a pure CLI, library, or offline tool, but say so when you skip. This is a floor that heads off the incidents that hit vibe-coded apps most often. It is not a substitute for a real threat model or a security review.

**Two defaults that flip the common failure modes:**
- **Deny by default.** Every endpoint, query, and storage rule starts closed and opens only for a reason you can state. An endpoint with no auth decision is a bug, not a public route.
- **Every input crossing a trust boundary is hostile** until validated: request bodies, query params, headers, path segments, uploaded files, third-party responses, anything a user can influence.

**Authentication and authorization**
- Every endpoint makes an explicit auth decision. "Public" is a choice you write down, not one you forget into.
- Authorize the object, not just the route: confirm the caller may act on *this specific* record. An ID from the client is a request, never proof of ownership. This broken-access-control / IDOR class is the most common serious bug.
- Read identity (user, role, tenant) from the verified session or token on the server. Never accept it as a request parameter.
- Enforce on the server. Hiding a button or a route in the client is not access control.

**Don't hand-roll the dangerous parts**
- Use the framework's auth, sessions, password hashing, and crypto. No custom JWT verification, no homemade login, no roll-your-own crypto.
- Reach the database through parameterized queries or the ORM. Never assemble SQL, shell commands, or HTML by concatenating user input.

**Secrets**
- Never in source, client bundles, logs, or error messages. Server-side only, validated at startup, loaded the way `### Environment variables` describes.
- A secret that ever landed in a commit is compromised: rotate it. Deleting the line does not help; git remembers.

**Abuse and cost**
- Rate-limit and size-cap anything unauthenticated or expensive: login, signup, password reset, search, uploads, and any call to a paid or model API. A runaway bill is a security incident too.

**Input and output**
- Validate and parse at the boundary with a schema, and allowlist the fields you accept. Never bind a request body straight onto a database model (mass assignment).
- Don't reflect raw user input into HTML, SQL, shell, file paths, or outbound URLs (XSS, injection, path traversal, SSRF).
- Generic errors to the client, full detail to server logs only. Keep secrets and personal data out of logs.

**Data exposure**
- Storage and row-level rules default to deny (RLS on, buckets private). Return only the fields the caller needs: no password hashes, internal flags, or other users' rows.
- Restrict CORS to known origins; never `*` together with credentials.

**Before shipping anything with a network or data surface, confirm:** authenticated, authorized for the specific object, input validated, secrets out of code, rate limit on public or expensive paths, errors and logs leak nothing.

## Architecture

<!-- TODO: The stack and overall shape in a few lines: language/runtime, framework,
data layer (DB, ORM, validation), UI layer if any, deployment target. Link out to
deeper docs rather than duplicating them. -->

### Data flow rules

<!-- TODO: How data moves through this project: where reads vs writes happen, where
input is validated before touching storage, and the standard result/return type for
handlers. Prefer inferring types from the schema over redefining them. -->

### Safety rules for AI-assisted changes

<!-- TODO: Project-specific invariants beyond the universal Security baseline above:
the rules unique to THIS system, named concretely. Examples: every query filters by the
current tenant; the `requireUser()` helper wraps every action/route; new handlers are
copied from `<safe-template-path>`, never from a drifted older one; PII columns are
encrypted at rest. -->

### Environment variables

**Use `.env` files for configuration and secrets.** Read config from the environment, loaded from a local `.env` file that is **gitignored and never committed**. Commit a `.env.example` listing every variable with safe placeholder values so a newcomer knows what to set. Validate the required vars at startup (a central validated module) and fail fast with a clear message when one is missing.

<!-- TODO: How env vars are read and validated (a central validated module vs raw
access) and how to add a new one (extend the schema + `.env.example`). -->

### Directory layout

<!-- TODO: Shallow tree of the directories that matter for orientation, one line each.
Not every folder, just the ones a newcomer needs. -->

```
src/
├── ...
```

### Key patterns

<!-- TODO: Project-specific idioms a newcomer or AI must know: state containers,
shared utilities/formatters and where they live, cache/revalidation conventions, and
any UI rules (touch-target size, primary-action placement) that apply. -->

### Code quality

- **Reuse before adding.** Check shared utilities and components before writing new ones.
- **Prefer established frameworks over reinventing.** Reach for a well-maintained, widely-used library or framework before hand-rolling auth, routing, state, validation, dates, HTTP, and the like. The same goes for the UI: build on a proven component library or design system (e.g. shadcn/ui, Radix, MUI, Chakra) instead of hand-rolling buttons, modals, dropdowns, and form controls: you get accessibility, keyboard handling, and a consistent look for free. Mature libraries are battle-tested and keep the app feeling consistent; bespoke versions drift and rot. Only build your own when no good option fits, and say why.
- **Use current, supported versions.** Pick libraries that are actively maintained and pull a recent, supported release. Avoid end-of-life or abandoned dependencies; an unmaintained library is a security and upgrade liability.
- **No dead code.** If a button has no handler, implement or remove it.
- **No premature abstractions.** Only extract a helper when it's used in 2+ places.
