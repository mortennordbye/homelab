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
| **Tests / eval** | `make eval`: document-level precision@k on 20 labelled questions plus 4 refusals (`evals/`). BM25 baseline mean P@6 = 0.500. Vector and hybrid baselines need LM Studio. |

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

**Caveat.** Run `make eval` for each `MODE` before and after (1). The single-document questions name the customer, so a working fix raises their precision.

## Pointers

- **`README.md`** — user-facing usage, model recommendations, run modes, example questions.
- **`BUILD-JOURNAL.md`** — chronological narrative of every iteration with what-we-saw / why / what-we-did / takeaway. Blog material.
- **`docs/backlog/README.md`** (the repo-wide backlog, not this folder) — cross-project deferred work.
- **`CLAUDE.md`** (repo root) — repo-wide guidelines: containerization, GitOps, manifest conventions, secrets via ExternalSecrets.
- **`/Users/morten.victor.nordbye/.claude/projects/-Users-morten-victor-nordbye-Documents-github-Homelab/memory/`** — persistent memory across sessions. Includes preferences like "no native node tooling" and "screenshots → .screenshots/".

## How to verify the handover before starting work

1. `make lm-setup` → both models reload cleanly, server up, `/v1/models` reports both.
2. `make run` → corpus loads, REPL appears, ask `which customers do we have` → expect all 4 named.
3. Ask `What is the late-payment interest rate for Polaris?` → **expect failure** (refusal). If this now works, someone fixed the open issue and this handover is stale — update it.
4. Ask `What is the capital of Madagascar?` → exact refusal string.

If 1–4 match the descriptions above, the handover is current and you're ready to pick up.
