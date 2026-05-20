"""
Local Hybrid-Retrieval RAG POC
==============================

A 100% local, offline RAG pipeline for querying legal contracts and technical
documentation. Embeddings and the chat model are served by LM Studio on
localhost:1234 via its OpenAI-compatible API. Retrieval is hybrid: dense
(Chroma) + sparse (BM25), combined 50/50 via LangChain's EnsembleRetriever.

The pipeline runs sequentially:
    1. Locate a PDF or DOCX in the project folder
    2. Load and chunk it
    3. Build vector + BM25 retrievers and combine them into an ensemble
    4. Wire up RetrievalQA with a locked-down anti-hallucination prompt
    5. Run a test query and print the answer plus the source chunks used

Pre-requisites (see README.md for details):
    - LM Studio running on http://localhost:1234 with BOTH an embedding model
      and a chat model loaded.
    - A PDF or DOCX file dropped in this folder (default: sample_contract.pdf).
"""

from __future__ import annotations

import hashlib
import os
import shutil
import sys
from pathlib import Path

# --- LangChain stack imports --------------------------------------------------
# The split-package layout (langchain, langchain-community, langchain-openai,
# langchain-chroma, langchain-text-splitters) is the modern, supported shape.
# Older monolithic imports like `from langchain.vectorstores import Chroma`
# still work but emit deprecation warnings.
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain_community.retrievers import BM25Retriever
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain.retrievers import EnsembleRetriever
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate


# =============================================================================
# Configuration
# =============================================================================
# Every knob is env-overridable so the same script works inside Docker (where
# the LM Studio host is `host.docker.internal`) and on a bare venv (where it
# is `localhost`).
LM_STUDIO_BASE_URL = os.getenv("LM_STUDIO_BASE_URL", "http://localhost:1234/v1")
LM_STUDIO_API_KEY = os.getenv("LM_STUDIO_API_KEY", "lm-studio")

# The model identifiers below are what LM Studio reports for the currently
# loaded models. Confirm with:
#     curl http://localhost:1234/v1/models | jq '.data[].id'
# Defaults match the README "LM Studio models" section:
#   - nomic-ai/nomic-embed-text-v1.5-GGUF (Q4_K_M)
#   - lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF (Q4_K_M)
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-nomic-embed-text-v1.5")
CHAT_MODEL = os.getenv("CHAT_MODEL", "llama-3.1-8b-instruct")

# Where Chroma persists its on-disk index. Keep this stable across runs so the
# second invocation skips re-embedding (slow, single-process via LM Studio).
PERSIST_DIR = "./local_poc_db"

# Sidecar file inside PERSIST_DIR holding the fingerprint of the document set
# the current Chroma store was built from. If the fingerprint no longer
# matches the on-disk corpus, the store is rebuilt — otherwise re-runs after
# adding/removing/replacing a contract would silently retrieve stale chunks.
FINGERPRINT_FILE = ".doc_fingerprint"

# Directory the loader walks for PDFs/DOCX. Override at runtime with the
# DOC_DIR env var (useful for pointing at a different corpus without editing
# the script).
DOC_DIR = Path(os.getenv("DOC_DIR", "./contracts"))

# Chunking parameters from the user's brief. Tuned to give the LLM enough
# surrounding context (800 chars ≈ 200 tokens) without blowing past the
# context window once we stuff 4 chunks into the prompt.
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100

# How many chunks each retriever returns. The ensemble merges them — duplicates
# (same chunk picked by both retrievers) are deduped by LangChain. Higher k
# helps on broad / cross-document questions ("which X do we have", "compare Y
# across contracts") at the cost of more tokens per prompt. 6 is a reasonable
# default for the 4-document fixture corpus; tune up to 8–10 if you add
# significantly more documents.
TOP_K = 6

# An example query shown to the user at the REPL prompt. Picked to be broad
# enough that it usually returns hits on either contract-style or technical-
# spec corpora. Override at runtime with the QUESTION env var to skip the
# REPL entirely (useful for scripting / CI):
#     QUESTION="What is the late-payment interest rate?" make run
EXAMPLE_QUERY = "What are the specific payment terms or error codes mentioned?"


# =============================================================================
# Banner — surfaces the honest critique on every run.
# =============================================================================
BANNER = """\
================================================================================
 Local Hybrid-Retrieval RAG POC
--------------------------------------------------------------------------------
 Caveat: a local 7B-13B GGUF model is materially weaker than gpt-4-class
 models at multi-step legal reasoning and citation tracing. Throughput is
 single-process. No eval harness, no observability — yet.

 Why local anyway: legal/technical corpora often forbid third-party
 inference providers. Sovereignty + zero marginal cost + air-gapped > raw
 model quality for THIS POC.
================================================================================
"""


# =============================================================================
# Step 1 — Locate input documents
# =============================================================================
def find_documents() -> list[Path]:
    """Return every PDF and DOCX in DOC_DIR, sorted for stability."""
    if not DOC_DIR.exists():
        print(
            f"ERROR: corpus directory {DOC_DIR} does not exist. Run "
            f"`make sample` to generate the fictional fixture set, or drop "
            f"your own .pdf/.docx files in there and re-run.",
            file=sys.stderr,
        )
        sys.exit(1)

    files: list[Path] = []
    for suffix in (".pdf", ".docx"):
        files.extend(sorted(DOC_DIR.glob(f"*{suffix}")))

    if not files:
        print(
            f"ERROR: no .pdf or .docx files found in {DOC_DIR}. Run "
            f"`make sample` to generate the fictional fixture set, or drop "
            f"your own documents in there and re-run.",
            file=sys.stderr,
        )
        sys.exit(1)

    return files


# =============================================================================
# Step 2 — Load and chunk
# =============================================================================
def load_and_chunk(doc_paths: list[Path]):
    """Load every document and split into chunks. Source metadata distinguishes them."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )

    all_chunks = []
    for doc_path in doc_paths:
        suffix = doc_path.suffix.lower()
        if suffix == ".pdf":
            loader = PyPDFLoader(str(doc_path))
        elif suffix == ".docx":
            loader = Docx2txtLoader(str(doc_path))
        else:
            # find_documents() already filters, but be defensive.
            raise ValueError(f"Unsupported file type: {suffix}")

        raw_pages = loader.load()
        chunks = splitter.split_documents(raw_pages)
        all_chunks.extend(chunks)
        print(f"  {doc_path.name:40s} → {len(chunks):3d} chunks")

    print(f"Loaded {len(all_chunks)} chunks total from {len(doc_paths)} document(s).")
    return all_chunks


def _doc_fingerprint(doc_paths: list[Path]) -> str:
    """Stable hash of the current document set — name + size + mtime per file."""
    h = hashlib.sha256()
    for p in sorted(doc_paths):
        st = p.stat()
        h.update(f"{p.name}|{st.st_size}|{st.st_mtime_ns}\n".encode())
    return h.hexdigest()


# =============================================================================
# Step 3 — Build the hybrid retriever (Chroma + BM25 → Ensemble)
# =============================================================================
def build_ensemble_retriever(chunks, doc_paths: list[Path]):
    """Build (or reuse) the Chroma store and combine it 50/50 with BM25."""

    # Embeddings client points at LM Studio. `check_embedding_ctx_length=False`
    # disables the OpenAI-side context-length check that fails against
    # third-party servers reporting models the OpenAI tokenizer doesn't know.
    embeddings = OpenAIEmbeddings(
        base_url=LM_STUDIO_BASE_URL,
        api_key=LM_STUDIO_API_KEY,
        model=EMBED_MODEL,
        check_embedding_ctx_length=False,
    )

    # Reuse the persisted Chroma store ONLY if the document set hasn't changed
    # since it was built. Otherwise users adding/removing/replacing a contract
    # would silently retrieve stale chunks. The fingerprint is name+size+mtime
    # per file — cheap and good enough for a POC.
    chroma_path = Path(PERSIST_DIR)
    fp_path = chroma_path / FINGERPRINT_FILE
    current_fp = _doc_fingerprint(doc_paths)

    has_store = chroma_path.exists() and any(chroma_path.iterdir())
    fp_matches = fp_path.exists() and fp_path.read_text().strip() == current_fp

    if has_store and fp_matches:
        print(f"Reusing existing Chroma store at {PERSIST_DIR} (fingerprint match)")
        vector_store = Chroma(
            persist_directory=PERSIST_DIR,
            embedding_function=embeddings,
        )
    else:
        if has_store:
            print(f"Document set changed — rebuilding Chroma store at {PERSIST_DIR}")
            shutil.rmtree(chroma_path)
        else:
            print(f"Building new Chroma store at {PERSIST_DIR} (this calls LM Studio)")
        vector_store = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            persist_directory=PERSIST_DIR,
        )
        fp_path.write_text(current_fp)

    # Dense retriever — semantic similarity over the embedded chunks.
    vector_retriever = vector_store.as_retriever(search_kwargs={"k": TOP_K})

    # Sparse retriever — classic BM25 over the same chunks. BM25 is rebuilt
    # in-memory every cold start; there is no persisted index. For this POC
    # that's fine.
    bm25_retriever = BM25Retriever.from_documents(chunks)
    bm25_retriever.k = TOP_K

    # 50/50 ensemble. Tuning these weights is the first thing worth doing
    # once an eval harness exists.
    ensemble = EnsembleRetriever(
        retrievers=[vector_retriever, bm25_retriever],
        weights=[0.5, 0.5],
    )
    return ensemble


# =============================================================================
# Step 4 — Wire up the RetrievalQA chain with the strict prompt
# =============================================================================
PROMPT_TEMPLATE = """\
You are a strict legal and technical assistant. Answer the question using ONLY \
the information in the context below, together with the document inventory \
listed beneath. Each chunk in the context is prefixed with its source \
filename. You MAY combine information from multiple chunks and sources to \
form a complete answer — for example, listing items, comparing values across \
documents, or enumerating the documents themselves. You MAY NOT use any \
knowledge beyond what appears in this prompt. If the question cannot be \
answered from the context or the inventory, reply exactly with: "I do not \
have enough information in the provided documents to answer this."

When asked which documents exist, what customers / parties / files there are, \
or any similar inventory question, ALWAYS enumerate from the document \
inventory below — not just from the retrieved chunks.

Document inventory (every file currently loaded into the corpus):
{document_inventory}

Context (chunks retrieved as most relevant to the current question):
{context}

Question: {question}

Answer:"""

# Format each retrieved chunk with its source filename so the LLM can attribute
# facts to the document they came from. Without this, RetrievalQA only passes
# `page_content` to the prompt — which means the model literally cannot tell
# which document a chunk belongs to when asked cross-document questions
# ("which customers do we have", "compare X across contracts", etc.).
DOCUMENT_TEMPLATE = "[source: {source}]\n{page_content}"


def build_qa_chain(retriever, doc_paths: list[Path]):
    """Build a RetrievalQA chain with temperature=0 and the locked-down prompt."""

    # temperature=0.0 nails the model to greedy decoding — important when the
    # whole point is "don't invent things."
    llm = ChatOpenAI(
        base_url=LM_STUDIO_BASE_URL,
        api_key=LM_STUDIO_API_KEY,
        model=CHAT_MODEL,
        temperature=0.0,
    )

    # Bake the document inventory into the prompt at build time. Retrieval
    # may not surface every document for broad / inventory-style questions
    # (a query like "which customers do we have" has no strong semantic or
    # keyword anchor in the body text), so the model needs to see the full
    # file list independently. partial_variables fills `{document_inventory}`
    # now; LangChain fills `{context}` and `{question}` per request.
    inventory_lines = "\n".join(f"  - {p}" for p in sorted(doc_paths))
    prompt = PromptTemplate(
        template=PROMPT_TEMPLATE,
        input_variables=["context", "question"],
        partial_variables={"document_inventory": inventory_lines},
    )

    document_prompt = PromptTemplate(
        template=DOCUMENT_TEMPLATE,
        input_variables=["source", "page_content"],
    )

    # `chain_type="stuff"` concatenates retrieved chunks into the prompt — the
    # simplest strategy and the right default when chunks fit in context.
    # `document_prompt` controls how each individual chunk is rendered into
    # the prompt (default is just `{page_content}`); we override it to include
    # the source filename.
    # `return_source_documents=True` makes the chain echo the chunks it used.
    qa = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={
            "prompt": prompt,
            "document_prompt": document_prompt,
        },
        return_source_documents=True,
    )
    return qa


# =============================================================================
# Step 5 — Run a query and print the answer + sources
# =============================================================================
def run_query(qa, query: str) -> None:
    """Invoke the chain once and pretty-print the answer plus its source chunks."""
    print(f"\nQuestion: {query}\n")

    result = qa.invoke({"query": query})
    answer = result["result"]
    sources = result.get("source_documents", [])

    print("Answer:")
    print(answer)

    print(f"\nSources ({len(sources)} chunks used):")
    print("-" * 80)
    for i, doc in enumerate(sources, start=1):
        source = doc.metadata.get("source", "<unknown>")
        page = doc.metadata.get("page", "n/a")
        # Truncate content preview so the console output stays readable.
        preview = doc.page_content.strip().replace("\n", " ")
        if len(preview) > 280:
            preview = preview[:280] + "…"
        print(f"[{i}] source={source}  page={page}")
        print(f"    {preview}")
        print()


# Words that exit the REPL. `q` is included because it's the universal "I'm
# done" shortcut from less / vim / psql.
EXIT_WORDS = {"exit", "quit", "q", ":q", ":quit"}


def interactive_loop(qa) -> None:
    """Prompt the user for questions in a loop until they exit."""
    print("=" * 80)
    print(" Ask questions about the loaded document. Type 'exit' (or Ctrl-D) to quit.")
    print(f" Example: {EXAMPLE_QUERY}")
    print("=" * 80)

    while True:
        try:
            query = input("\n> ").strip()
        except (EOFError, KeyboardInterrupt):
            # Ctrl-D or Ctrl-C — exit cleanly, no traceback.
            print("\nbye.")
            return

        if not query:
            continue
        if query.lower() in EXIT_WORDS:
            print("bye.")
            return

        try:
            run_query(qa, query)
        except KeyboardInterrupt:
            # Allow Ctrl-C to cancel an in-flight LLM call without killing
            # the whole session — the user might want to abort a slow
            # response and ask something shorter.
            print("\n(query cancelled)")
            continue


def main() -> None:
    print(BANNER)

    doc_paths = find_documents()
    chunks = load_and_chunk(doc_paths)
    retriever = build_ensemble_retriever(chunks, doc_paths)
    qa = build_qa_chain(retriever, doc_paths)

    # QUESTION=… lets you skip the REPL for scripting / CI — runs one query
    # and exits. Otherwise we drop into the interactive loop.
    scripted = os.getenv("QUESTION", "").strip()
    if scripted:
        run_query(qa, scripted)
    else:
        interactive_loop(qa)


if __name__ == "__main__":
    main()
