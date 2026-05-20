# ai/agents/

Claude Code subagents authored in this repo.

## Layout

```
agents/
└── <agent-name>/
    ├── agent.md     # frontmatter (name, description, tools, model) + system prompt
    └── README.md    # what it does, when to use it, example invocations
```

## Conventions

- One folder per agent. Folder name = agent name (kebab-case).
- `agent.md` is the portable definition. It should be copy-paste-able into `.claude/agents/` or another project.
- `README.md` documents intent for humans: trigger conditions, inputs/outputs, things it deliberately won't do.

## Relationship to `.claude/agents/`

`.claude/agents/` is the live, checkout-local set of agents Claude Code loads. `ai/agents/` is the authored source — promote here when an agent stabilizes, symlink or copy into `.claude/agents/` to activate it.
