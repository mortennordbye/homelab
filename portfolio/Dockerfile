# syntax=docker/dockerfile:1.25

# ---- Stage 1: generate LaTeX sources from src/content ----
# Runs scripts/build-cv.ts (TypeScript). Output goes into latex/.
FROM node:24-alpine AS texgen
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --include=dev --prefer-offline --no-audit --no-fund

COPY tsconfig.json ./
COPY src/content ./src/content
COPY scripts ./scripts
COPY latex ./latex

RUN npx tsx scripts/build-cv.ts

# ---- Stage 2: compile LaTeX → PDFs ----
# TeX Live image is large but layer-cached in CI between builds.
# Compiles every entry point emitted by build-cv.ts: resume.tex + 16
# cv-SCHP.tex variants (S/C/H/P = skills, clientProjects, homeLab, photo).
FROM texlive/texlive:latest AS pdfbuild
WORKDIR /work

COPY --from=texgen /app/latex ./latex

WORKDIR /work/latex
RUN mkdir -p output && \
    for f in resume.tex cv-*.tex; do \
      echo "→ xelatex $f"; \
      xelatex -interaction=nonstopmode -output-directory=output "$f" >/dev/null; \
    done

# ---- Stage 3: build the Next.js server bundle ----
FROM node:24-alpine AS build
WORKDIR /app

# Install deps with cache-friendly two-step copy
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --include=dev --prefer-offline --no-audit --no-fund

# Build inputs
COPY tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs ./
COPY public ./public
COPY src ./src

# Bake freshly-built PDFs + customizer manifest into public/ so the static
# export includes them. The frontend fetches the manifest at runtime, so
# everything CV-related is a runtime asset under /. xelatex writes
# output/<input>.pdf — copy résumé + all 16 CV variants into public/.
COPY --from=pdfbuild /work/latex/output/resume.pdf ./public/resume.pdf
COPY --from=pdfbuild /work/latex/output/cv-*.pdf ./public/
COPY --from=texgen /app/public/cv-manifest.json ./public/cv-manifest.json

# Surface the commit SHA into the bundle so the footer can show it
ARG BUILD_SHA=dev
ENV NEXT_PUBLIC_BUILD_SHA=$BUILD_SHA
ENV NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ---- Stage cv-bundle: dev-server volume populator ----
# Merges the host's static public/ assets with the freshly-built CV
# artifacts into /staging. A one-shot service in compose.yaml runs
# this image and `cp`s /staging into a named volume, which the dev
# container then mounts read-only at /app/public. The result: the
# dev server serves the real CV without writing anything to the
# host filesystem.
#
# Never built when targeting the production runtime image — CI's
# `docker build .` skips this stage automatically.
FROM alpine AS cv-bundle
WORKDIR /staging
COPY public/ ./
COPY --from=pdfbuild /work/latex/output/resume.pdf ./resume.pdf
COPY --from=pdfbuild /work/latex/output/cv-*.pdf ./
COPY --from=texgen /app/public/cv-manifest.json ./cv-manifest.json

# ---- Stage 4: serve the Next.js server on distroless Node ----
# Distroless nodejs has no shell/package manager — minimal attack surface and
# runs as the built-in `nonroot` user (uid 65532). The standalone output ships
# a trimmed node_modules and a self-contained server.js; only `.next/static`
# and `public` are copied alongside it. At runtime the only writable path the
# server needs is `.next/cache` (ISR/fetch cache), mounted as an emptyDir in
# the Deployment so readOnlyRootFilesystem still holds.
FROM gcr.io/distroless/nodejs24-debian12 AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=build --chown=nonroot:nonroot /app/.next/static ./.next/static
COPY --from=build --chown=nonroot:nonroot /app/public ./public

USER nonroot

EXPOSE 3000

STOPSIGNAL SIGTERM

# Distroless nodejs sets `node` as the entrypoint, so CMD is just the script.
CMD ["server.js"]
