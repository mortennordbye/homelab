IMAGE      ?= portfolio-modern:dev
PROD_PORT  ?= 8080
PROD_NAME  ?= portfolio-modern-prod
DEV_PORT   ?= 3000
SHA        := $(shell git rev-parse --short HEAD 2>/dev/null || echo dev)

# Containerized node tooling — nothing runs on the host
NODE_IMAGE ?= node:20-alpine
NODE_VOL   ?= portfolio-modern_node_modules

# CV / résumé pipeline
LATEX_DIR  := latex
TEX_IMAGE  ?= texlive/texlive:latest

# Source files that should trigger a CV rebuild when changed
CV_SOURCES := src/content/site.ts \
              src/content/resume.ts \
              src/content/skills.ts \
              scripts/build-cv.ts \
              scripts/lib/templates.ts

.PHONY: help up down logs sh build image run-prod clean cv-gen cv-pdf cv-publish cv

help:  ## Show this help
	@awk 'BEGIN{FS=":.*##"; printf "Targets:\n"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Rebuilds the CV PDFs whenever the content sources are newer than them.
# Make handles the timestamp comparison, so `make up` only re-runs the
# pipeline when something has actually changed.
public/resume.pdf public/cv.pdf: $(CV_SOURCES)
	$(MAKE) cv

up: public/resume.pdf public/cv.pdf  ## Start dev server (Next.js HMR via compose) on http://localhost:$(DEV_PORT). Rebuilds CV first if content changed.
	docker compose up -d
	@echo "→ http://localhost:$(DEV_PORT)"

down:  ## Stop and remove the dev container
	docker compose down

logs:  ## Tail dev container logs
	docker compose logs -f

sh:  ## Shell into the dev container
	docker compose exec dev sh

build:  ## Static export to out/ inside node:20-alpine
	docker run --rm \
	  -v $(PWD):/app \
	  -v $(NODE_VOL):/app/node_modules \
	  -w /app \
	  -e NEXT_TELEMETRY_DISABLED=1 \
	  $(NODE_IMAGE) \
	  sh -c "npm ci && npm run build"

image:  ## Build production Docker image (multi-stage node->nginx)
	docker build --build-arg BUILD_SHA=$(SHA) -t $(IMAGE) .

run-prod: image  ## Build prod image and run nginx on http://localhost:$(PROD_PORT)
	docker rm -f $(PROD_NAME) 2>/dev/null || true
	docker run -d --name $(PROD_NAME) -p $(PROD_PORT):8080 $(IMAGE)
	@echo "→ http://localhost:$(PROD_PORT)"

clean:  ## Remove build artifacts
	rm -rf out .next

# ---------------------------------------------------------------------------
# CV / résumé generation
# ---------------------------------------------------------------------------

cv-gen:  ## Generate .tex files in $(LATEX_DIR) inside node:20-alpine (no host npx)
	docker run --rm \
	  -v $(PWD):/app \
	  -v $(NODE_VOL):/app/node_modules \
	  -w /app \
	  $(NODE_IMAGE) \
	  sh -c "npm install --no-audit --no-fund && npx tsx scripts/build-cv.ts"

cv-pdf:  ## Compile .tex → PDF in Docker (no local TeX Live needed)
	mkdir -p $(LATEX_DIR)/output
	docker run --rm \
	  --user $$(id -u):$$(id -g) \
	  -v $(PWD)/$(LATEX_DIR):/work \
	  -w /work \
	  $(TEX_IMAGE) \
	  bash -c "xelatex -interaction=nonstopmode -output-directory=output resume.tex && \
	           xelatex -interaction=nonstopmode -output-directory=output cv.tex"
	@mv $(LATEX_DIR)/output/resume.pdf $(LATEX_DIR)/output/Morten-Nordbye-Resume.pdf
	@mv $(LATEX_DIR)/output/cv.pdf     $(LATEX_DIR)/output/Morten-Nordbye-CV.pdf
	@echo "✓ PDFs in $(LATEX_DIR)/output/"

cv-publish:  ## Copy compiled PDFs into public/ for next build
	cp $(LATEX_DIR)/output/Morten-Nordbye-Resume.pdf public/resume.pdf
	cp $(LATEX_DIR)/output/Morten-Nordbye-CV.pdf     public/cv.pdf
	@echo "✓ public/{resume,cv}.pdf updated"

cv: cv-gen cv-pdf cv-publish  ## Full pipeline: gen → compile → publish
