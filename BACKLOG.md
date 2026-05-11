# Backlog

Known gaps the team has agreed to leave for later. Each entry: **what**, **why deferred**, **what unblocks**, **where**.

## Portfolio modern — items deferred during initial build

### Docker build verification
- **What:** Build and run `portfolio-modern/Dockerfile` end-to-end (`docker build` then `docker run -p 8080:8080`) and confirm `/healthz`, security headers, and routing work as expected.
- **Why deferred:** Local build was verified via `npm run build` + `npx serve out`; Docker layer not run during the rebuild session.
- **Unblock:** `cd portfolio-modern && docker build -t portfolio-modern:dev .` then exercise the routes.
- **Where:** `portfolio-modern/Dockerfile`, `portfolio-modern/nginx/`.

### OG / social-card images
- **What:** Add `app/opengraph-image.tsx` (root) and `app/work/[slug]/opengraph-image.tsx` so links to the site render rich previews.
- **Why deferred:** Out of scope for the initial cut — site is functional without it; first-time deploys pull a default OG.
- **Unblock:** Decide whether to use Next's `ImageResponse` (works under static export) or a build-time script with `@vercel/og`.
- **Where:** `portfolio-modern/src/app/`.

### Lighthouse / axe verification on the live stage URL
- **What:** Run Lighthouse mobile + `@axe-core/cli` against the deployed `portfolio-stage` URL and act on findings (target ≥95 perf / 100 a11y / 100 SEO).
- **Why deferred:** Site has not yet been deployed to stage — first push to `portfolio-modern/**` will trigger CI and deploy.
- **Unblock:** Push the branch, wait for ArgoCD sync, run Lighthouse against `portfolio-stage.local.bigd.no`.
- **Where:** Run from `portfolio-modern/` after deploy.

### Cutover from old portfolio to new
- **What:** Once the new site is approved on stage, promote it to prod (`workflow_dispatch` → `environment: prod`) and remove the old `portfolio/` tree + `.github/workflows/build-portfolio.yaml`.
- **Why deferred:** User chose stage-first cutover. Old portfolio stays in the repo until promotion is approved.
- **Unblock:** User reviews stage, then triggers the prod workflow_dispatch, then opens a cleanup PR.
- **Where:** `portfolio/`, `.github/workflows/build-portfolio.yaml`, `k8s/talos/apps/portfolio*/deployment.yaml`.

### CI auto-rebuild of CV/résumé PDFs on content change
- **What:** GitHub Action that runs `cd portfolio-modern && make cv` (with TeX Live in CI) when `src/content/{site,resume,skills}.ts` changes, then commits the refreshed `public/{resume,cv}.pdf` back to the branch.
- **Why deferred:** Manual `make cv` works fine for now; user can re-run locally and commit the PDFs. Adding CI = an extra ~3 GB Docker layer or a `xu-cheng/latex-action` step in the workflow.
- **Unblock:** Decide whether the CI runs the full TeX Live image (slow but cached) or a slim variant. Add a `.github/workflows/build-cv.yaml`.
- **Where:** `.github/workflows/`, `portfolio-modern/Makefile` already has the targets.

### Tighten résumé bullet copy for PDF density
- **What:** The website resume bullets read more like LinkedIn paragraphs than CV bullets — fine for the web (long-form) but pushes the PDF to 2 pages with dense text. Tightening to 1 sentence per `\item` would let the résumé fit on a single page.
- **Why deferred:** Single-source-of-truth design means tightening for the PDF would shorten the website too — that's a content-voice decision, not a tooling fix.
- **Unblock:** Edit each `description` array in `src/content/resume.ts` to 1 punchy sentence per element.
- **Where:** `portfolio-modern/src/content/resume.ts`.

### Image optimization pass
- **What:** Re-encode the migrated case-study images via `sharp` to a normalised max-width and AVIF + WebP. Drop any unused PNGs that weren't migrated.
- **Why deferred:** Existing WebPs work fine; this is a perf optimisation, not a blocker.
- **Unblock:** Add a `scripts/optimize-images.ts` step that runs `sharp` over `public/images/`.
- **Where:** `portfolio-modern/public/images/`.
