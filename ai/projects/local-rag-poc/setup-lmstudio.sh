#!/usr/bin/env bash
# Declarative LM Studio setup for the local-rag-poc.
#
# Makes the LM Studio side of the POC reproducible: confirms the two required
# models are downloaded (auto-fetches if missing, falls back to GUI guidance
# if `lms get` can't resolve them), loads them with stable API identifiers,
# and starts the local OpenAI-compatible server on port 1234. Idempotent.
#
# Pre-req: the `lms` CLI must be on PATH. LM Studio installs it via:
#     ~/.lmstudio/bin/lms bootstrap        # macOS / Linux
# After that, restart your shell.
#
# Run:
#     bash setup-lmstudio.sh
#     # or:
#     make lm-setup

set -euo pipefail

# ---------------------------------------------------------------------------
# Declarative spec — change these to swap models. The script reads nothing
# else; this block IS the source of truth.
# ---------------------------------------------------------------------------
#
# Per model, three fields:
#   *_MATCH:  substring grepped against `lms ls` to detect a local copy. Use
#             a stable fragment of the repo/file name (case-insensitive).
#   *_REPO:   what `lms get` pulls. Must match the HF repo path exactly,
#             INCLUDING case (HF is case-sensitive).
#   *_ID:     the API identifier `lms load --identifier` registers the model
#             under. This is what the OpenAI-compatible /v1/models endpoint
#             exposes, and what `EMBED_MODEL` / `CHAT_MODEL` in .env reference.

EMBED_MATCH="nomic-embed-text-v1.5"
EMBED_REPO="nomic-ai/nomic-embed-text-v1.5-GGUF"
EMBED_ID="text-embedding-nomic-embed-text-v1.5"

# Default chat model: Llama 3.1 8B Instruct (Q4_K_M, ~4.9 GB GGUF).
# Solid general-purpose baseline that pairs cleanly with the strict
# "answer only from context" prompt. To swap, change all three fields below
# and re-run `make lm-setup` — the new model will load alongside (or replace)
# the currently loaded one, depending on LM Studio's RAM budget.
#
# Other models already on this machine you can swap in (per `lms ls`):
#   MATCH=gpt-oss-20b                REPO=mlx-community/gpt-oss-20b              ID=gpt-oss-20b
#     (MLX MXFP4, ~12 GB — strongest reasoning, OpenAI-aligned chat format)
#   MATCH=gemma-3-12b-it-abliterated REPO=mlabonne/gemma-3-12b-it-abliterated    ID=gemma-3-12b
#   MATCH=qwen3-coder-30b            REPO=lmstudio-community/qwen3-coder-30b     ID=qwen3-coder-30b
#     (heavyweight, best for code/technical specs)
#   MATCH=gemma-3-4b                 REPO=mlx-community/gemma-3-4b               ID=gemma-3-4b
#     (lightweight fallback)
CHAT_MATCH="Meta-Llama-3.1-8B-Instruct"
CHAT_REPO="lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF"
CHAT_ID="llama-3.1-8b-instruct"

# Quantization preference used by the HF fallback (curl directly to ~/.lmstudio).
# Q4_K_M is the sweet spot for both models recommended above.
QUANT="Q4_K_M"

# Server port the script (and main.py) expect.
PORT="1234"

# Context window to load the CHAT model with. Llama-3.1-8B-Instruct natively
# supports 128k, but `lms load` defaults to ~2048 tokens unless told otherwise.
# With TOP_K=6 chunks of ~200 tokens each plus the prompt template, document
# inventory, and question, ~2048 is too small and LM Studio returns
# `Context size has been exceeded`. 8192 leaves comfortable headroom; bump
# higher if you raise TOP_K or CHUNK_SIZE in main.py.
CHAT_CTX="8192"

# Where LM Studio stores model files. Files dropped here are picked up by
# `lms ls` and become loadable.
LMSTUDIO_MODELS_DIR="${HOME}/.lmstudio/models"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log()  { printf '\033[1;34m[lm-setup]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[lm-setup]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[lm-setup]\033[0m %s\n' "$*" >&2; }

require_lms() {
  if ! command -v lms >/dev/null 2>&1; then
    err "The 'lms' CLI is not on PATH."
    err "Install with:  ~/.lmstudio/bin/lms bootstrap"
    err "(LM Studio must be installed first — https://lmstudio.ai)"
    exit 1
  fi
}

# Case-insensitive substring search against `lms ls` output. Uses fgrep so the
# pattern isn't reinterpreted as regex (the org/repo separators are noise to us).
model_downloaded() {
  lms ls 2>/dev/null | grep -Fqi -- "$1"
}

model_loaded() {
  lms ps 2>/dev/null | grep -Fqi -- "$1"
}

# Look up the exact .gguf filename in an HF repo that matches a quantization.
# Uses the public HF tree API — no auth needed for public repos.
hf_find_gguf() {
  local repo="$1"
  local quant="$2"
  curl -fsSL "https://huggingface.co/api/models/${repo}/tree/main" 2>/dev/null \
    | tr ',' '\n' \
    | grep -oE '"path":"[^"]+\.gguf"' \
    | sed 's/^"path":"//; s/"$//' \
    | grep -i "${quant}" \
    | head -n1
}

# Direct HF download into LM Studio's models tree. Bypasses `lms get`, which
# breaks on mixed-case HF repo paths (it lowercases the path before resolving,
# and HF is case-sensitive). After the file lands here, `lms ls` sees it and
# `lms load` can use it.
download_from_hf() {
  local repo="$1"     # case-sensitive, e.g. lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
  local quant="$2"    # e.g. Q4_K_M
  local label="$3"

  log "Resolving ${label} on Hugging Face: ${repo} (quant=${quant})…"
  local file
  file="$(hf_find_gguf "${repo}" "${quant}")"
  if [[ -z "${file}" ]]; then
    err "No .gguf file matching '${quant}' found in https://huggingface.co/${repo}"
    err "Check the repo's Files tab and either rename QUANT in this script or"
    err "set ${label^^}_REPO to a repo that publishes a ${quant} variant."
    exit 1
  fi

  local dest_dir="${LMSTUDIO_MODELS_DIR}/${repo}"
  local dest="${dest_dir}/${file}"
  local url="https://huggingface.co/${repo}/resolve/main/${file}"

  if [[ -f "${dest}" ]]; then
    log "${label} already at ${dest} — skipping."
    return 0
  fi

  log "Downloading ${file} from ${repo}…"
  log "  -> ${dest}"
  mkdir -p "${dest_dir}"

  # --progress-bar gives a single-line bar (vs --silent which hides everything
  # or default which spams progress columns). --fail-with-body surfaces HF
  # error responses instead of a generic curl error.
  curl -L --fail-with-body --progress-bar -o "${dest}.partial" "${url}"
  mv "${dest}.partial" "${dest}"
  log "Downloaded ${label}."
}

ensure_downloaded() {
  local match="$1"
  local repo="$2"
  local label="$3"

  if model_downloaded "${match}"; then
    log "${label} already downloaded (matched '${match}' in lms ls) — skipping."
    return 0
  fi

  # Strategy: try `lms get` first (cheap + uses LM Studio's own download
  # plumbing). If it 404s on case-normalization or anything else, fall
  # straight back to a direct HF curl — slower path but bullet-proof.

  log "Downloading ${label} — attempt 1: lms get '${repo}'…"
  if lms get "${repo}" --yes 2>/dev/null; then
    return 0
  fi

  log "  attempt 1 failed; attempt 2: lms get '${match}' (catalog search)…"
  if lms get "${match}" --yes 2>/dev/null; then
    return 0
  fi

  log "  attempts via lms failed (known mixed-case quirk in lms get)."
  log "  attempt 3: direct Hugging Face download into ${LMSTUDIO_MODELS_DIR}/${repo}…"
  download_from_hf "${repo}" "${QUANT}" "${label}"
}

ensure_loaded() {
  local match="$1"
  local repo="$2"
  local identifier="$3"
  local label="$4"
  local ctx="${5:-}"   # optional: --context-length value

  if model_loaded "${identifier}"; then
    log "${label} already loaded as '${identifier}' — skipping."
    return 0
  fi

  local ctx_args=()
  if [[ -n "${ctx}" ]]; then
    ctx_args=(--context-length "${ctx}")
    log "Loading ${label} as '${identifier}' (context-length=${ctx})…"
  else
    log "Loading ${label} as '${identifier}'…"
  fi

  # Try the full repo path first; fall back to the substring match in case
  # `lms load` wants the local key rather than the HF path.
  if ! lms load "${repo}" --identifier "${identifier}" "${ctx_args[@]}" --yes 2>/dev/null; then
    log "  retrying with local key '${match}'…"
    lms load "${match}" --identifier "${identifier}" "${ctx_args[@]}" --yes
  fi
}

ensure_server() {
  # `lms server status` can return success even when the HTTP server isn't
  # bound to ${PORT} — probe the actual endpoint instead.
  if curl -fsS "http://localhost:${PORT}/v1/models" >/dev/null 2>&1; then
    log "Local server already serving on port ${PORT} — skipping."
    return 0
  fi

  log "Starting LM Studio local server on port ${PORT}…"
  lms server start --port "${PORT}"

  # `lms server start` returns once the daemon accepts the start command,
  # not once the HTTP listener is bound. Poll the endpoint for a few seconds.
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS "http://localhost:${PORT}/v1/models" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  err "Server start command returned, but /v1/models is still not reachable on :${PORT}."
  err "Open LM Studio → Developer → Local Server and confirm it's listening on ${PORT}."
  exit 1
}

verify() {
  log "Verifying /v1/models endpoint…"
  local models
  models="$(curl -fsS "http://localhost:${PORT}/v1/models" || true)"
  if [[ -z "${models}" ]]; then
    err "Could not reach http://localhost:${PORT}/v1/models. Is the server up?"
    exit 1
  fi

  for id in "${EMBED_ID}" "${CHAT_ID}"; do
    if printf '%s' "${models}" | grep -q "\"${id}\""; then
      log "  ✓ ${id} is exposed"
    else
      err "  ✗ ${id} is NOT exposed by the server"
      err "    Loaded models reported by the API:"
      printf '%s' "${models}" | grep -oE '"id":[[:space:]]*"[^"]+"' | sed 's/^/      /'
      exit 1
    fi
  done

  log "LM Studio is configured and ready for: make run"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

require_lms

# `curl` is needed for the HF fallback path and for verify().
if ! command -v curl >/dev/null 2>&1; then
  err "'curl' is required (used for the Hugging Face direct-download fallback)."
  exit 1
fi

ensure_downloaded "${EMBED_MATCH}" "${EMBED_REPO}" "embedding model"
ensure_downloaded "${CHAT_MATCH}"  "${CHAT_REPO}"  "chat model"

ensure_loaded "${EMBED_MATCH}" "${EMBED_REPO}" "${EMBED_ID}" "embedding model"
ensure_loaded "${CHAT_MATCH}"  "${CHAT_REPO}"  "${CHAT_ID}"  "chat model" "${CHAT_CTX}"

ensure_server
verify
