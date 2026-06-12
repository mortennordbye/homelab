# claude-md blueprint

Copy-and-fill `CLAUDE.md` scaffolds for a new project. Two variants, both
templates to copy rather than live config.

## What's here

| File | Purpose |
| ---- | ------- |
| `generic.blueprint.md` | Principles only — the 5 working principles (Think / Simplicity / Surgical / Goal-driven / BACKLOG). Drop into any `CLAUDE.md`, agent prompt, or project instructions and merge. |
| `coding.blueprint.md`  | Full `CLAUDE.md` for a new code repo — the generic principles + a built-in security baseline + `<!-- TODO -->` placeholders for Development, Architecture, project-specific safety rules, and the rest. |

**Which one?** Reach for `coding.blueprint.md` when starting a repo from
scratch — it's the complete file. Reach for `generic.blueprint.md` when you
only want the behavioral principles to layer onto something that already
exists (or a non-repo context).

## Using it

Copy the file into the target repo under its real name (e.g.
`coding.blueprint.md` → `CLAUDE.md`), fill the `<!-- TODO -->` placeholders,
and delete the blueprint note at the top.

The principles in `generic.blueprint.md` are mirrored inside
`coding.blueprint.md` so each file stays self-contained — edit both if you
change the wording.
