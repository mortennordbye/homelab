# CV-POLISHED — TEMPLATE

> **This is a shareable template.** It demonstrates the polished-output half of
> a two-file, AI-assisted CV workflow with all personal content stripped out.
> Real customer names, career facts and company-specific style rules have been
> replaced with generic guidance and `[placeholders]`. Copy this file (and its
> sibling `CV-RAW.template.md`) into your own workspace, rename them to
> `CV-POLISHED.md` / `CV-RAW.md`, gitignore them, and refine your own jobs.

Refined English output of the CV workspace. Output can be organised into a few
layers, ordered to match a reader's flow through your portfolio site, e.g.:

1. **Portfolio site text** (Part 1) that pastes into the section components and
   content modules of your site (Hero, About, Resume section, Featured Work,
   Services, Contact).
2. **Experience bullets** (Part 2) that paste into the `description` field of
   an experience entry in your public resume data file. A web `/resume` page
   and/or a LaTeX CV build can both read from there.
3. **Project case studies** (Part 3) that paste into one file per project
   (e.g. an MDX file under a `work/` directory), linked from a Featured Work
   section. A CV build can also pull a "Selected Projects" section from those.

This file is the source of truth for all layers. The loop (polisher, reviewer,
fact-checker) polishes sections here in place. A separate push step writes the
polished content out to the public resume file, the case-study files, and the
site components. The push step is the only path from this file into the
portfolio code; nothing else writes to those files automatically.

Sibling file: `CV-RAW.md` holds the raw notes (in your native language) and the
workflow context for Claude. Both files are gitignored.

## How to use this file

When the user asks to refine a job or write up a project, open `CV-RAW.md`
first. It carries the raw notes, the rules of engagement, and the polish-tuning
flags marked inline (⚑) next to specific raw bullets. Apply those flags rather
than re-deriving framing from scratch. Then write the matching section in this
file. Never modify `CV-RAW.md` during refine.

For experience bullets, three to four bullets per job is the target. Each
bullet renders as one item in a CV build, so do not nest, do not write
multi-paragraph bullets, and do not introduce markdown that would not survive
being a string literal. End each technical job with a bullet that starts
"Daily stack:" listing canonical tech names.

For education, refine each programme into a short entry in Part 2b — one or
two lines, no Daily stack. Education is refined from the raw `E` notes the
same way jobs are. Certifications and courses go in Part 2c, refined from the
raw `C` notes, one line each; both Part 2b and 2c are optional.

For project case studies, follow the format spec in Part 3, which is split
into **professional** projects (refined from the `P` entries inside jobs,
`kind: "professional"`) and **private / personal** projects (refined from the
standalone `PP` notes, `kind: "personal"`). Each project maps to one file
under your `work/` directory. Part 3 is optional — if there are no projects
worth a case study, skip it entirely rather than padding it.

## Style preferences (accumulated from user feedback)

Append to this list whenever the user gives style feedback. Future sessions
read this before writing, so the prose stays consistent without the user
repeating themselves. *(The list below is a generic starter set; the original
workspace grew dozens of project-specific rules here over time.)*

- **ASCII only.** No em-dashes, en-dashes, middle dots, arrows, curly quotes,
  ellipsis, accented characters, flag symbols. Use a plain hyphen, comma,
  parenthesis, the word "to", or rephrase.
- **No hyphen as em-dash substitute mid-sentence.** Do not write "X - Y - Z"
  patterns. Use commas, parentheses or rephrase. Hyphens belong inside compound
  words, date ranges (Jan 2026 - Present), and as bullet markers.
- **No italic mapping lines in the body.** Don't annotate sections with notes
  like "(maps to experience[0])". Section order matches the resume order; the
  mapping is implicit.
- **Customer names anonymised by default** for CV bullets and projects, to
  match a paste-ready public resume convention ("aviation customers",
  "healthcare customers", "transport-sector customer", "public-sector
  customer", "B2B SaaS customer").
- **Heading format for jobs:** the role on one line as a markdown H2, then
  "Company, Location. Period." on the next line. No comma-separated one-line
  headers that pile up four commas.
- **Local institution names stay as is**, with a short English gloss on first
  mention. Acronyms canonical — don't expand them every time.
- **Tone is factual, no filler adjectives** (cutting-edge, robust, scalable,
  world-class, blazingly fast). Outcomes and scale carry the message.
- **No metrics that the raw layer does not support.** If a number is in
  `CV-RAW.md`, fine. If it is not, do not invent.
- **End each technical experience entry with a "Daily stack:" bullet.**
- **Cap Daily stack lines at 8-10 items.** Drop non-daily tools. Activities
  (hardening, compliance audits) are not stack items; remove them from the
  Daily stack line.
- **Lead with the outcome or decision, not the activity.** "Chose X because Y"
  beats "implemented X". Design rationale in the first clause signals senior
  thinking.
- **Open each experience bullet with a distinct verb.** Avoid repeating the
  same opener across bullets in the same entry or across adjacent roles.
- **For initiative/tooling bullets, lead with the gap or risk, then the
  resolution.** "X was a reliability gap: sourced Y" beats "Sourced and
  integrated Y". Ownership reads clearly when the problem comes first.
- **Role titles must be exact.** Do not upgrade titles for impact. If the title
  was "engineer", don't write "senior engineer"; if someone else held the lead
  role, don't borrow it.
- **Credit collaborative work honestly.** When raw notes show shared effort
  between the user, colleagues, and a customer's team, do not write the bullet
  as if the user did it alone. Use "alongside the customer's team", passive
  voice for joint activities, and reserve first-person active framing for parts
  the raw notes specifically attribute to the user solo. Preserve the
  "I" / "we" / "the customer" splits the raw notes carry.
- **No colons in body prose for introducing lists or explanations.** Replace
  with "including", a comma, "covering", or a new sentence. The "Daily stack:"
  label is the only allowed colon.
- **Project case studies — own story, minimal overlap with experience
  bullets.** Part 2 carries the role's reach and headline projects. Part 3
  carries design rationale, trade-offs and technical depth — the WHY behind
  the bullet. Don't restate experience bullets in case-study prose; expand on
  what the bullet had to skip for space. Cross-link related case studies inline
  so a through-line reads across the file.

## Refine workflow

When the user says "refine job X" or "refine project X":

1. Open `CV-RAW.md` and locate the matching raw section.
2. Read its raw notes in full, including the inline polish-tuning flags (the
   entries marked with a ⚑ glyph).
3. Apply the style preferences above plus any tuning flags. Do not re-derive
   framing from scratch.
4. Rewrite the corresponding section in this file. Do not touch `CV-RAW.md`
   during refine.

---

## Part 2 — Experience bullets

### [Job Title]
[Company], [City]. [Mon YYYY] - [Mon YYYY].

> Example polished entry. Three to four standalone bullets, each rendering as
> one CV item, ending with a Daily stack line.

- [Lead with the outcome or decision. One full sentence that a hiring panel
  reads as senior judgement, anonymising the customer if the default applies.]
- [A second distinct contribution, opening with a different verb. Credit
  collaborators honestly where the raw notes show shared work.]
- [An initiative or tooling bullet: lead with the gap or risk, then the
  resolution.]
- Daily stack: [Tool, Tool, Tool, Tool, Tool] (cap at 8-10 canonical names).

---

## Part 2b — Education

### [Programme / Credential]
[Institution], [City]. [YYYY] - [YYYY].

> Example polished education entry. One short line per programme; keep local
> institution / credential names as-is with an English gloss on first mention.
> Lead with what you came out with, not the act of attending.

- [What the programme was and what you specialised in or graduated with —
  e.g. *[credential] (trade certificate)* in [field], or a degree with a
  named thesis/capstone. One or two lines; no Daily stack here.]

---

## Part 2c — Certifications & courses  *(optional)*

> Refined from the raw `C` notes. One line each, most-relevant first. Keep the
> official credential name; add an English gloss only if it is not
> self-explanatory. Skip this whole part if there are none — do not pad it.

- [Credential name, Issuer, Year. e.g. "Certified Kubernetes Administrator
  (CKA), Linux Foundation, 2025".]
- [Another certification or course.]

---

## Part 3 — Project case studies  *(optional)*

> **Skip this whole part if you have no projects to feature.** Not every CV
> needs case studies — they suit portfolio sites and senior/IC roles where
> depth matters. If you include none, that's fine; nothing downstream
> requires a Part 3 entry to exist.
>
> Projects come in two kinds, each mapping to a `kind:` value in the project
> file's frontmatter so a CV build can filter them:
> - **Professional** (`kind: "professional"`) — work done as part of a job.
>   Anonymise the customer per the default rule; expands on a Part 2 bullet.
> - **Private / personal** (`kind: "personal"`) — homelab, open-source, side
>   builds. Refined from the raw `PP` notes. No customer to anonymise; lead
>   with the engineering, not the hobby framing.
>
> A CV build can include just the professional ones (e.g. filter
> `featured: true && kind: "professional"`) while a portfolio site shows both.

### Professional — [project-slug]

> Expands on the WHY behind a Part 2 bullet — design rationale, trade-offs,
> depth — without restating the bullet. One file per project under your
> `work/` directory, `kind: "professional"`.

**Context.** [The problem and constraints. Anonymise the customer per the
default rule; name the regulated domain instead.]

**Approach.** [The design decision and why, the trade-offs weighed, what you
ruled out.]

**Outcome.** [What shipped, the defensible scale/metric if the raw layer
supports one, and the through-line it reinforces. Cross-link related case
studies inline.]

### Private / personal — [project-slug]

> A standalone project refined from the raw `PP` notes. `kind: "personal"`.
> No customer to anonymise. Lead with the engineering depth and what it
> demonstrates, not "in my spare time".

**Context.** [What you set out to build and why — the problem it scratches,
the constraint that made it interesting.]

**Approach.** [The design decisions and trade-offs, same rigour as a
professional case study.]

**Outcome.** [What runs today, what it taught you, and how it connects to the
professional throughline — e.g. homelab practice feeding into platform work.]
