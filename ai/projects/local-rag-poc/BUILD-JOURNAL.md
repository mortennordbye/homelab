# Build journal — local hybrid-retrieval RAG POC

A chronological record of what we tried, what we saw, and what we did about it while building this POC. Intended as raw material for a blog post — observations preserved warts-and-all, not polished retrospective narrative. Each iteration follows the same shape:

> **What we saw** — the observable evidence.
> **Why it happened** — the root cause we identified.
> **What we did** — the change.
> **What it taught us** — the takeaway worth surfacing in the blog.

---

## Iteration 0 — Honest pushback before writing any code

**Context.** Brief was to build a 100% local RAG POC for legal contracts + technical docs using LM Studio + LangChain + Chroma + BM25 + EnsembleRetriever. Before writing a single line, articulated the realistic downsides of the chosen stack vs. a managed alternative (OpenAI + Pinecone), then acknowledged why local was still the right call.

**What we said about the downsides.**
- Quality ceiling: a 7B–13B GGUF model is materially weaker than `gpt-4`-class on multi-step legal reasoning and citation tracing. The strict refusal prompt makes shallowness more visible because the model can't paper over weak retrieval with general knowledge.
- Throughput: LM Studio is single-process. One query at a time. Indexing a thousand docs is hours, not minutes. No batched embeddings at managed-service throughput.
- Operational toil: you own GGUF quant selection, RAM/GPU pressure, Chroma persistence corruption, and BM25 index rebuilds on every cold start (BM25 is in-memory).
- Ensemble retrieval isn't free: a 50/50 weight is a guess; without an eval harness you can't tell whether BM25 helps or hurts on your specific corpus.
- No observability: no usage metrics, no eval scores, no drift detection. You add it yourself.

**Why local is still correct for this brief.**
- Legal contracts and internal technical docs are precisely the corpus type where data sovereignty is non-negotiable. Many NDAs and DPAs explicitly forbid third-party inference. Uploading a contract to OpenAI to ask about its termination clause can itself breach the contract.
- Zero marginal cost → freedom to iterate on chunking strategy, prompt design, and retrieval weights without watching a meter.
- Air-gapped operation survives network loss, vendor outages, ToS changes, and model deprecations.
- It's a POC, not production. Validating the pipeline shape on a laptop now is the right derisking step.

**What it taught us.** Holding both opinions at once ("this stack has real downsides AND it's the right call here") is a stronger position than either pure cheerleading or pure skepticism. The pushback content survives into the project — banner on every run + critique section in the README — so the trade-off is visible to anyone who clones the repo, not just buried in chat.

---

## Iteration 1 — Scaffolding the `ai/` tree

**What we did first.** Before the POC itself, created a top-level `ai/` directory at the repo root with empty subtrees + READMEs: `agents/`, `skills/`, `projects/`, `local-llm/`, `prompts/`, `notes/`. The POC then landed under `ai/projects/local-rag-poc/`.

**Why up-front.** Cheap to do empty, expensive to retrofit. Putting the home in place before the resident arrived meant the project folder structure was a non-decision when the actual coding started.

**Repo-level changes alongside.**
- `.gitignore` patterns for `*.gguf`, `*.bin`, `*.safetensors`, `*.pt`, `*.onnx` under `ai/local-llm/` (so model weights don't leak into commits).
- Root `README.md` updated with `ai/` in the repo structure tree.

**What it taught us.** Skeleton-first beats inline-folder-creation. When the actual project arrives, it slots into a documented place.

---

## Iteration 2 — The Python pipeline, first cut

**Goal.** Implement the brief literally: `find_document` → `load_and_chunk` → `Chroma + BM25 → EnsembleRetriever (50/50)` → `RetrievalQA` with strict prompt → run one test query → print answer + sources.

**Design choices.**
- `langchain-chroma` instead of the deprecated `langchain_community.vectorstores.Chroma`. Same class behind the scenes; the brief said "Use `Chroma`" and the maintained import path is what `langchain-chroma` exposes.
- `RetrievalQA.from_chain_type(chain_type="stuff", return_source_documents=True)` rather than `create_retrieval_chain`. The newer API works fine but adds boilerplate; for a POC the older one is shorter and supports `return_source_documents=True` as a one-liner.
- `temperature=0.0` on `ChatOpenAI`. Greedy decoding when the entire point is "don't invent things".
- `OpenAIEmbeddings(check_embedding_ctx_length=False)` — the OpenAI SDK refuses to embed when it can't find the model in its internal tokenizer map; LM Studio reports models the SDK doesn't recognise. Disabling the check is required for any non-OpenAI server.

**What it taught us.** Per-line decisions that *seem* trivial in a quickstart blog post ("just use OpenAIEmbeddings") have flags you only learn about by hitting the error. Document them inline.

---

## Iteration 3 — Containerise vs. native venv

**Tension.** Repo convention is "containerize everything runnable" (no native pip/node on the laptop). LM Studio, however, runs natively on macOS — there's no Linux container of LM Studio. So the container can't host LM Studio; it has to *reach* it.

**Resolution.** Docker for the Python pipeline (matches repo convention), `host.docker.internal:1234` to reach LM Studio on the host (Docker Desktop for Mac sets that up automatically). Provided both a Dockerfile + `make run` target (primary) and a venv recipe (documented fallback).

**What it taught us.** A "containerize everything" rule has a sensible exception when the dependency is itself host-bound. The honest move is to document the exception in the README, not pretend the rule holds.

---

## Iteration 4 — Declarative LM Studio bootstrap

**Problem.** Telling someone "open LM Studio, click Discover, search for X, download Y, click Load" is documentation rot waiting to happen. Wanted a single command that brings LM Studio to a known-good state.

**First cut.** Wrote `setup-lmstudio.sh` driving the `lms` CLI:
1. `lms ls` to check if model is already downloaded.
2. `lms get <hf-repo>` if missing.
3. `lms load <repo> --identifier <stable-id>` so the API ID is stable across hosts.
4. `lms server start --port 1234`.
5. `curl /v1/models` to verify.

Added `make lm-setup` / `lm-status` / `lm-stop` targets.

**What we saw on first run.**

```
[lm-setup] Downloading embedding model (nomic-ai/nomic-embed-text-v1.5-GGUF, Q4_K_M)…
   ⠇ nomic-ai/nomic-embed-text-v1.5-gguf - Resolving...
Error: Failed to resolve artifact "nomic-ai/nomic-embed-text-v1.5-gguf": The artifact does not exist or you do not have permission to read it
```

The CLI lowercased `-GGUF` to `-gguf` before resolving. Hugging Face is case-sensitive. The user's Discover panel screenshot confirmed: the actual HF repo *is* `nomic-ai/nomic-embed-text-v1.5-GGUF`, capital `GGUF`. The CLI's normalization is the bug, not the repo name.

**Why it happened.** `lms get` normalizes the path. HF doesn't. Two systems with different case rules meeting at a string boundary.

**First fix attempt.** Switched to `lmstudio-community/...` repos thinking they'd be lowercase-friendly. Same case-normalization issue, same 404.

**Second fix attempt.** Improved the "already downloaded?" grep to use case-insensitive `fgrep` substring matching — so models the user already had via the GUI are detected reliably even with case mismatches in `lms ls` output. Added a clear "open the GUI and click Download" error message if `lms get` fails.

**Third fix — actually solved it.** Added a Hugging Face direct-download fallback. The script now queries `https://huggingface.co/api/models/<repo>/tree/main` (public, no auth) to discover the exact `.gguf` filename matching the desired quant, then `curl -L --progress-bar` streams the file into `~/.lmstudio/models/<repo>/<file>.gguf` — the same directory layout LM Studio uses internally. After the file lands there, `lms ls` picks it up and `lms load` works.

This routes around the broken case-handling entirely.

**What it taught us.**
- The "official" CLI for a vendor isn't always the most reliable path. When the CLI has a known bug, going one layer down (the underlying HTTP API the GUI calls) is often the better answer.
- Build the bypass as a fallback, not a replacement — keep trying the official path first so the script benefits when the bug is eventually fixed.
- Idempotency matters: every step in `setup-lmstudio.sh` checks "has this already been done?" before doing it. Re-running is a no-op. Crucial for a "type one command and have a working state" promise.

---

## Iteration 5 — Pip dependency resolver disagreements

**What we saw.**

```
ERROR: Cannot install langchain==0.3.27 and langchain-text-splitters==0.3.8 because these package versions have conflicting dependencies.
The conflict is caused by:
    The user requested langchain-text-splitters==0.3.8
    langchain 0.3.27 depends on langchain-text-splitters<1.0.0 and >=0.3.9
```

Then on the next run:

```
ERROR: Cannot install langchain-chroma==0.2.4 and chromadb==0.5.23 because these package versions have conflicting dependencies.
    The user requested chromadb==0.5.23
    langchain-chroma 0.2.4 depends on chromadb>=1.0.9
```

**Why it happened.** Over-pinning. I'd written exact `==` versions for every dependency including transitives, based on a snapshot of "latest stable" that wasn't internally consistent. `langchain-text-splitters` is a transitive dep of `langchain`; pinning it independently is asking for the kind of conflict pip just surfaced.

**What we did.**
- Bumped `langchain-text-splitters` to 0.3.9 (the minimum `langchain==0.3.27` requires).
- Removed the explicit `chromadb==0.5.23` pin entirely — `langchain-chroma` pulls in a compatible chromadb transitively, and that's a better source of truth than my hand-picked version.

**What it taught us.** For libraries with a fan-out of split packages (`langchain`, `langchain-community`, `langchain-openai`, `langchain-chroma`, `langchain-text-splitters`), pin the leaf you actually import and let the resolver pick transitives. Over-pinning trades the perceived reliability of "exact versions" for the actual unreliability of "untested combinations". The pip resolver is the source of truth, not my mental model of compatibility.

---

## Iteration 6 — Model selection and the gpt-oss-20b detour

**Context.** Original recommendation in the docs/scripts was Meta-Llama-3.1-8B-Instruct (Q4_K_M, ~4.9 GB) as a generic baseline. User showed their LM Studio "My Models" view — they already had four other models locally including `mlx-community/gpt-oss-20b` (MXFP4 MLX, ~12 GB), pinned.

**What we did.**
1. Swapped the script defaults to `gpt-oss-20b` to use what was already on disk and avoid a 4.9 GB download for Llama.
2. User had already kicked off `make lm-setup` with the old config before the swap, so the Llama download was already in flight.
3. Once the Llama download finished and loaded successfully, reverted the defaults back to Llama 3.1 8B Instruct — the script + .env now matched what was actually loaded, so `make run` would work immediately.
4. Left `gpt-oss-20b` documented as a swap-in alternative in `setup-lmstudio.sh` (top-of-file comments) and the README.

**Why the back-and-forth.** Editing defaults under a long-running download created a config/runtime mismatch. Once Llama was loaded and the download cost was paid, reconciling the config to the loaded state was cheaper than wasting the download or asking the user to load another 12 GB model.

**What it taught us.**
- When work is already in flight, "what's the cheapest reconciliation?" beats "what's the most elegant final state?". The user paid for Llama; let Llama be the default.
- The script is now configured to use what's loaded; alternatives are documented in comments where someone editing the file will see them. No information lost.

---

## Iteration 7 — Generating fixture data

**Problem.** Pipeline worked but had nothing to point at. Asking users to find their own contract is friction.

**First cut.** A single `generate-sample.py` using `reportlab` to write `sample_contract.pdf` — one fictional Norwegian Master Services Agreement deliberately structured to hit both halves of the default test query (payment terms + error codes).

**`make sample` target.** Runs the generator in a one-shot `python:3.12-slim` container with reportlab pip-installed in the layer. No native pip needed; matches the containerize-everything rule.

**Result.** End-to-end happy path verified — 14 chunks from a 3-page PDF, 5 ensemble-deduplicated chunks into the prompt, accurate answer (9.25% interest, NOK 450 reminder fee, all 8 ERR-codes correctly listed), every fact verifiable in the source chunks. No hallucination. Temperature 0 + strict prompt working as designed.

**What it taught us.** Reproducible fixtures change the project from "demo if you bring your own data" to "clone and run". For a public-facing repo, that's a big swing in approachability.

---

## Iteration 8 — Committing the fixture without leaking real PDFs

**Tension.** The fixture should ship with the repo (clone → run, no setup), but the project folder also accepts user-dropped PDFs/DOCX. Those user docs must stay local.

**Resolution.** Tight `.gitignore` scoping: `*.pdf` and `*.docx` ignored, `!sample_contract.pdf` exception for the one fixture. Later (Iteration 11) generalised to `!contracts/contract_*.pdf` when the corpus moved into a subfolder.

**What it taught us.** Negation patterns in `.gitignore` are the right tool when you want "ignore everything in this class except these specific committed members". Don't try to do it with "only commit this file" instructions in the README — humans forget, `.gitignore` doesn't.

---

## Iteration 9 — Interactive REPL

**What we wanted.** User asked: "make it so I can ask questions also". Single-shot mode worked for verification but isn't how anyone actually wants to *use* a RAG pipeline.

**What we did.**
- Replaced the single `run_query(qa, TEST_QUERY)` call with an `interactive_loop(qa)` that prompts for questions in a `> ` REPL until the user types `exit` / `quit` / `q` / Ctrl-D.
- Kept the heavy setup (load, chunk, embed) before the loop — it runs once. Only the LLM call hits LM Studio per question.
- Ctrl-C during a slow LLM call aborts that one query instead of killing the session.
- `QUESTION="…" make run` env-var path for one-shot scripted runs (CI, shell pipelines).
- Forwarded `-e QUESTION` (and later `-e DOC_DIR`) through the Docker run command.

**What it taught us.** Once a pipeline works, the difference between "script that does one thing" and "tool you'd actually use" is usually 20 lines of REPL code. Worth the spend.

---

## Iteration 10 — Multi-document corpus

**What we wanted.** User asked for more contracts so cross-document questions ("which customer has the strictest SLA?", "list every customer with their payment terms") would have material to work with.

**What we did.**
- Refactored `generate-sample.py` into `generate-samples.py` (plural). A `Variant` dataclass captures every field that varies per contract: provider/customer parties, currency (NOK/EUR/USD), NET payment window, late-interest rate, reminder fee, SLA target, service-credit ladder, error-code namespace + entries, fees table, initial term, jurisdiction.
- Wrote four variants deliberately distinct on the fields users would ask about: FjordTech (NOK/NET-30/9.25%/99.9%/ERR-xxxx), Skyfall (EUR/NET-45/8.50%/99.5%/SVC-xxx), Polaris (NOK/NET-60/11.00%/99.95%/OPS-xxxx), Havblikk (USD/NET-30/10.50%/99.7%/API-xxx).
- Boilerplate clauses (definitions, confidentiality, DPA, liability cap, governance) stayed constant — only contracts vary on the fields you'd ask about.
- Refactored `main.py`: `find_documents()` returns a list; `load_and_chunk()` loops over all files; new `_doc_fingerprint()` produces a stable hash of the corpus (name + size + mtime per file) stored at `local_poc_db/.doc_fingerprint`. On startup, mismatched fingerprint → wipe and rebuild Chroma; matching fingerprint → reuse.

**Why fingerprinting matters.** Without it, adding a new contract would silently retrieve from the stale store. The user wouldn't know they were querying yesterday's corpus until something looked wrong.

**What it taught us.** "Generate variations from a dataclass + a list of dicts" scales better than "duplicate the template four times". And the moment a pipeline accepts more than one document, you need a `make me invalidate the cache when the inputs change` mechanism — fingerprinting is the simplest one that works.

---

## Iteration 11 — Moving the corpus into its own subfolder

**Trigger.** User: "store them in a own folder". Four PDFs at the project root was already messy.

**What we did.**
- Created `contracts/` and moved all fixtures into it.
- Generator now writes to `contracts/contract_<slug>.pdf` (creates the dir if missing).
- `find_documents()` walks `./contracts/` by default; `DOC_DIR=./my-docs make run` lets users point at any folder.
- `.gitignore` exception narrowed to `!contracts/contract_*.pdf` so other PDFs/DOCX dropped into `contracts/` still stay local.
- Forwarded `-e DOC_DIR` through Docker.

**What it taught us.** Folder hygiene is one of those things people skip because it's "cosmetic". It's not — it lowers the cognitive load of every subsequent step (which file is the fixture? which is mine?). Cheap to do, painful to defer.

---

## Iteration 12 — The strict prompt was too strict

**What we saw.** User asked "which customer contracts do we have". Retrieval returned 8 chunks. The first chunks contained literal text "Master Services Agreement — FjordTech Industri AS", "Master Services Agreement — Havblikk Marin AS", and so on — the customer names were *in the prompt*. The model still refused with the exact refusal string.

**Why it happened.** The strict prompt told the model: "Answer the question using ONLY the provided context. … If the answer is not in the context, reply exactly with [refusal]." That phrasing means "if there isn't a literal sentence answering this question, refuse". For "which customer contracts do we have", there's no sentence in the corpus that says "the customer contracts are: X, Y, Z" — each customer is named in a *different* chunk. The model treated this as the refusal case rather than as the synthesis case.

**Why this is a known pattern.** Small local models (8B-class) take strict prompts very literally. They prefer false-negative refusals over correct-synthesis answers. Larger models (GPT-4, Claude Opus) would have synthesised across the chunks without being told. The smaller the model, the more explicit the prompt has to be about what *kind* of reasoning is allowed.

**What we did.**
1. **Updated the prompt** to permit synthesis explicitly: *"You MAY combine information from multiple chunks and sources to form a complete answer — for example, listing items, comparing values across documents, or enumerating the documents themselves."* Kept the no-outside-knowledge clause verbatim — only loosened the *synthesis* permission, not the *invention* prohibition.
2. **Injected source metadata into the prompt.** Default `RetrievalQA` formatting passes only `page_content` to the LLM, dropping the `source` metadata that the *script* prints in its output. So even though we could see which file each chunk came from, the model couldn't. Set `document_prompt = "[source: {source}]\n{page_content}"` in `chain_type_kwargs` so each chunk arrives at the LLM with its filename attached.

**What we tested.** Re-ran the same question. Model now attempted synthesis instead of refusing.

**What it taught us.**
- A refusal isn't always evidence of safety working — sometimes it's evidence of synthesis permission missing. Both look the same from the outside.
- LangChain's default `RetrievalQA` silently strips metadata before reaching the LLM. This is a footgun for any retrieval pipeline that needs cross-document reasoning. If your model is supposed to attribute or compare, you need to put the attribution into the prompt yourself.

---

## Iteration 13 — The new prompt synthesised, but the answer was still wrong

**What we saw.** "Which customer do we have" now returned an answer (good — synthesis path was wired). But the answer was:

> 1. Havblikk Marin AS (Customer) - from contract_havblikk.pdf
> 2. Astrid Lien and Ingvild Solberg's company is not explicitly stated in the contracts but it can be inferred that they are CEOs of a company named Skyfall as per contract_skyfall.pdf

Two problems:
- Only Havblikk identified by name (1 of 4 customers).
- Astrid Lien is the *provider's* CEO (appears in *every* contract). Ingvild Solberg is Skyfall's CEO. The model conflated them.
- FjordTech and Polaris missing entirely.

**Why it happened.** Looked at the 8 retrieved chunks: **zero from `contract_polaris.pdf`**. The query "which customer do we have" has no strong semantic or BM25 anchor in the body text — both retrievers picked thematically-related chunks (SLA, error codes, confidentiality) instead of title chunks (page 0) where customer names are most clearly stated. The model honestly answered what it saw; what it saw didn't include Polaris because the retriever never surfaced a Polaris chunk.

**Diagnosis.** This is a **retrieval problem**, not a model problem. For inventory-style questions, retrieval is the wrong tool — the answer is the file list itself.

**What we did.**
1. **Bumped TOP_K from 4 to 6 per retriever.** More chunks per retriever = more chance of at least one chunk per document for broad questions. Cost: roughly linear in prompt tokens; still small for this corpus.
2. **Added a "Document inventory" block to the prompt, baked in at build time.** Every prompt now shows the full file list independent of what retrieval surfaces. `partial_variables={"document_inventory": <formatted file list>}` fills it once at `build_qa_chain` time; LangChain fills `{context}` and `{question}` per request.
3. **Added an explicit instruction** to the prompt: *"When asked which documents exist, what customers / parties / files there are, or any similar inventory question, ALWAYS enumerate from the document inventory below — not just from the retrieved chunks."*

**What we expected.** Inventory questions ("which customers do we have") now answer reliably from the baked-in file list. Detail questions ("what is the late-payment rate for Polaris") still benefit from retrieval as before.

**What it taught us.**
- Naive RAG ("retrieve top-k chunks, stuff into prompt, ask question") fails on a specific question shape: *broad inventory*. The right answer doesn't live in any single chunk; it lives in the metadata of the collection.
- A cheap fix is to give the model the metadata it needs *out of band* — outside the retrieval path, baked into the prompt. Don't make retrieval do work it isn't suited for.
- The deeper takeaway: think about what *kinds* of questions your pipeline will face, and whether the retrieval path is the right answer for each kind. Some questions are about chunks; some are about the collection itself.

---

## Iteration 14 — Empirical validation: three wins, one new failure mode

After the prompt + inventory + top-k changes from Iterations 12–13, ran a four-query test session. Captured the real outputs to ground the post in evidence rather than expectation.

### Query 1: "which customers do we have"

> Based on the provided document inventory, the following contracts exist:
> 1. contract_fjordtech.pdf
> 2. contract_havblikk.pdf
> 3. contract_polaris.pdf
> 4. contract_skyfall.pdf
>
> From these documents, the following customers are mentioned:
> 1. Havblikk Marin AS (contract_havblikk.pdf)
> 2. FjordTech Industri AS (contract_fjordtech.pdf)
> 3. Polaris (contract_polaris.pdf)
> 4. Skyfall (contract_skyfall.pdf)

**Result: ✅ correct.** All four documents named (from the inventory block, regardless of retrieval) and all four customers paired to their files. Polaris and Skyfall use shortened names — the model didn't pull the full "Polaris Energi ASA" / "Skyfall Logistikk AS" — but that's a minor extraction miss, not a wrong answer. 11 chunks retrieved including the title chunks for Havblikk and FjordTech (page 0).

The two-stage answer ("here's the inventory, here's what I can extract from chunks") is exactly how the prompt was designed to behave for broad inventory questions.

### Query 2: "What is the late-payment interest rate in each contract"

> - Contract Havblikk: 10.50% per annum
> - Contract Polaris: Not explicitly stated in the provided snippet; however, it is mentioned that "Undisputed invoices not paid by the due date shall accrue interest at the rate of 11.00% per annum"
> - Contract Fjordtech: 9.25% per annum
> - Contract Skyfall: 8.50% per annum

**Result: ✅ correct.** All four rates pulled, paired with the right customer, in the right currency context (verifiable in the source chunks). The hedging language on Polaris ("not explicitly stated… however…") is over-cautious — the answer it gave *is* the rate explicitly stated — but the actual value is correct. Smaller-model behaviour; survives, doesn't mislead.

### Query 3: "What is the capital of Madagascar"

> I do not have enough information in the provided documents to answer this.

**Result: ✅ correct refusal.** Verbatim refusal string. The strict prompt's no-outside-knowledge clause is still load-bearing after the synthesis-permission loosening. 10 chunks were retrieved (all about payment clauses) — the model still refused rather than reaching for "Antananarivo". The Iteration 12 change did NOT regress refusal behaviour.

### Query 4: "hat is the late-payment interest rate for Polaris?"

> I do not have enough information in the provided documents to answer this.
>
> However, I can tell you that there are four contracts available:
> 1. contract_fjordtech.pdf
> …

**Result: ❌ refused incorrectly.** The Polaris late-payment rate (11.00%) is in the corpus and was retrievable in Query 3 above. Query 4 didn't retrieve it.

### Why Query 4 failed — and why it's a new failure mode

Looked at the 8 chunks retrieved for Query 4:
- Four chunks of generic "3.1 Fees / 3.2 Invoicing cadence" (one per contract).
- The Polaris title chunk (page 0).
- Two Skyfall and one Havblikk chunks (error codes, generic fees).
- Polaris's actual late-payment chunk ("11.00% per annum…NOK 750") **was not retrieved.**

Compare to Query 3 (Madagascar): the *same* Polaris late-payment chunk *was* retrieved (it surfaced as chunk 9 there). A more focused query did worse retrieval than an unrelated query.

**Why.** The chunk containing "11.00% per annum" does not contain the word "Polaris". Polaris's name appears in the title chunk on page 0. The late-payment clause is a separate chunk that just says "Undisputed invoices not paid by the due date shall accrue interest at the rate of 11.00% per annum, calculated daily…" — no customer name in it.

So the query "late-payment interest rate for Polaris" matches:
- BM25: the word "Polaris" appears in the title chunk only → BM25 grabs that.
- Dense: chunks semantically close to "late-payment interest rate" → grabs every contract's *generic* payment chunk (3.1 / 3.2 — fees, invoicing, currency), but the specific late-payment chunks (3.4) tied to "Polaris" need a *combination* of the two signals that neither retriever finds individually.

Neither retriever in isolation links "Polaris" + "late-payment 11.00%" because that link only exists at the document level, not within any single chunk. The customer name doesn't repeat through the document — once stated in the title, it's never said again.

**Classification.** This is a **chunking / context-loss problem**, not a retrieval-tuning problem. Bumping top-k higher would help by accident, not by design. The real fix is to give every chunk enough context to be findable by customer name — for example, prepending `"[From the Master Services Agreement with Polaris Energi ASA]"` to every chunk's content during ingestion, so retrieval on "Polaris" hits every Polaris-derived chunk, not just the title.

This is a known RAG pattern. It's the *document-level context* problem: naive chunking forgets which document each chunk came from, and most retrievers can't reason about file ownership.

### What we didn't do (yet)

Deliberately stopped before implementing the chunk-prepending fix. Two reasons:

1. **The blog post benefits from showing the failure mode honestly.** "Here's a fix that worked for inventory questions but introduced a new failure mode on focused cross-document questions" is a more useful story than "here's a fix that worked end of story". RAG quality is iterative; the post should reflect that.
2. **The right next step is an eval harness, not another prompt patch.** Without 15–25 labelled QA pairs we can't tell whether the chunk-prepending fix improves average quality, or just shifts the failure-set. That's the BACKLOG item that's been pending since Iteration 0.

### What it taught us (third RAG lesson in three iterations)

- **Chunks lose document-level context.** Any fact stated once at the top of a document and not repeated becomes effectively unfindable by retrievers that look at chunks in isolation. The customer name is the obvious example; dates, jurisdictions, currency are similar.
- **A "better" prompt can mask retrieval problems on some questions while exposing them on others.** Iterations 12–13 made inventory questions work. Iteration 14 shows targeted cross-document questions ("X for Polaris") regressed because retrieval doesn't know that the late-payment chunk *is* a Polaris chunk.
- **You need an eval harness to know when you're trading one failure mode for another.** Anecdotal "yes that one works" testing finds the cases the next change happens to fix; it misses the cases that change broke. Quantitative measurement is the only way to make progress without backsliding.

---

## Themes worth pulling into the blog

1. **Pushback and acknowledgement aren't opposites.** Articulating real downsides while still building the local stack made the project more credible, not less. The critique survives into the repo (banner on every run + README section) — anyone cloning sees both sides.
2. **The official CLI isn't always the best path.** `lms get` had a known case-normalization bug; routing around it via direct Hugging Face downloads was uglier but reliable. Keep the official path as the first attempt; treat the workaround as a fallback so you benefit when the bug is eventually fixed.
3. **Idempotency turns "setup" into "boot".** A `make lm-setup` that's safe to re-run anywhere is a much stronger contract than one that errors if state is half-applied.
4. **Pin what you import; let the resolver pick transitives.** Hand-picking exact versions for every transitive dep produces conflicts the resolver wouldn't have generated on its own. The resolver is the source of truth.
5. **Strict prompts catch hallucinations but cause false-negative refusals.** Especially on smaller models. The prompt has to explicitly permit synthesis if you want enumeration/comparison to work.
6. **`RetrievalQA` strips metadata.** Default behaviour passes only `page_content` to the LLM. If your model needs to attribute or compare across documents, override `document_prompt`.
7. **Some questions don't belong on the retrieval path.** Inventory questions are about the *collection*, not any single chunk. Inject that information into the prompt directly; don't try to retrieve it.
8. **Reproducible fixtures change the project's audience.** Going from "demo if you bring your own data" to "clone and run" is a small amount of code (a generator + `make sample`) for a big swing in approachability.
9. **Fingerprint the inputs once you accept more than one.** Otherwise users adding/removing documents silently retrieve from a stale store and don't know they're querying yesterday's corpus.
10. **When work is already in flight, the cheapest reconciliation wins.** During the gpt-oss-20b vs. Llama 3.1 8B detour, the right move was to reconcile config to what was already loaded — not to throw away the work paid for.
11. **Chunks lose document-level context.** Anything stated once at the top of a document and not repeated (customer name, jurisdiction, currency, effective date) is effectively unfindable by retrievers that look at chunks in isolation. Iteration 14 shows the symptom: asking "X for customer Y" fails not because the answer isn't in the corpus, but because the chunk with the answer doesn't contain Y's name.
12. **Fixing one failure mode can introduce another.** Iterations 12–13 made inventory questions work; Iteration 14 shows targeted cross-document questions regressed. Without an eval harness you don't know whether your "fix" was net positive or net neutral. This is the strongest single argument for the eval harness sitting in BACKLOG.md — anecdotal testing finds the cases the next change happens to fix, never the cases it broke.

---

## What's left in BACKLOG.md (and why it isn't in the POC)

- **Eval harness.** Without a labelled QA set you can't tell whether prompt changes (Iterations 12 + 13) actually improved quality on average vs. anecdotally on one question. Adding a `make eval` target with 15–25 labelled QA pairs is the next obvious move and the one that would let you tune `TOP_K`, ensemble weights, and prompt wording with data instead of vibes.
- **Real-document corpus.** The four fixtures are deliberately distinct on every field; a real corpus is much more uniform, which makes retrieval harder. The eval harness above would surface this difference immediately.
- **Larger model A/B.** `gpt-oss-20b` is on disk and would likely fix some of the "too literal" failures on smaller queries without the prompt acrobatics. Would be a one-line config change once the eval harness exists.
