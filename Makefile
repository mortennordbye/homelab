# Homelab make targets. Tooling is containerized — nothing installed on the host.

.PHONY: diagram
diagram: ## Render every D2 diagram in docs/assets/diagrams (→ SVG + PNG)
	@for f in docs/assets/diagrams/*.d2; do \
		name=$$(basename $$f .d2); \
		echo ">> rendering $$name"; \
		docker run --rm -v "$(CURDIR)/docs/assets/diagrams:/work" terrastruct/d2:v0.7.1 --layout elk --elk-nodeNodeBetweenLayers=35 --elk-padding="[top=25,left=25,bottom=25,right=25]" --pad 40 /work/$$name.d2 /work/$$name.svg; \
	done

.PHONY: social-preview
social-preview: ## Render the GitHub social preview card (→ docs/assets/social-preview/social-preview.png)
	@echo ">> rendering social preview card"
	@docker run --rm -v "$(CURDIR)/docs/assets/social-preview:/work" \
		-v "$(CURDIR)/portfolio/src/app/og-fonts:/usr/local/share/fonts/og:ro" ubuntu:24.04 bash -c '\
		apt-get update >/dev/null 2>&1 && apt-get install -y librsvg2-bin fontconfig >/dev/null 2>&1; fc-cache -f >/dev/null; \
		rsvg-convert -w 1280 -h 640 /work/source.svg -o /work/social-preview.png'
	@echo ">> upload it at Settings > General > Social preview"

.PHONY: logo
logo: ## Render the repo logo (→ docs/assets/logo/logo.png)
	@echo ">> rendering logo"
	@docker run --rm -v "$(CURDIR)/docs/assets/logo:/work" ubuntu:24.04 bash -c '\
		apt-get update >/dev/null 2>&1 && apt-get install -y imagemagick pngquant >/dev/null 2>&1; \
		convert /work/source.jpg -crop 460x460+280+300 +repage -resize 512x512 \
			\( +clone -alpha transparent -fill white -draw "circle 256,256 256,4" \) \
			-compose copyopacity -composite png32:/tmp/logo-raw.png; \
		pngquant --quality 70-95 --force --output /work/logo.png /tmp/logo-raw.png'

.PHONY: docs
docs: ## Preview the docs site at http://localhost:8000 (same versions as .github/workflows/docs.yaml)
	@docker run --rm -it -p 8000:8000 -v "$(CURDIR):/repo" -w /repo python:3.14-slim sh -c '\
		pip install -q --root-user-action=ignore --require-hashes -r scripts/docs-requirements.txt && \
		properdocs serve --strict -a 0.0.0.0:8000'

.PHONY: help
help: ## List available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
