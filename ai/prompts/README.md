# ai/prompts/

Reusable prompt library — prompts that span projects or are worth saving on their own.

## Layout

Flat by default; group by topic only when a folder has 3+ related prompts.

```
prompts/
├── <topic>.md
└── <topic>/
    ├── <variant-a>.md
    └── <variant-b>.md
```

## Conventions

- One prompt per file. Filename = kebab-case description.
- Each prompt starts with a short header: **purpose**, **inputs**, **expected output**.
- Note the model the prompt was tuned for (e.g. `claude-opus-4-7`, `llama3.1-8b`). Prompts don't transfer perfectly across families.
- If a prompt belongs to one project only, keep it inside that project instead of here.
