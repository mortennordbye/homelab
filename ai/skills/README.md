# ai/skills/

Claude skills authored in this repo.

## Layout

```
skills/
└── <skill-name>/
    ├── SKILL.md     # frontmatter (name, description) + skill body
    └── assets/      # optional scripts, templates, reference files the skill loads
```

## Conventions

- One folder per skill. Folder name = skill name (kebab-case).
- `SKILL.md` follows the standard Claude skill format (YAML frontmatter + markdown body).
- Anything the skill reads at runtime (templates, JSON specs, shell scripts) goes in `assets/`.
- Skills should be self-contained — no relative paths outside the skill folder.

## Activation

Skills here are source. To make them invocable, copy or symlink the folder into `~/.claude/skills/` (or the project equivalent) so the harness picks them up.
