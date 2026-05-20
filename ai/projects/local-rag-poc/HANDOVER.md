# Handover — local-rag-poc

For the next AI / engineer picking this up. Read this first; then `README.md` for usage and `BUILD-JOURNAL.md` for the iteration narrative.

## TL;DR

A 100% local, offline hybrid-retrieval RAG POC for legal contracts and technical docs. Embeddings + chat via LM Studio on `localhost:1234` (OpenAI-compatible API), retrieval = `Chroma` (dense) + `BM25` (sparse) combined 50/50 via `EnsembleRetriever`, strict refusal prompt, interactive REPL. Currently passing 3 of 4 representative queries against the 4-contract fixture set. One known failure mode (document-level context loss in chunks) is documented and deliberately left for the next iteration.

## Current state (as of last session)

| Component | State |
|---|---|
| **Pipeline** | Works end-to-end. `make run` → REPL. `QUESTION="…" make run` → one-shot. |
| **LM Studio bootstrap** | `make lm-setup` is idempotent, downloads via HF fallback when `lms get` hits its case-normalization bug. |
| **Models loaded (default)** | Embedder: `text-embedding-nomic-embed-text-v1.5`. Chat: `llama-3.1-8b-instruct` (Q4_K_M, 4.58 GiB resident). |
| **Corpus** | Four fictional contracts in `contracts/` — FjordTech, Skyfall, Polaris, Havblikk. Distinct on currency, payment terms, error-code namespaces, SLAs, jurisdictions. Generated via `make sample`. Committed via `!contracts/contract_*.pdf` exception in `.gitignore`. |
| **Chroma store** | Persisted at `./local_poc_db` with `.doc_fingerprint` sidecar. Auto-rebuilds when the corpus fingerprint (name + size + mtime) changes. |
| **Prompt** | Strict (no outside knowledge, exact refusal string) but permits cross-source synthesis. Includes a baked-in `Document inventory:` block listing every file in the corpus. |
| **TOP_K** | 6 per retriever. Bumped from 4 in Iteration 13 for broader queries. |
| **Tests / eval** | Manual only. No `make eval`. This is the largest gap — see "Recommended next iteration" below. |

## What just worked, what just failed

Last test session (Iteration 14 in `BUILD-JOURNAL.md`):

| Query | Result | Why |
|---|---|---|
| "which customers do we have" | ✅ all 4 named | Inventory block + retrieval combined as designed |
| "What is the late-payment interest rate in each contract" | ✅ all 4 rates correct | Broad query surfaced one fees chunk per doc |
| "What is the capital of Madagascar?" | ✅ exact refusal | Hallucination ban survived the synthesis loosening |
| "What is the late-payment interest rate for Polaris?" | ❌ refused incorrectly | **Open issue — chunk-context loss** |

## Open issue — chunks lose document-level context

**Symptom.** Query "X for customer Y" refuses or guesses wrong even when the answer is in the corpus, IF the chunk containing the answer doesn't repeat the customer name.

**Root cause.** Customer names appear once on page 0 (the title chunk: "Master Services Agreement — Polaris Energi ASA"). Subsequent chunks ("Undisputed invoices not paid by the due date shall accrue interest at the rate of 11.00% per annum…") never repeat the name. Both retrievers see those late-page chunks as semantically/lexically unrelated to "Polaris", so they aren't retrieved when the query mentions the customer.

**Reproducible.** Run `make run`, ask `What is the late-payment interest rate for Polaris?`. The 11.00% chunk will not be in the retrieved set despite being in the corpus.

**Recommended fix.** Inject document-level context into every chunk during ingestion. Two viable patterns:

1. **Prepend a context line to `page_content`.** In `load_and_chunk()`, extract the customer name from the title chunk (regex on the first chunk's text: `Master Services Agreement — (.+?) \(`) and prepend `[From the Master Services Agreement with <customer>]` to every chunk's `page_content` from that document before they go into Chroma/BM25. Both retrievers then see the customer name on every chunk → "Polaris" matches every Polaris chunk.

2. **Use `Document` metadata and surface it via `document_prompt`.** Extract the customer name as in (1) but store on `metadata["customer"]` instead of mutating content. Update `DOCUMENT_TEMPLATE` to include `{customer}` alongside `{source}`. The model sees the customer name on every chunk, but BM25/Chroma still only retrieve on `page_content` — so this fixes the LLM-side attribution but NOT the retrieval-side miss.

**Recommendation: do (1).** It fixes retrieval AND attribution with a single change. ~20 lines in `load_and_chunk()`. (2) is a partial fix.

**Caveat.** Before implementing (1), set up the eval harness (next section). Without it you don't know whether (1) regresses the queries that currently work.

## Recommended next iteration — eval harness

This is the BACKLOG item that has been pending since Iteration 0 and is now the bottleneck for every further change. Without measurement, fixes are guesses.

**Minimum viable scope.**

1. Create `evals/qa_pairs.jsonl` with 15–25 labelled questions against the 4-fixture corpus. Mix:
   - Single-doc focused (e.g. `q: "Polaris late-payment rate?"`, `expected_contains: ["11.00%"]`).
   - Cross-doc enumeration (e.g. `q: "list each customer with their currency"`, `expected_contains: ["FjordTech", "NOK", "Skyfall", "EUR", "Polaris", "NOK", "Havblikk", "USD"]`).
   - Cross-doc comparison (e.g. `q: "which contract has the strictest SLA?"`, `expected_contains: ["Polaris", "99.95"]`).
   - Out-of-corpus refusals (e.g. `q: "capital of Madagascar?"`, `expected_exact: "I do not have enough information in the provided documents to answer this."`).
2. Add `evals/run_eval.py` that loops the QA pairs through the existing `qa` chain and scores hits.
3. Add `make eval` target. Print per-question pass/fail and overall score.
4. Run on the current state to establish a baseline. Save the baseline as a comment in the eval script.
5. Then implement the chunk-context fix above. Re-run. Confirm score went up, not down.

**Avoid scope creep.** Don't reach for LLM-as-judge or precision@k in the first cut. Substring/regex matching against `expected_contains` is enough to detect regressions and progress.

**Where it lives.** `ai/projects/local-rag-poc/evals/`. Update BACKLOG.md when delivered.

## BACKLOG snapshot (priority order)

1. **Eval harness** (above). Blocks everything else from being measurable.
2. **Chunk-context fix.** Resolves Iteration 14 Query 4. Cheap once eval exists.
3. **Larger-model A/B.** `gpt-oss-20b` is already on disk — `setup-lmstudio.sh` has the swap-in instructions at the top. Likely fixes some "too literal" failures without prompt acrobatics. One-line config swap once eval exists.
4. **Real-document corpus.** Fixtures are deliberately distinct; real corpora are more uniform → harder retrieval. Eval would surface this immediately.
5. **Streaming responses / web UI / FastAPI wrapper.** None of this is in scope until quality is measured.
6. **Cluster deployment.** If/when this graduates: manifests under `k8s/talos/apps/local-rag/`, LM Studio dependency replaced by an in-cluster runtime (Ollama or vLLM under `ai/local-llm/stacks/`). See repo `CLAUDE.md` for cluster conventions.

## File map (operational)

| File | Purpose | Touch when |
|---|---|---|
| `main.py` | Pipeline + REPL. Heavily commented. | Changing retrieval, chunking, prompt, or interaction. |
| `requirements.txt` | Pinned LangChain stack. Pin the leaves you import; let the resolver pick transitives. | Adding a new langchain-* package. |
| `Dockerfile` | `python:3.12-slim` + reqs + `main.py`. | New system deps, base image bump. |
| `Makefile` | All commands. | New workflow target. |
| `setup-lmstudio.sh` | Declarative LM Studio bootstrap. 3-tier download fallback. | Swapping models, adding a new runtime. |
| `scripts/generate-samples.py` | Reportlab generator. `VARIANT` dataclass at top is the source of truth. | Adding/editing fixture contracts. |
| `contracts/contract_*.pdf` | Committed fixtures. | Regenerate via `make sample` after editing the generator. |
| `.env.example` | All env knobs. Copy to `.env` for local overrides. | New env-tunable. |
| `.gitignore` | Tight scoping — `!contracts/contract_*.pdf` exception only. | Adding new tracked files in normally-ignored locations. |
| `README.md` | User-facing docs. | User-visible behaviour or workflow change. |
| `BUILD-JOURNAL.md` | Iteration narrative — blog material. | Major iteration completes; add new section, don't rewrite. |
| `HANDOVER.md` (this file) | Operational handoff. | After a significant change — update "Current state" and "Open issue" sections. Don't grow other sections unless the project's shape changes. |

## Conventions to follow

- **Containerize everything runnable.** No native pip/node on the laptop. `make` targets wrap Docker.
- **LM Studio runs natively on the host.** Container reaches it via `host.docker.internal:1234`. This is the one documented exception to the containerize rule.
- **Heavily comment the WHY, not the WHAT.** Comments in `main.py` and `setup-lmstudio.sh` should explain *why* a particular flag or call exists, especially when it's a workaround. Don't restate code.
- **Idempotent setup.** Every step in `setup-lmstudio.sh` checks before doing. Re-running must be a no-op. Same for any future eval/ingestion scripts.
- **Pin leaves, not transitives.** See `requirements.txt` lessons (Iter 5 in journal). When pip resolves a conflict, prefer dropping the over-pin to forcing the version.
- **Strict prompt clauses are load-bearing.** Don't loosen the "no outside knowledge" / "exact refusal string" parts. The synthesis permission added in Iter 12 is the one degree of freedom; everything else stays strict.
- **Match repo style.** This project lives in a Homelab repo with a `CLAUDE.md` at root. Read it before making structural changes (kubernetes manifests, secrets, GitOps assumptions).

## Common pitfalls (and the journal section that explains them)

- **`lms get` 404s on mixed-case HF paths.** Not your typo — known CLI bug. The script's tier-3 HF curl fallback handles it. *(Journal: Iteration 4.)*
- **Pip resolver conflicts on pinned langchain-* versions.** Don't pin transitives. *(Journal: Iteration 5.)*
- **Refusal happens even when the answer is in the retrieved chunks.** Likely the prompt forbidding synthesis, or `RetrievalQA` stripping `source` metadata. Both fixed in Iter 12 — don't reintroduce. *(Journal: Iteration 12.)*
- **Cross-document targeted queries fail despite the answer being in the corpus.** Document-level context loss — the chunk doesn't repeat the customer name. *(Journal: Iteration 14, also "Open issue" above.)*
- **Editing `main.py` while a `make run` is in flight.** The Docker run mounts the source folder; the script runs once and exits. Edits don't hot-reload — re-run.

## Pointers

- **`README.md`** — user-facing usage, model recommendations, run modes, example questions.
- **`BUILD-JOURNAL.md`** — chronological narrative of every iteration with what-we-saw / why / what-we-did / takeaway. Blog material.
- **`BACKLOG.md`** (repo root, not this folder) — cross-project deferred work; the `AI / RAG POC` section refers to the eval harness item.
- **`CLAUDE.md`** (repo root) — repo-wide guidelines: containerization, GitOps, manifest conventions, secrets via ExternalSecrets.
- **`/Users/morten.victor.nordbye/.claude/projects/-Users-morten-victor-nordbye-Documents-github-Homelab/memory/`** — persistent memory across sessions. Includes preferences like "no native node tooling" and "screenshots → .screenshots/".

## How to verify the handover before starting work

1. `make lm-setup` → both models reload cleanly, server up, `/v1/models` reports both.
2. `make run` → corpus loads, REPL appears, ask `which customers do we have` → expect all 4 named.
3. Ask `What is the late-payment interest rate for Polaris?` → **expect failure** (refusal). If this now works, someone fixed the open issue and this handover is stale — update it.
4. Ask `What is the capital of Madagascar?` → exact refusal string.

If 1–4 match the descriptions above, the handover is current and you're ready to pick up.
