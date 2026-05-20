# ai/local-llm/

Local LLM runtimes and model configs — Ollama, vLLM, llama.cpp, and similar.

## Layout

```
local-llm/
├── models/      # Modelfiles, prompts, eval configs (NOT weights)
└── stacks/      # docker-compose / k8s manifests for runtimes (ollama, vllm, …)
```

## Conventions

- **Model weights are never committed.** `.gguf`, `.bin`, `.safetensors`, `.pt`, `.onnx` are gitignored. Pull weights at runtime via Ollama / Hugging Face / mounted PVC.
- **One Modelfile per model variant.** Tag descriptively (`llama3.1-8b-coder.Modelfile`).
- **Stacks are deployable.** If a runtime moves to the cluster, mirror the manifests under `k8s/talos/apps/<runtime>/` and keep `stacks/` as the source of truth for the compose / dev variant.

## Examples of what belongs here

- `models/llama3.1-8b-rag.Modelfile` — an Ollama Modelfile tuned for a project.
- `stacks/ollama/docker-compose.yaml` — local Ollama runtime for development.
- `models/evals/<benchmark>.yaml` — eval harness configs.
