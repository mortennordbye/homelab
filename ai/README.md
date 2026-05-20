# ai/

AI-related work that lives inside the Homelab repo: Claude Code primitives, self-contained AI projects, local LLM runtimes, and the prompts/notes that support them.

## Layout

| Subtree      | Purpose                                                                            |
| ------------ | ---------------------------------------------------------------------------------- |
| `agents/`    | Claude Code subagents (reusable agent definitions, one folder per agent)           |
| `skills/`    | Claude skills in `SKILL.md` format (with optional `assets/` scripts and templates) |
| `projects/`  | Self-contained AI experiments and apps (FastAPI services, RAG pipelines, bots…)    |
| `local-llm/` | Ollama / vLLM / llama.cpp — Modelfiles, eval configs, runtime stacks               |
| `prompts/`   | Reusable prompt library that spans projects                                        |
| `notes/`     | Research notes, benchmarks, decision records                                       |

## Conventions

- **Every leaf has a `README.md`** stating what it is and how to run/invoke it.
- **No model weights committed.** `.gguf`, `.bin`, `.safetensors` and friends are gitignored under `ai/local-llm/`.
- **Containerize everything runnable.** Match the rest of the repo — no native `node`/`python` execution on the laptop; use Docker or `make` targets.
- **Secrets via ExternalSecrets** if a project is deployed to the cluster. Otherwise `.env.example` only — never commit a real `.env`.
- **Project names are kebab-case** and descriptive (`claude-pr-reviewer`, not `bot1`).

## Relationship to the rest of the repo

- Deployed AI workloads land in `k8s/talos/apps/<name>/` like any other app; `ai/projects/<name>/` holds the source and Dockerfile.
- Claude Code agents that are global to this checkout already live under `.claude/agents/`. `ai/agents/` is for agents authored *here* that may be promoted or shared elsewhere.
