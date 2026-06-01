# ai/blueprints/

Reusable scaffolds for bootstrapping AI-tooling config in a new project — copy one out, fill in the placeholders, done.

## Layout

```
blueprints/
└── <name>.blueprint.md
```

## Contents

| File                   | Purpose                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `generic.blueprint.md` | Principles only — the 5 working principles (Think / Simplicity / Surgical / Goal-driven / BACKLOG). Drop into any `CLAUDE.md`, agent prompt, or project instructions and merge. |
| `coding.blueprint.md`  | Full `CLAUDE.md` for a new code repo — the generic principles + a built-in security baseline + `<!-- TODO -->` placeholders for Development, Architecture, project-specific safety rules, and the rest. |

**Which one?** Reach for `coding.blueprint.md` when starting a repo from scratch — it's the complete file. Reach for `generic.blueprint.md` when you only want the behavioral principles to layer onto something that already exists (or a non-repo context).

## Conventions

- One blueprint per file. Filename = `<name>.blueprint.md`.
- A blueprint is a *template to copy*, not live config — it stays generic. The project-agnostic sections ship as-is; everything else is a `<!-- TODO -->` placeholder.
- To use one: copy it into the target repo under its real name (e.g. `coding.blueprint.md` → `CLAUDE.md`), fill the placeholders, delete the blueprint note at the top.
- The principles in `generic.blueprint.md` are mirrored inside `coding.blueprint.md` so each file stays self-contained — edit both if you change the wording.
