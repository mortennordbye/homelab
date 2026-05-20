# Local Hybrid-Retrieval RAG POC — Docker-wrapped run targets.
#
# All targets shell out to Docker so no native pip is needed on the laptop.
# LM Studio still runs natively on the host; the container reaches it via
# host.docker.internal (Docker Desktop for Mac handles this automatically).

IMAGE := local-rag-poc:dev
WEB_PORT ?= 8000

.PHONY: lm-setup lm-status lm-stop sample build run shell up web web-shell clean

# Declaratively download + load the two required LM Studio models and start
# the local server. Idempotent — safe to re-run. See setup-lmstudio.sh for
# the model spec.
lm-setup:
	bash setup-lmstudio.sh

# Inspect what LM Studio is currently serving.
lm-status:
	@echo "--- loaded models ---"
	@lms ps || true
	@echo "--- server status ---"
	@lms server status || true
	@echo "--- /v1/models ---"
	@curl -fsS http://localhost:1234/v1/models || echo "(server unreachable)"

# Stop the local server — leaves models downloaded but unloads them.
lm-stop:
	-lms server stop

# Generate the fictional contract fixtures (contract_<slug>.pdf, one per
# VARIANT in the generator script). Each contract has distinct parties,
# currency, payment terms, error-code namespace, SLA, and jurisdiction so
# the multi-doc loader has things to compare across documents.
# Runs in a one-shot python:3.12-slim container — no native pip needed.
.PHONY: sample
sample:
	docker run --rm \
		-v "$(PWD)":/work -w /work \
		python:3.12-slim \
		sh -c "pip install --quiet --no-cache-dir reportlab && python scripts/generate-samples.py"

build:
	docker build -t $(IMAGE) .

# `make run` rebuilds the image, mounts the project folder so the script sees
# the user's PDFs/DOCX plus the persisted Chroma DB, and connects to LM Studio
# on the host. By default drops into an interactive REPL with the hybrid
# retriever. Override with:
#     QUESTION="What is the late-payment interest rate?" make run
#     MODE=vector make run           # use the dense (Chroma) retriever only
#     MODE=bm25    make run          # use the sparse (BM25) retriever only
#     MODE=hybrid  make run          # default
run: build
	docker run --rm -it \
		--add-host=host.docker.internal:host-gateway \
		-e QUESTION \
		-e DOC_DIR \
		-e MODE \
		-v "$(PWD)":/app \
		$(IMAGE)

# Interactive shell — handy for poking at the chunks or trying alt queries.
shell: build
	docker run --rm -it \
		--add-host=host.docker.internal:host-gateway \
		-v "$(PWD)":/app \
		--entrypoint /bin/bash \
		$(IMAGE)

# Launch the three-mode comparison web UI. Builds all three retrievers at
# startup (slow cold-start: chunking + Chroma fingerprint check + BM25 index),
# then serves on http://localhost:$(WEB_PORT). The same volume mount as `run`
# means a fresh PDF added to ./contracts/ will be picked up on the next
# `make web`.
# One-shot bring-up: ensure LM Studio is serving the required models, then
# build + run the web UI. `lm-setup` is idempotent — if the models are already
# downloaded, loaded, and the server is up, it just verifies and exits.
up:
	@$(MAKE) --no-print-directory lm-setup
	@$(MAKE) --no-print-directory web

web: build
	@echo ""
	@echo "  ▸ local-rag-poc web UI →  http://localhost:$(WEB_PORT)"
	@echo "    (cold start: chunking + index build — first request after 'ready' is fast)"
	@echo ""
	docker run --rm -it \
		--add-host=host.docker.internal:host-gateway \
		-e DOC_DIR \
		-v "$(PWD)":/app \
		-p $(WEB_PORT):8000 \
		$(IMAGE) \
		uvicorn web.app:app --host 0.0.0.0 --port 8000

# Same image, but drop into bash — useful for inspecting installed packages
# or running uvicorn with custom flags (--reload, --log-level, etc.).
web-shell: build
	docker run --rm -it \
		--add-host=host.docker.internal:host-gateway \
		-v "$(PWD)":/app \
		-p $(WEB_PORT):8000 \
		--entrypoint /bin/bash \
		$(IMAGE)

clean:
	rm -rf local_poc_db __pycache__
	docker image rm -f $(IMAGE) || true

# Wipe the fixture PDFs (regenerate them with `make sample`).
.PHONY: clean-samples
clean-samples:
	rm -f contracts/contract_*.pdf
