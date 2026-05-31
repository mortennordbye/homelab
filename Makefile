# Homelab make targets. Tooling is containerized — nothing installed on the host.

.PHONY: diagram
diagram: ## Render the architecture diagram from docs/diagrams/architecture.d2 (D2 → SVG + PNG)
	docker run --rm -v "$(CURDIR)/docs/diagrams:/work" terrastruct/d2:v0.7.1 --pad 30 /work/architecture.d2 /work/architecture.svg
	docker run --rm -v "$(CURDIR)/docs/diagrams:/work" terrastruct/d2:v0.7.1 --pad 30 /work/architecture.d2 /work/architecture.png

.PHONY: help
help: ## List available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
