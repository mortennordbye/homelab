# Homelab make targets. Tooling is containerized — nothing installed on the host.

.PHONY: diagram
diagram: ## Render every D2 diagram in docs/diagrams (→ SVG + PNG)
	@for f in docs/diagrams/*.d2; do \
		name=$$(basename $$f .d2); \
		echo ">> rendering $$name"; \
		docker run --rm -v "$(CURDIR)/docs/diagrams:/work" terrastruct/d2:v0.7.1 --pad 40 /work/$$name.d2 /work/$$name.svg; \
	done

.PHONY: help
help: ## List available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
