# Working principles

Behavioral guidelines to reduce common LLM coding mistakes. Drop into a `CLAUDE.md`, an agent's system prompt, or any project's instructions, and merge with project-specific rules as needed. For a full repo scaffold instead, use `coding.blueprint.md`.

> **Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think before coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them, do not pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity first

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it, do not delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

## 4. Goal-driven execution

**Define success criteria. Loop until verified.**

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

## 5. Comments state constraints, not stories

**A comment states a constraint or a trap, never the story of how a value was reached.**

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

## 6. Track unfinished work in BACKLOG.md

**Defer in writing, not in chat.**

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

## 7. No AI attribution in commits

**Commits and PRs read as the human author's. No AI fingerprint, ever.**

- No `Co-Authored-By` trailer naming Claude or any AI.
- No session links or IDs (e.g. a `Claude-Session:` trailer).
- No "Generated with Claude Code", 🤖 emoji, or similar tool signatures in commit messages, PR descriptions, or issue bodies.
- Describe the change, not the tool that produced it.

## 8. Writing style

**All text follows ASD-STE100 (Simplified Technical English) at about 80 % strictness.**

- Short sentences, one fact or one instruction each. Active voice. Simple verbs.
- One meaning per word. No idioms, no metaphors, no filler.
- Keep code names, error text and quotes exact, even when they break an STE rule.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
