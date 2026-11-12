# syntax=docker/dockerfile:1.29@sha256:572cebbc2b15e6f84c077742952674889cb63cd5e9b80abdffcbe587b6f19183

# ---- Stage 1: generate LaTeX sources from src/content ----
# Runs scripts/build-cv.ts (TypeScript). Output goes into latex/.
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS texgen
WORKDIR /app

COPY package.json package-lock.json ./
COPY patches ./patches
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
FROM texlive/texlive:latest@sha256:7334b00bf8e7a0996f7ddd65482363aaf7711d372e569f3ea78509619e3083ff AS pdfbuild
WORKDIR /work

COPY --from=texgen /app/latex ./latex

WORKDIR /work/latex
RUN mkdir -p output && \
    for f in resume.tex cv-*.tex; do \
      echo "→ xelatex $f"; \
      xelatex -interaction=nonstopmode -halt-on-error -output-directory=output "$f" >/dev/null \
        || { tail -n 40 "output/${f%.tex}.log"; exit 1; }; \
    done

# Page one of each CV as a JPEG, for the sheet the /fun printer feeds out.
# 96 dpi is A4 at 794x1123: headings legible on a 0.21m sheet up close.
# gs reads the PDF on stdin and writes to /tmp: GitHub's runners deny gs opening files under /work.
RUN for f in output/cv-*.pdf; do \
      jpg="/tmp/$(basename "${f%.pdf}").jpg"; \
      gs -q -dSAFER -dBATCH -dNOPAUSE -sDEVICE=jpeg -dJPEGQ=82 -r96 \
        -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -dFirstPage=1 -dLastPage=1 \
        -sOutputFile="$jpg" - < "$f" && mv "$jpg" output/ || exit 1; \
    done

# ---- Stage 3: build the Next.js server bundle ----
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS build
WORKDIR /app

# Install deps with cache-friendly two-step copy
COPY package.json package-lock.json ./
COPY patches ./patches
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --include=dev --prefer-offline --no-audit --no-fund

# Build inputs
COPY tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs ./
COPY public ./public
COPY src ./src

# Bake the freshly-built PDFs + customizer manifest into public/ so they ship
# as runtime assets under /.
COPY --from=pdfbuild /work/latex/output/resume.pdf ./public/resume.pdf
COPY --from=pdfbuild /work/latex/output/cv-*.pdf ./public/
COPY --from=pdfbuild /work/latex/output/cv-*.jpg ./public/
COPY --from=texgen /app/public/cv-manifest.json ./public/cv-manifest.json

# Surface the commit SHA into the bundle so the footer can show it
ARG BUILD_SHA=dev
ENV NEXT_PUBLIC_BUILD_SHA=$BUILD_SHA
ENV NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ---- Stage cv-bundle: dev-server volume populator ----
# Merges host public/ with the built CV artifacts for compose.yaml's one-shot
# service, so the dev server serves the real CV without writing to the host.
# Skipped automatically when CI targets the runtime image.
FROM alpine@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf AS cv-bundle
WORKDIR /staging
COPY public/ ./
COPY --from=pdfbuild /work/latex/output/resume.pdf ./resume.pdf
COPY --from=pdfbuild /work/latex/output/cv-*.pdf ./
COPY --from=pdfbuild /work/latex/output/cv-*.jpg ./
COPY --from=texgen /app/public/cv-manifest.json ./cv-manifest.json

# ---- Stage 4: serve the Next.js server on distroless Node ----
# No shell, runs as nonroot (uid 65532). The only writable path the server
# needs is .next/cache, mounted as an emptyDir in the Deployment so
# readOnlyRootFilesystem still holds.
FROM gcr.io/distroless/nodejs26-debian13@sha256:80631bd2f0e7ef192138a7409013b47d92fd11b8ff3bb35f5c0a65be3ecaea4c AS runtime
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
