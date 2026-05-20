# syntax=docker/dockerfile:1.7
#
# Local Hybrid-Retrieval RAG POC — container image.
#
# Why containerize when LM Studio runs on the host? Repo convention says
# "containerize everything runnable" — no native pip on the laptop. The
# container reaches LM Studio at host.docker.internal:1234 (provided by
# Docker Desktop for Mac automatically).

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# build-essential covers the rare case where a transitive dep ships only an
# sdist on aarch64. Most wheels (chromadb, tiktoken) are prebuilt.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY main.py .
COPY web ./web

# Defaults assume the container talks to LM Studio on the Docker Desktop host.
ENV LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1 \
    LM_STUDIO_API_KEY=lm-studio

# Default entrypoint is the CLI. `make web` overrides CMD to launch uvicorn.
CMD ["python", "main.py"]
