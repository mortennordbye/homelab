IMAGE      ?= portfolio:dev
PROD_PORT  ?= 8080
PROD_NAME  ?= portfolio-prod
DEV_PORT   ?= 3000
SHA        := $(shell git rev-parse --short HEAD 2>/dev/null || echo dev)

.PHONY: help up build down logs sh lint typecheck image run-prod clean

help:  ## Show this help
	@awk 'BEGIN{FS=":.*##"; printf "Targets:\n"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up:  ## Start the dev stack using the current images (no rebuild). First run auto-builds. http://localhost:$(DEV_PORT)
	docker compose up -d
	@echo "→ http://localhost:$(DEV_PORT)"

build:  ## Rebuild the dev stack. Brings the stack down first if it is running, otherwise goes straight to build. Single command to run after any change.
	@if [ -n "$$(docker compose ps -q 2>/dev/null)" ]; then \
	  echo "→ stack is running, bringing it down first..."; \
	  docker compose down; \
	fi
	docker compose up -d --build
	@echo "→ http://localhost:$(DEV_PORT)"

down:  ## Stop and remove the dev containers (volumes are kept — use `make clean` to drop them).
	docker compose down

logs:  ## Tail dev container logs
	docker compose logs -f

sh:  ## Shell into the dev container
	docker compose exec dev sh

lint:  ## Run ESLint in Docker (same check as CI)
	docker run --rm -v $(PWD):/app -w /app node:24-alpine sh -c "npm ci --no-audit --no-fund && npm run lint"

typecheck:  ## Run tsc --noEmit in Docker (same check as CI)
	docker run --rm -v $(PWD):/app -w /app node:24-alpine sh -c "npm ci --no-audit --no-fund && npm run typecheck"

image:  ## Build the production Docker image (multi-stage node→nginx; same path as CI)
	docker build --build-arg BUILD_SHA=$(SHA) -t $(IMAGE) .

run-prod: image  ## Build the prod image and run nginx on http://localhost:$(PROD_PORT)
	docker rm -f $(PROD_NAME) 2>/dev/null || true
	docker run -d --name $(PROD_NAME) -p $(PROD_PORT):8080 $(IMAGE)
	@echo "→ http://localhost:$(PROD_PORT)"

clean: down  ## Stop dev stack and drop its volumes (cv-bundle + Turbopack cache + node_modules)
	rm -rf out
	docker volume rm \
	  portfolio_cv-bundle \
	  portfolio_next-cache \
	  portfolio_node_modules \
	  2>/dev/null || true

# CV / résumé generation has no standalone target and never touches
# the host filesystem. The 17 PDFs and the customizer manifest are
# produced inside Docker only: CI bakes them into the production nginx
# image; `make up` populates a Docker volume via the cv-bundle service
# in compose.yaml, which the dev container mounts read-only at
# /app/public. To preview the production image locally, run
# `make run-prod`.
