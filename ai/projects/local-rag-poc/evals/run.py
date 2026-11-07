"""Score retrieval precision@k on evals/qa.json, and check refusals.

Run with `make eval` (MODE=vector|bm25|hybrid, default hybrid).
SKIP_LLM=1 skips the refusal check, which needs the chat model.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import main

REFUSAL = "I do not have enough information in the provided documents to answer this."


def slug(source: str) -> str:
    return Path(source).stem.removeprefix("contract_")


def precision_at_k(retrieved, expected: set[str]) -> float:
    top = retrieved[: main.TOP_K]
    return sum(slug(d.metadata.get("source", "")) in expected for d in top) / len(top)


def run() -> None:
    mode = os.getenv("MODE", "hybrid").strip().lower()
    qa = json.loads(Path(__file__).with_name("qa.json").read_text())

    doc_paths = main.find_documents()
    chunks = main.load_and_chunk(doc_paths)
    retriever = main.build_retriever(mode, chunks, doc_paths)

    answerable = [item for item in qa if item["sources"]]
    refusals = [item for item in qa if not item["sources"]]

    print(f"\nmode={mode} k={main.TOP_K}\n")
    scores = []
    for item in answerable:
        p = precision_at_k(retriever.invoke(item["q"]), set(item["sources"]))
        scores.append(p)
        print(f"  P@{main.TOP_K}={p:.2f}  {item['q']}")
    mean = sum(scores) / len(scores)
    print(f"\nmean P@{main.TOP_K}: {mean:.3f} over {len(scores)} questions")

    if os.getenv("SKIP_LLM"):
        return

    qa_chain = main.build_qa_chain(retriever, doc_paths)
    refused = 0
    for item in refusals:
        answer = qa_chain.invoke({"query": item["q"]})["result"].strip()
        ok = answer.startswith(REFUSAL)
        refused += ok
        print(f"  {'refused' if ok else 'ANSWERED'}  {item['q']}")
    print(f"\nrefusals: {refused}/{len(refusals)}")
    if refused < len(refusals):
        sys.exit(1)


if __name__ == "__main__":
    run()
