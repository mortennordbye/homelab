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

# ---- Stage 3: build the Next.js static export ----
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

# Pre-compress static assets so nginx (gzip_static on) serves the .gz
# straight from disk instead of compressing on every request.
RUN find out -type f \
      \( -name "*.js" -o -name "*.css" -o -name "*.html" \
       -o -name "*.svg" -o -name "*.json" -o -name "*.txt" \
       -o -name "*.xml" -o -name "*.webmanifest" \) \
      -exec gzip -9 -k {} \;

# ---- Stage cv-bundle: dev-server volume populator ----
# Merges the host's static public/ assets with the freshly-built CV
# artifacts into /staging. A one-shot service in compose.yaml runs
# this image and `cp`s /staging into a named volume, which the dev
# container then mounts read-only at /app/public. The result: the
# dev server serves the real CV without writing anything to the
# host filesystem.
#
# Never built when targeting the production nginx image — CI's
# `docker build .` skips this stage automatically.
FROM alpine AS cv-bundle
WORKDIR /staging
COPY public/ ./
COPY --from=pdfbuild /work/latex/output/resume.pdf ./resume.pdf
COPY --from=pdfbuild /work/latex/output/cv-*.pdf ./
COPY --from=texgen /app/public/cv-manifest.json ./cv-manifest.json

# ---- Stage 4: serve via hardened nginx ----
# nginx-unprivileged ships writable /tmp + writable temp paths and listens
# on 8080 as the nginx user out of the box, so we can drop the manual USER
# directive and the -u root workaround the plain nginx:alpine image needed.
# Brotli precompression was attempted here but apk's nginx-mod-http-brotli
# is ABI-pinned to alpine's nginx build, which doesn't match nginxinc's
# custom build — leaving as gzip-only until we either compile the module
# from source or switch to a brotli-bundled image. Tracked in BACKLOG.
# -slim drops the xslt/image-filter/geoip/perl/njs modules this static site
# never loads, which removes their lib deps (libxml2, libxslt, libpng, libgd)
# and the OS-package CVEs that come with them. gzip_static is a core module and
# survives slim. 1.29 is the current stable line — fresher openssl/expat.
FROM nginxinc/nginx-unprivileged:1.31-alpine-slim

COPY --from=build /app/out /usr/share/nginx/html/nordbye.it/
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Hardening: directories 555, files 444 — locks down the document root.
# Needs USER root temporarily because the unprivileged image defaults to
# the nginx user.
USER root
RUN find /usr/share/nginx/html/nordbye.it -type d -exec chmod 555 {} \; \
 && find /usr/share/nginx/html/nordbye.it -type f -exec chmod 444 {} \;
USER nginx

WORKDIR /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

STOPSIGNAL SIGTERM
CMD ["nginx", "-g", "daemon off;"]
