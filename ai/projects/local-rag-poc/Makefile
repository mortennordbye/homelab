# Local Hybrid-Retrieval RAG POC — Docker-wrapped run targets.
#
# All targets shell out to Docker so no native pip is needed on the laptop.
# LM Studio still runs natively on the host; the container reaches it via
# host.docker.internal (Docker Desktop for Mac handles this automatically).

IMAGE := local-rag-poc:dev

.PHONY: lm-setup lm-status lm-stop sample build run shell clean

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
# on the host. By default drops into an interactive REPL — override with
# QUESTION=… to run a single query and exit:
#     QUESTION="What is the late-payment interest rate?" make run
run: build
	docker run --rm -it \
		--add-host=host.docker.internal:host-gateway \
		-e QUESTION \
		-e DOC_DIR \
		-v "$(PWD)":/app \
		$(IMAGE)

# Interactive shell — handy for poking at the chunks or trying alt queries.
shell: build
	docker run --rm -it \
		--add-host=host.docker.internal:host-gateway \
		-v "$(PWD)":/app \
		--entrypoint /bin/bash \
		$(IMAGE)

clean:
	rm -rf local_poc_db __pycache__
	docker image rm -f $(IMAGE) || true

# Wipe the fixture PDFs (regenerate them with `make sample`).
.PHONY: clean-samples
clean-samples:
	rm -f contracts/contract_*.pdf
