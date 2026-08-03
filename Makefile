# Homelab make targets. Tooling is containerized — nothing installed on the host.

.PHONY: diagram
diagram: ## Render every D2 diagram in docs/diagrams (→ SVG + PNG)
	@for f in docs/diagrams/*.d2; do \
		name=$$(basename $$f .d2); \
		echo ">> rendering $$name"; \
		docker run --rm -v "$(CURDIR)/docs/diagrams:/work" terrastruct/d2:v0.7.1 --layout elk --elk-nodeNodeBetweenLayers=35 --elk-padding="[top=25,left=25,bottom=25,right=25]" --pad 40 /work/$$name.d2 /work/$$name.svg; \
	done

.PHONY: social-preview
social-preview: ## Render the GitHub social preview card (→ docs/social-preview/social-preview.png)
	@echo ">> rendering social preview card"
	@docker run --rm -v "$(CURDIR)/docs/social-preview:/work" ubuntu:24.04 bash -c '\
		apt-get update >/dev/null 2>&1 && apt-get install -y librsvg2-bin >/dev/null 2>&1; \
		rsvg-convert -w 1280 -h 640 /work/source.svg -o /work/social-preview.png'
	@echo ">> upload it at Settings > General > Social preview"

.PHONY: logo
logo: ## Render the repo logo (→ docs/logo/logo.png)
	@echo ">> rendering logo"
	@docker run --rm -v "$(CURDIR)/docs/logo:/work" ubuntu:24.04 bash -c '\
		apt-get update >/dev/null 2>&1 && apt-get install -y librsvg2-bin >/dev/null 2>&1; \
		rsvg-convert -w 512 -h 512 /work/source.svg -o /work/logo.png'

.PHONY: help
help: ## List available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
