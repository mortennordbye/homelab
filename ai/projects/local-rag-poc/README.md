# local-rag-poc

A 100% local, offline RAG Proof of Concept for querying legal contracts and technical documentation on Apple Silicon. Embeddings and the chat model are served by **LM Studio** on `localhost:1234` via its OpenAI-compatible API. Retrieval is **hybrid** — dense (Chroma) + sparse (BM25), combined 50/50 via LangChain's `EnsembleRetriever`. The prompt is locked down to refuse out-of-corpus answers.

## Honest critique of this stack

Before you run this, know what you're trading off vs. managed services (OpenAI + Pinecone):

- **Quality ceiling.** A 7B–13B GGUF model in LM Studio is materially weaker than `gpt-4`-class models at multi-step legal reasoning, citation tracing, and edge-case extraction in technical specs. Expect more "I do not have enough information…" refusals and more shallow answers than a managed model would produce on the same chunks.
- **Throughput.** LM Studio is single-process. One query at a time. Indexing a few thousand documents will take hours, not minutes.
- **Operational toil.** You own GGUF quant selection, RAM/GPU pressure, Chroma persistence corruption, and BM25 index rebuilds on every cold start (BM25 is in-memory, not persisted). Managed services hide all of this.
- **Hybrid retrieval isn't free.** A 50/50 ensemble is a guess. Without an eval harness you can't tell whether BM25 helps or hurts on your specific corpus.
- **No observability.** No usage metrics, no eval scores, no drift detection. You'll add this yourself.

## Why local is still the right call here

- **Data sovereignty.** Legal contracts and internal technical docs often can't legally leave the machine. Many NDAs and data-processor agreements explicitly forbid third-party inference providers — uploading a contract to OpenAI to ask about its termination clause can itself breach the contract.
- **Zero marginal cost.** Free iteration on chunking strategy, prompt design, and retrieval weights without watching a meter.
- **Air-gapped.** Survives network loss, vendor outages, model deprecations, and ToS shifts.
- **POC, not production.** Validating the pipeline shape on a laptop now is the right derisking step before any cloud commitment.

## Pre-requisites

1. **LM Studio** installed and running. Open the **Developer / Local Server** tab.
2. **One embedding model + one chat model loaded** — exact recommendations in the next section.
3. **Server started** on port `1234` (the LM Studio default).
4. **A PDF or DOCX dropped in this folder.** Default filename: `sample_contract.pdf`. If absent the script picks the first `*.pdf` or `*.docx` in the folder.

## LM Studio models — what to load and why

You need **two** models loaded at the same time in LM Studio: one for embeddings, one for chat. Search names below are what LM Studio's built-in model browser uses (it pulls GGUFs from Hugging Face under the hood).

### Embedding model

| Field | Value |
|---|---|
| **Recommended model** | `nomic-ai/nomic-embed-text-v1.5-GGUF` |
| **Search in LM Studio** | `nomic-embed-text` |
| **Quant to pick** | `Q4_K_M` (≈ 90 MB) — quality at this size barely improves above Q4 |
| **Identifier reported by LM Studio** | `text-embedding-nomic-embed-text-v1.5` |
| **Why this one** | Open-weights, MIT/Apache-friendly licence, 768-dim, 8k context, runs in tens of milliseconds per chunk on Apple Silicon. The de-facto default for local RAG and what LM Studio's own docs use in their RAG examples. |

This is the identifier the script uses by default (`EMBED_MODEL` in `main.py` / `.env.example`). If you load a different embedder, set `EMBED_MODEL` to whatever LM Studio reports for it on the **Developer** tab — the name shown next to the loaded model is what the OpenAI-compatible API will accept.

**Alternatives** (if you want to experiment):
- `BAAI/bge-small-en-v1.5-GGUF` — slightly higher quality on MTEB, 384-dim (smaller index), but rebuilds the Chroma store if you switch (dimensionality mismatch).
- `mixedbread-ai/mxbai-embed-large-v1-GGUF` — 1024-dim, noticeably better recall on long contracts, ~670 MB. Switch only if you've outgrown nomic.

### Chat model

| Field | Value |
|---|---|
| **Default model** | `lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF` |
| **Search in LM Studio** | `Llama 3.1 8B Instruct` |
| **Quant to pick** | `Q4_K_M` (~4.9 GB) — good quality/RAM trade-off |
| **Identifier reported by LM Studio** | `llama-3.1-8b-instruct` |
| **Why this default** | Solid general-purpose instruction-following, 128k context (plenty for 4 × 800-char chunks), permissive licence, well-supported by LM Studio. A safe baseline before comparing to bigger models. |

Set `CHAT_MODEL` in `.env` to the exact identifier LM Studio shows on the Developer tab for the loaded chat model.

**Stronger alternatives** (swap by editing `CHAT_MATCH`/`CHAT_REPO`/`CHAT_ID` at the top of `setup-lmstudio.sh` and re-running `make lm-setup`):
- **Strongest reasoning, Apple-Silicon native:** `mlx-community/gpt-oss-20b` (MXFP4 MLX, ~12 GB). Reasoning + tool-use, OpenAI-aligned chat format that pairs naturally with the strict refusal prompt. Recommended chat upgrade if you have the RAM.
- **General-purpose middle ground:** `mlabonne/gemma-3-12b-it-abliterated` (Q4_K_M, ~7.3 GB). Solid quality; "abliterated" removes safety refusals which can conflict with the deliberate refusal prompt — only switch if you've validated the behaviour.
- **Code / technical docs:** `lmstudio-community/qwen3-coder-30b` (4-bit, ~17 GB). Strong on RFC-style content, error-code tables, API examples. Heavier RAM footprint.
- **Lightweight fallback (16 GB Macs):** `google/gemma-3-4b` (4-bit, ~3 GB). Headroom-friendly but quality drop on multi-clause reasoning.

### Declarative setup (recommended)

Skip the GUI entirely. LM Studio ships a CLI (`lms`) that this project drives from `setup-lmstudio.sh`. The script is **idempotent**: it downloads each model only if it's missing, loads each only if it isn't already loaded, and starts the server only if it isn't already up.

**One-time:** install the `lms` CLI after installing LM Studio:

```bash
~/.lmstudio/bin/lms bootstrap
# restart your shell
```

**Every time you want the stack ready:**

```bash
make lm-setup
```

That single command brings the local server to a known-good state with the two recommended models loaded under stable API identifiers. The model spec lives in `setup-lmstudio.sh` (top of the file) — change those four variables to swap models and re-run.

Other Makefile targets:
- `make lm-status` — show loaded models, server status, and `/v1/models` output.
- `make lm-stop` — stop the local server (keeps the downloaded weights on disk).

### Manual setup (if you'd rather use the GUI)

LM Studio's **Developer** tab lets you load multiple models simultaneously — the OpenAI-compatible server routes requests by the `model` field. Load both the embedder and the chat model, then **Start Server**.

If you're tight on RAM and can only load one at a time: load the embedder first, run the script once (this populates `./local_poc_db`), then swap in the chat model and re-run. The script detects the existing Chroma store and skips re-embedding — the second run only needs the chat model.

### Confirming the identifiers

The Developer tab shows each loaded model's API identifier; copy that string into your `.env`:

```env
EMBED_MODEL=text-embedding-nomic-embed-text-v1.5
CHAT_MODEL=llama-3.1-8b-instruct
```

Sanity-check from a terminal:

```bash
curl http://localhost:1234/v1/models | jq '.data[].id'
```

Both identifiers should appear. If they don't, the script will fail on its first request with a clear "model not found" error.

## Running it

### Docker (primary path — matches the repo's containerize-everything rule)

```bash
cd ai/projects/local-rag-poc
# (optional) regenerate the four fictional contract fixtures — they ship in
# the repo already, so you only need this if you edit the generator
make sample
# add your own .pdf or .docx alongside the fixtures if you like
make run
```

The four `contracts/contract_<slug>.pdf` fixtures (FjordTech / Skyfall / Polaris / Havblikk) are committed to the repo, so cloning + `make run` works without extra setup. The loader walks `contracts/` for `*.pdf` and `*.docx`, so dropping your own documents in there picks them up automatically (and `.gitignore` keeps them local).

Override the corpus directory at runtime with `DOC_DIR`:

```bash
DOC_DIR=./my-docs make run
```

The Makefile builds a `python:3.12-slim` image, mounts this folder, and points the container at LM Studio on the host via `host.docker.internal:1234`.

Other targets:
- `make shell` — interactive bash inside the container (poke at chunks, try alt queries).
- `make clean` — removes `local_poc_db/`, `__pycache__/`, and the local image.

### venv fallback

If you'd rather skip Docker for a quick test:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

In venv mode, leave `LM_STUDIO_BASE_URL` at the default (`http://localhost:1234/v1`).

## Asking questions

`make run` drops you into an interactive REPL after the load/chunk/embed steps finish:

```
================================================================================
 Ask questions about the loaded document. Type 'exit' (or Ctrl-D) to quit.
 Example: What are the specific payment terms or error codes mentioned?
================================================================================

> What is the late-payment interest rate?
Question: What is the late-payment interest rate?

Answer:
The late-payment interest rate is 9.25% per annum, …
Sources (4 chunks used):
…
```

Each question reuses the already-built Chroma store and BM25 index — only the LLM call hits LM Studio. Type `exit`, `quit`, `q`, or hit Ctrl-D to leave.

For scripting / CI you can skip the REPL entirely with the `QUESTION` env var:

```bash
QUESTION="What is the late-payment interest rate?" make run
```

That runs one query and exits, with the same output format.

## Verifying the pipeline

A few quick sanity checks against the four committed fixtures:

1. **Single-document recall.** `What is the late-payment interest rate for FjordTech?` → 9.25% p.a. `…for Polaris?` → 11.00% p.a. `…for Skyfall?` → 8.50% p.a.
2. **Cross-document inventory.** `Which customers have contracts with the provider?` → FjordTech Industri, Skyfall Logistikk, Polaris Energi, Havblikk Marin.
3. **Comparative.** `Which customer has the strictest availability SLA?` → Polaris (99.95%). `Which agreement uses USD?` → Havblikk.
4. **Error codes by namespace.** `What ERR-xxxx codes exist?` → FjordTech's eight. `What OPS-xxxx codes?` → Polaris's seven.
5. **Refusal.** `What is the capital of Madagascar?` → the exact refusal string `I do not have enough information in the provided documents to answer this.` If you get "Antananarivo", the prompt is leaking.
6. **Persistence + rebuild.** Re-run with the same fixtures: startup line says `Reusing existing Chroma store at ./local_poc_db (fingerprint match)` and skips embedding. Add or remove a document, re-run: startup line changes to `Document set changed — rebuilding Chroma store at ./local_poc_db` and re-embeds.

## What's deliberately out of scope (see `BACKLOG.md`)

- Eval harness with a labelled QA set and a `make eval` target.
- Multi-document corpus loader (walks a directory instead of one file).
- Streaming responses, web UI, FastAPI wrapper.
- Cluster deployment — if this graduates, manifests land in `k8s/talos/apps/local-rag/` and LM Studio is replaced by an in-cluster runtime (Ollama or vLLM under `ai/local-llm/stacks/`).

## File map

| File | Purpose |
|---|---|
| `main.py` | The sequential pipeline (load → chunk → ensemble → QA → query). Heavily commented. |
| `requirements.txt` | Pinned LangChain + Chroma + BM25 + parsers. |
| `Dockerfile` | `python:3.12-slim` image used by the Makefile. |
| `Makefile` | `make run`, `make shell`, `make clean`, plus `make lm-setup` / `lm-status` / `lm-stop`. |
| `setup-lmstudio.sh` | Declarative LM Studio bootstrap — downloads, loads, and serves the two required models. Idempotent. |
| `scripts/generate-samples.py` | reportlab-based generator that writes one PDF per `VARIANT` into `contracts/` (currently four fictional Norwegian Master Services Agreements with deliberately distinct payment terms, error-code namespaces, SLAs, and jurisdictions). |
| `contracts/contract_*.pdf` | The generated fixtures themselves — ship with the repo via the `!contracts/contract_*.pdf` exception in `.gitignore`. Drop your own `.pdf`/`.docx` next to them; they'll be picked up by the loader but stay out of git. |
| `BUILD-JOURNAL.md` | Chronological log of what we tried, what we saw, and what we did about it while building this POC. Raw material for a blog post — preserved warts-and-all. |
| `HANDOVER.md` | Operational handoff for the next AI / engineer picking this up. Current state, known failure modes, prioritized next steps, conventions. Read before making changes. |
| `.env.example` | All env knobs the script honors. |
| `.gitignore` | Keeps `local_poc_db/`, documents, and `.env` out of git. |
