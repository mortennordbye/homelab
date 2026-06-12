# ai/blueprints/

Reusable scaffolds for bootstrapping AI tooling in a new project — copy one out, fill in the placeholders, done.

## Layout

```
blueprints/
└── <name>/                  # one subfolder per blueprint, each with its own README
    └── ...
```

## Contents

| Blueprint | Purpose |
| --------- | ------- |
| `claude-md/`   | `CLAUDE.md` scaffolds for a new project — a principles-only `generic` variant and a full-repo `coding` variant. |
| `cv-workflow/` | Multi-file scaffold for an AI-assisted CV rebuild — a raw-notes layer (native language, witness-statement) plus a polished English output layer. |

Open each subfolder's `README.md` for what it is and how to use it.

## Conventions

- One blueprint per subfolder. Each subfolder carries its own `README.md`.
- A blueprint is a *template to copy*, not live config — it stays generic. Project-agnostic sections ship as-is; everything else is a placeholder.
- To use one: copy the file(s) into the target context under their real names, fill the placeholders, and delete the blueprint note at the top.
