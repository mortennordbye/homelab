"""
Local Hybrid-Retrieval RAG POC — comparison web UI.
====================================================

A thin FastAPI layer on top of main.py that lets a user run the same question
through three retrieval strategies side by side:

    - vector   — Chroma dense retrieval + LLM synthesis
    - bm25     — BM25 sparse keyword retrieval + LLM synthesis
    - hybrid   — 50/50 ensemble of both + LLM synthesis

Only the retriever varies. The chunking, embedding model, LLM, prompt template
and top-K are identical across modes — the whole point is to isolate "what
does swapping vector for BM25 (or combining them) change?"

The page renders three columns. Each column lazy-loads via htmx the moment the
user submits a question, so the fast modes don't block on the slow ones.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

import main as rag

WEB_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(WEB_DIR / "templates"))

app = FastAPI(title="local-rag-poc — three-mode comparison")
app.mount("/static", StaticFiles(directory=str(WEB_DIR / "static")), name="static")


# Built once at startup. Each retriever stays in memory for the life of the
# process; rebuilding them per request would re-embed and re-index the entire
# corpus on every keystroke. Same for the LLM chains.
state: dict = {}


@app.on_event("startup")
def warm_up() -> None:
    print(rag.BANNER)
    doc_paths = rag.find_documents()
    chunks = rag.load_and_chunk(doc_paths)

    vector = rag.build_vector_retriever(chunks, doc_paths)
    bm25 = rag.build_bm25_retriever(chunks)
    hybrid = rag.build_hybrid_retriever(vector, bm25)

    state["doc_paths"] = doc_paths
    state["retrievers"] = {
        "vector": vector,
        "bm25": bm25,
        "hybrid": hybrid,
    }
    state["chains"] = {
        mode: rag.build_qa_chain(retr, doc_paths)
        for mode, retr in state["retrievers"].items()
    }
    print(f"Web UI ready. Modes available: {list(state['retrievers'])}")


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "modes": list(rag.MODES),
            "doc_paths": [str(p) for p in state.get("doc_paths", [])],
        },
    )


# Single endpoint — mode travels in the form body, not the URL path. We tried
# /query/{mode} originally but at least one mode (bm25 / "keyword") tripped a
# client-side filter and the request never left the browser. Keeping the URL
# constant across modes sidesteps any path-pattern-based blocker.
@app.post("/query", response_class=HTMLResponse)
def query(request: Request, mode: str = Form(...), q: str = Form(...)):
    if mode not in state["retrievers"]:
        raise HTTPException(status_code=404, detail=f"unknown mode {mode!r}")

    retriever = state["retrievers"][mode]
    qa = state["chains"][mode]

    try:
        payload = rag.run_query_structured(retriever, qa, q)
        payload["error"] = None
    except Exception as exc:  # noqa: BLE001 — surface any LLM/retriever failure in the UI
        payload = {
            "answer": "",
            "chunks": [],
            "retrieval_ms": 0,
            "llm_ms": 0,
            "total_ms": 0,
            "error": f"{type(exc).__name__}: {exc}",
        }

    return templates.TemplateResponse(
        "_column.html",
        {"request": request, "mode": mode, "q": q, **payload},
    )
