# CV-RAW — workspace (raw notes + AI context) · TEMPLATE

> **This is a shareable template.** It demonstrates a two-file, AI-assisted
> CV-rebuild workflow with all personal content stripped out. Real customer
> names, career facts and private paths have been replaced with
> `[placeholders]`. Copy this file (and its sibling `CV-POLISHED.template.md`)
> into your own workspace, rename them to `CV-RAW.md` / `CV-POLISHED.md`,
> gitignore them, and start filling in your own jobs.

Source-of-truth file for the CV rebuild. Contains the AI-context block (workflow, rules of engagement, language guidance) plus **raw notes per job** in your native language, editable and improvable over time.

**Sibling file:** `CV-POLISHED.md` holds the refined English output. Claude reads `CV-RAW.md` (raw notes + inline ⚑ polish-tuning flags) and writes/updates `CV-POLISHED.md` on `refine job X` triggers. Raw notes are never touched during refine.

---

## Context for Claude (don't delete — read in full before responding)

**Status (example):** Job 1 is fully covered. Job 2 is a single merged entry
spanning two periods with a gap in the middle. Jobs 3–5 have raw notes but no
polished output yet. *(Replace this line with your own state-of-play.)*

### For a new Claude session opening this file

1. **Read this Context block in full** before responding to anything. The
   workflow, the rules of engagement, the audience/language guidance — all of
   it is below this section.
2. **Read your durable preference files** (e.g. a `memory/` directory or
   project notes) that capture how you like this work done. *(In the original
   setup these were per-session memory files; point this at wherever you keep
   standing instructions.)*
3. **Scan the rest of `CV-RAW.md`** for state-of-play. Each job heading has
   its own `**Last updated:**` marker. Each job's `### Raw notes` block tells
   you what's captured (H/P/T bullets are numbered). To see which jobs have
   been polished, open the sibling `CV-POLISHED.md`.

**Where session-internal stuff goes:**

| Thing | Goes in |
|-------|---------|
| Raw notes from a dump | `CV-RAW.md` → relevant job → `### Raw notes` |
| Cross-customer framing observation | `CV-RAW.md` → relevant job → `H##` entry |
| Polish-tuning hint (per-job framing, anonymisation, audience choice) | `CV-RAW.md` → relevant job → inline ⚑ flag near the raw bullet it qualifies |
| Polished prose | `CV-POLISHED.md` → relevant job section |
| Open follow-up threads | Tail-noted in the audit at end of turn; NOT in a file |
| Durable user preferences | Your standing-instructions / memory store |

If you find yourself wanting to write a "status table" or "open threads queue"
to a separate file, stop — that's session-internal state. Keep it in chat or
inline in the relevant job's Raw notes.

### Goal
Rebuild the CV by capturing the **full reality** of each past job in your
native language, then refining into English with a domain-appropriate lens
(here: cloud-engineer / consultant). The compressed summaries in a public
resume file are too terse to drive that exercise — this workspace is where the
long-form lives.

### File layout

Two files, both kept local and gitignored.

- **`CV-RAW.md` (this file)** — AI-context block (workflow, rules of
  engagement, language guidance) + **raw notes per job** in your native
  language. The long-lived source of truth for career facts, edited and
  improved over time. Per job:
  - `### Raw notes` — three subsections (`What the job actually was`,
    `Projects / tasks`, `Technology in practice`). Dump zone.
  - **Per-job polish-tuning hints** live inline as ⚑ flags within the raw
    notes (e.g. *"⚑ framing flag from user"*, *"⚑ structural trait of the
    role"*). These qualify specific raw bullets and guide refine-time framing
    decisions.

- **`CV-POLISHED.md` (sibling file)** — refined English output. Claude
  writes/updates this on `refine job X` triggers, using `CV-RAW.md` as data
  source and the inline ⚑ flags as polish-tuning instructions.
  **CV-RAW.md raw notes are never modified during refine.**

### Active workflow (typed Q&A in your native language)
1. Claude asks a **numbered list of questions** in your native language,
   organised by the three Raw-notes subsections (`What the job actually was`
   / `Projects / tasks` / `Technology in practice`).
2. User answers by number, freely — fragments and tangents welcome.
3. Claude writes the answers into the `### Raw notes` block under the relevant
   job, following the **rules of engagement** below.
4. Claude presents the updated block back with a labelling scheme
   (`H1`, `H2`, … `P1`, `P2`, … `T1`, `T2`, …) so the user can correct by
   reference.
5. Claude asks follow-up questions where there are gaps. Iterate until the
   user says "next job".
6. When the user says "refine job X", Claude writes/updates the corresponding
   job section in **`CV-POLISHED.md`** (sibling file), using `CV-RAW.md` as
   the data source and the inline ⚑ flags as polish-tuning instructions.
   Raw notes in this file are never modified during refine.

### Rules of engagement (the most important section)

These were learned the hard way. Read them carefully.

0. **HARD RULE — NEVER back-fill `CV-RAW.md` to justify a polished claim.**
   CV-RAW.md is a witness statement of what actually happened in the user's
   career. If a polished claim in `CV-POLISHED.md` or any downstream artefact
   is found to be unsupported by the raw layer, the correct fix is **always
   to weaken or remove the polished claim**. NEVER add a "new" raw bullet,
   tweak an existing raw bullet, or paste freshly invented context into
   CV-RAW.md to retroactively justify the polished version. Raw notes are
   append-only and only based on what the user dictates from real memory
   during a Q&A session.

   Any AI agent — polisher, fact-checker, reviewer, push-step, or any other
   — that finds itself reaching for an `Edit`, `Write`, or any mutating
   tool on `CV-RAW.md` during a polishing, fact-checking, or push pass is
   violating the most important rule of this workspace. STOP and surface
   the gap to the user. Do not write.

   The only modifications to CV-RAW.md happen:
   - When the user dictates new raw content during a typed Q&A session.
   - When the user explicitly asks for a structural / phrasing edit to an
     existing raw entry (e.g. "fix P11 to ...", "remove T10").
   - When the Context block at the top of the file is updated for workflow
     reasons — never the per-job Raw notes.

1. **Be verbose. Do NOT compress.** If the user wrote 8 distinct facts in one
   sentence, capture all 8 as separate bullets or sub-clauses — don't fold
   them into 3. Lossy compression is the failure mode here, not verbosity.

2. **Preserve the user's exact phrasings.** Direct quotes carry tone and
   confidence that paraphrase loses. Keep the user's own words and coined
   terms verbatim (e.g. a phrase like *"[a confident summary the user used]"*
   or a personal coinage like *"[user's own word for a thing]"*) rather than
   swapping in your own vocabulary.

3. **Do not introduce new terminology the user didn't use.** Don't invent a
   crisp label for something the user described in plain words. Use their
   vocabulary when summarising, even if yours sounds tidier.

4. **Do not translate inline inside the Raw-notes section.** The `### Raw
   notes` block stays in the native language. English translation belongs in
   `CV-POLISHED.md`, done at refine time.

5. **Numbered review format.** Label every bullet by section:
   - Inside a job: `H1.`/`H2.` (What the job was), `P1.`/`P2.` (Projects /
     tasks — these are **professional** project work, done as part of the
     job), `T1.`/`T2.` (Technology).
   - Education: `E1.`/`E2.`.
   - Private / personal projects (standalone, not tied to a job): `PP1.`/`PP2.`.
   - Certifications & courses: `C1.`/`C2.`.

   The user corrects with *"fix P11 to ..."* or *"remove T10"*. Renumber if
   you reorder. **The `Projects / tasks` subsection is optional** — if a job
   had no discrete projects (a steady operations role, a short stint), omit
   the subsection entirely rather than inventing a `P` entry to fill it. Same
   for any subsection — including the whole Private projects and
   Certifications blocks — with nothing real to put in it.

6. **Ask numbered follow-up questions, grouped per customer (or per single
   cross-cutting topic).** When you need more info, give a short numbered list
   and let the user answer by number. **Stay on one customer (or one
   cross-cutting topic) until the user signals "next" — do not pepper the user
   with questions across many open threads at once.** Keep a tail-note
   pointing to other open threads so they aren't forgotten, but don't ask them
   in the same turn. Don't ask one open-ended question.

7. **Don't ask about presentation while gathering.** No questions like
   *"should I anonymise customer names?"* or *"how do you want this packaged?"*
   during the dump phase. Those are refine-time decisions. Just get the info
   in now; don't think about what to do with it later.

8. **Customer names are OK in the Raw-notes sections.** Both files are
   gitignored. Anonymisation (if any) is a refine-time decision for
   `CV-POLISHED.md` — ask the user before defaulting either way. Don't
   self-censor in the raw notes.

9. **When the user pushes back ("you missed things", "too compressed"),
   rewrite the section, don't patch.** Restore lost detail from the
   conversation history. Then present the new block again with the numbered
   labels so the user can re-audit.

10. **After each dump, do an honest audit — jobs and education alike.** When
    the user asks *"did you get everything?"*, go back through their original
    messages and check. Flag explicitly:
    - facts captured ✓
    - paraphrases / your word choices (vs. theirs)
    - gaps (questions they didn't answer)
    - things you never asked about

### Decisions locked in (don't re-litigate)
- Workspace lives in `CV-RAW.md` (this file) + sibling `CV-POLISHED.md`. Both
  gitignored.
- Seeded from the jobs already in your public resume data file.
- Polished output in `CV-POLISHED.md` does NOT auto-flow into the public
  resume file or case-study files — that's a separate, explicit push step.

### Audience & language for `CV-POLISHED.md`
- **Output language: English.** Even though the raw layer is in your native
  language.
- **Author context:** describe yourself here — e.g. *"[Nationality] engineer
  based in [City], working in the [market] market ([local] customers,
  colleagues, regulatory environment)."*
- **Target audience:** international employers + local employers who read
  English-language CVs. Don't translate things that don't need translating:
  - Keep local institution / place / programme names as-is, with a short
    English gloss the first time (e.g. *[credential] (trade certificate)*).
  - Keep technical acronyms in their canonical form — don't expand them every
    time.
- **Tone:** professional, factual, technically precise. Direct, no sales-y
  superlatives, no padding adjectives ("cutting-edge", "robust", "scalable"
  used as filler). Outcomes and scale carry the message.
- **Anonymisation:** customer names appear unredacted in `CV-RAW.md`'s raw
  notes (file is gitignored). **In `CV-POLISHED.md`, customer names are
  anonymised by default** ("aviation customers", "healthcare customers",
  "transport-sector customer", "public-sector customer", "B2B SaaS customer")
  to match a paste-ready public resume convention. Override only if the user
  explicitly says non-anonymised.

### Polish output format (resume / CV-build constraint)

**`CV-POLISHED.md` is a paste-ready draft for your public resume data file.**
Each polished job section should map cleanly to one experience entry's
`description` field, which a CV build pipeline can render as bullet items. So:

- **3–4 prose paragraphs per job** as bullets. Each bullet renders as one
  item — don't write multi-paragraph bullets, and don't nest.
- **Each bullet stands alone** — full sentences, no markdown headers, no
  sub-structure that doesn't exist in the resume schema.
- **End with a "Daily stack:" bullet** listing canonical tech names.
- **Keep prose free of characters hostile to your downstream build** (LaTeX
  specials, markdown-link syntax) since the result is paste-ready into a
  string literal.

### Per-job polish-tuning
Before writing a job's polished section, scan that job's raw notes for inline
⚑ flags. They encode user-explicit framing decisions (e.g. *"public-sector
angle"*, *"present as single-project consultant"*, *"lift the IT part +
homelab work"*). Apply them; don't re-derive framing from scratch.

### Per-job "Last updated" marker
Each job heading carries a **Last updated:** YYYY-MM-DD field inline with
Period / Location. **Bump it to today's date whenever you touch raw notes or
polished for that job.** Empty / not-yet-covered jobs use `—`. This lets
future sessions see at a glance which jobs are fresh vs. stale.

### How to start work on a new job
1. Read this Context block, then read the existing job block lower in this
   file (it may already be partially filled).
2. Ask a numbered list of opening questions, scoped to the Raw-notes
   subsections. Use your public resume file as a starting reference so you
   don't ask the user to repeat basics.
3. Receive the user's answers. Write them into the `### Raw notes` section
   under that job — verbose, preserving their phrasings (rules above). Drop
   any subsection that has no real content (e.g. `Projects / tasks` for a
   role with no discrete projects).
4. Present the updated block back with `H/P/T` numbering (or `E` for
   education).
5. Ask follow-ups. Repeat until the user says "next job" or "refine job X".
   On "refine job X", write/update that job's section in the sibling
   `CV-POLISHED.md` — do not touch this file's raw notes.

---

## [Job Title] — [Company]
**Period:** [Mon YYYY] — [Mon YYYY] · **Location:** [City] · **Last updated:** —

> Example job block showing the structure. Duplicate this heading + Raw-notes
> skeleton once per job. Fill the subsections during the Q&A dump; the H/P/T
> labels are added when Claude presents the block back for review.

### Raw notes

#### What the job actually was
- H1. [What the role really was — the engagement model, who you reported to,
  what you actually owned vs. what the title implied. Be verbose.]
- H2. [Cross-customer or structural observation about how the role worked.]

#### Projects / tasks  *(optional — omit this whole subsection if the job had no discrete projects)*
- P1. [A concrete project or task. What the problem was, what you did, who
  else was involved, what the outcome was.]
  - ⚑ *[Optional polish-tuning flag: how to frame this at refine time, e.g.
    "lead with the migration outcome, not the activity".]*
- P2. [Another project.]

#### Technology in practice
- T1. [A technology you actually used day-to-day and what you did with it.]
- T2. [Another tool / platform / pattern, in your own words.]

---

## Education — [Programme / Credential], [Institution]
**Period:** [YYYY] — [YYYY] · **Location:** [City] · **Last updated:** —

> Education is captured and audited exactly like a job: same verbose-dump,
> same numbered-review, same end-of-turn audit (rule 10). Use `E` labels.
> Duplicate this block once per programme, certificate, or apprenticeship.
> Keep local institution / credential names as-is; the English gloss is a
> refine-time decision for `CV-POLISHED.md`, not something to add here.

### Raw notes

#### What it was / what you got out of it
- E1. [What the programme actually was, what you specialised in, what you
  built or graduated with. Be verbose — capstone projects, thesis topic,
  trade certificate, grades only if the user volunteers them.]
- E2. [Anything that connects the education to the career throughline, in the
  user's own words.]

---

## Private / personal projects  *(optional)*
**Last updated:** —

> Standalone projects done outside any job — a homelab, an open-source tool, a
> side build. Captured and audited like a job (verbose dump, numbered review,
> rule 10 audit), but they are **not** the same as the `P` entries inside a
> job: those are professional work; these are your own. Use `PP` labels.
> Omit this whole section if there are none.

### Raw notes

#### What you built / why
- PP1. [What the project is, why you started it, what problem it scratches,
  what it taught you. Be verbose — the homelab/self-hosting/OSS angle often
  carries real engineering depth a job bullet can't show.]
- PP2. [Another personal project, in the user's own words.]

---

## Certifications & courses  *(optional)*
**Last updated:** —

> Named certifications and structured courses. Lighter than education — usually
> one line each, no verbose dump needed. Use `C` labels. Capture the exact
> credential name, issuer, and year; only add detail the user volunteers.
> Omit this whole section if there are none.

### Raw notes

- C1. [Credential / course name — Issuer — Year. e.g. "CKA — Linux Foundation
  — 2025". Keep the official name verbatim; expansion/gloss is a refine-time
  decision.]
- C2. [Another certification or course.]
