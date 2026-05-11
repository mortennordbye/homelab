# syntax=docker/dockerfile:1.7

# ---- Stage 1: generate LaTeX sources from src/content ----
# Runs scripts/build-cv.ts (TypeScript). Output goes into latex/.
FROM node:20-alpine AS texgen
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src/content ./src/content
COPY scripts ./scripts
COPY latex ./latex

RUN npx tsx scripts/build-cv.ts

# ---- Stage 2: compile LaTeX → PDFs ----
# TeX Live image is large but layer-cached in CI between builds.
FROM texlive/texlive:latest AS pdfbuild
WORKDIR /work

COPY --from=texgen /app/latex ./latex

WORKDIR /work/latex
RUN mkdir -p output && \
    xelatex -interaction=nonstopmode -output-directory=output resume.tex && \
    xelatex -interaction=nonstopmode -output-directory=output cv.tex

# ---- Stage 3: build the Next.js static export ----
FROM node:20-alpine AS build
WORKDIR /app

# Install deps with cache-friendly two-step copy
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Build inputs
COPY tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs ./
COPY public ./public
COPY src ./src

# Bake freshly-built PDFs into public/ so the static export includes them.
# xelatex writes output/<input>.pdf — the Makefile renames these to
# Morten-Nordbye-{Resume,CV}.pdf on the host, but inside this Dockerfile
# we copy them straight to their public/ destinations.
COPY --from=pdfbuild /work/latex/output/resume.pdf ./public/resume.pdf
COPY --from=pdfbuild /work/latex/output/cv.pdf ./public/cv.pdf

# Surface the commit SHA into the bundle so the footer can show it
ARG BUILD_SHA=dev
ENV NEXT_PUBLIC_BUILD_SHA=$BUILD_SHA
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- Stage 4: serve via hardened nginx ----
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY --from=build /app/out /usr/share/nginx/html/nordbye.it/
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Hardening: directories 555, files 444 — locks down the document root
RUN find /usr/share/nginx/html/nordbye.it -type d -exec chmod 555 {} \; \
 && find /usr/share/nginx/html/nordbye.it -type f -exec chmod 444 {} \;

USER nginx:nginx

EXPOSE 8080

HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

STOPSIGNAL SIGTERM
CMD ["nginx", "-g", "daemon off;"]
