# ai/projects/

Self-contained AI projects — anything with its own runtime, dependencies, or Dockerfile.

## Layout

```
projects/
└── <project-name>/
    ├── README.md                       # what it is, how to run, env vars
    ├── Dockerfile                      # containerized run is the default
    ├── pyproject.toml | package.json   # language-appropriate deps
    ├── .env.example                    # never commit a real .env
    └── src/                            # source
```

## Conventions

- **Containerize everything.** No native `node`/`python` execution on the laptop — use a Dockerfile or a `make`-wrapped Docker invocation.
- **Secrets stay out of the repo.** Local dev uses `.env` (gitignored); cluster deploys use ExternalSecrets.
- **If deployed, manifests live in `k8s/talos/apps/<project-name>/`** — `ai/projects/<project-name>/` holds the source and image build.
- **One project per folder.** Don't bundle unrelated experiments.

## Examples of what belongs here

- Claude API apps (agents built with the Anthropic SDK, RAG pipelines, chat UIs).
- Local LLM apps that consume runtimes from `../local-llm/`.
- Glue services (webhooks, bots, schedulers) that wrap an AI model.
