# cv-workflow blueprint

A two-file, AI-assisted workflow for rebuilding a CV: capture the **full
reality** of each past job in your native language as raw notes, then refine
it into polished, paste-ready English with a domain-appropriate lens.

These are **templates to copy** — all personal content has been stripped out
and replaced with `[placeholders]` and generic guidance. They are not live
config.

## What's here

| File | Purpose |
| ---- | ------- |
| `CV-RAW.template.md` | The source-of-truth half. Carries the AI-context block (workflow, rules of engagement, language guidance) plus **raw notes per job** in your native language. Verbose, append-only, witness-statement of what actually happened. |
| `CV-POLISHED.template.md` | The output half. Refined English that maps cleanly to a public resume data file, experience bullets, and project case studies. Regenerated from the raw layer on demand; never feeds back into it. |

## How it works

1. **Dump (raw).** Claude asks numbered questions per job; you answer freely
   in your native language. Answers land in `CV-RAW.md`, verbose, preserving
   your exact phrasings.
2. **Review.** Claude presents each block back with `H/P/T` labels so you
   correct by reference ("fix P11 to...", "remove T10").
3. **Refine (polished).** On "refine job X", Claude reads the raw notes plus
   the inline ⚑ polish-tuning flags and writes the matching section in
   `CV-POLISHED.md`. The raw layer is **never** modified during refine.

The hard rule that holds the whole thing together: the raw layer is a record
of what really happened. If a polished claim isn't supported by the raw notes,
you weaken the claim — you never back-fill the raw notes to justify it.

## Using it

1. Copy both files into your own workspace and rename them to `CV-RAW.md` and
   `CV-POLISHED.md`.
2. **Gitignore them.** They hold your career history and (in the raw layer)
   unredacted customer names. Keep them local.
3. Seed the job headings from whatever public resume data you already have,
   then start the Q&A loop.
4. Fill the `[placeholders]` in the context block (your author context,
   native language, anonymisation preference) before the first session.

## A note on which AI you point at it

The raw layer is, by design, the unredacted truth — real employers, real
customer names, real numbers, things you'd anonymise or soften before they
go anywhere public. That's the whole point of keeping it gitignored and
local.

Worth thinking about, then, **what you feed it to.** A locally-run model
(see `ai/local-llm/`) keeps the raw layer on your own hardware. A public /
hosted assistant means handing your full career history — customer names
included — to a third party, subject to whatever their retention and training
terms say on the day. Neither choice is wrong; they're just different trust
boundaries. I'm not going to tell you which to use — just flagging that the
raw file is more sensitive than it looks, so decide deliberately rather than
by default.

The polished layer is anonymised by default and meant to be public, so it's
the safer half to share around.
