#!/usr/bin/env bash
#
# backup-secrets.sh — snapshot a repo's local-only / git-ignored files and copy
# them to the NAS over SMB.
#
# These files hold real secrets and unversioned work (kubeconfigs, tfvars,
# drafts, …). They're deliberately git-ignored, so a lost laptop loses them.
# This bundles the files listed in the repo's manifest into a timestamped .zip,
# copies it to an SMB share on the NAS (one subfolder per repo), keeps the
# newest $KEEP snapshots, and unmounts the share. Plain zip — Synology File
# Station browses it inline, unlike a .tar.gz.
#
# Only file PATHS live in the repo (the manifest) — never their contents.
#
# Requires: macOS (mount_smbfs, diskutil), git, and zip/unzip (built in).
#
# Reuse in another repo:
#   1. Copy this script into the repo (e.g. scripts/).
#   2. Create a .backup-manifest in the repo root listing the files to back up.
#   3. Run it. The archive and NAS subfolder are named after the repo folder.
#
# Usage:
#   scripts/backup-secrets.sh            # snapshot + copy to the NAS
#   scripts/backup-secrets.sh --list     # print the manifest and exit
#   scripts/backup-secrets.sh --dry-run  # build the zip in $TMPDIR, skip upload
#   scripts/backup-secrets.sh --help     # show usage
#
# Manifest (.backup-manifest, repo-relative paths, one per line):
#   # comments and blank lines are ignored
#   path/to/secret.file
#   some/dir/*.tfvars            # globs allowed (no spaces in paths)
#
# Config (override via env):
#   NAS_HOST         NAS hostname             (default nas.local.bigd.no)
#   NAS_SHARE        SMB share name           (default shared-data)
#   NAS_BACKUP_ROOT  parent dir on the share  (default documents/IT/Repo-Hidden-Files-Backups)
#   NAS_DIR          already-mounted share root; skip mounting
#   MANIFEST_FILE    manifest path            (default <repo-root>/.backup-manifest)
#   KEEP             snapshots to retain      (0 = keep all, default 14)
#
# Auth: always prompts for the SMB username and password (mount_smbfs asks for
# the password itself — no sudo, nothing stored). The NAS needs SMB enabled and
# the share accessible to that user. Or mount it in Finder and pass NAS_DIR.
#
# Restore:
#   cp <share>/.../<repo>/<file>.zip .
#   unzip <file>.zip             # restores paths relative to the repo root
#
set -euo pipefail

NAS_HOST="${NAS_HOST:-nas.local.bigd.no}"
NAS_SHARE="${NAS_SHARE:-shared-data}"
NAS_BACKUP_ROOT="${NAS_BACKUP_ROOT:-documents/IT/Repo-Hidden-Files-Backups}"
NAS_DIR="${NAS_DIR:-}"
KEEP="${KEEP:-14}"

log()  { printf '\033[0;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m[skip]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[0;31m[err]\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [--list | --dry-run | --help]

Snapshot this repo's git-ignored files (listed in .backup-manifest) into a
timestamped .zip and copy it to the NAS over SMB.

  (no args)    snapshot + copy to the NAS
  --list       print the manifest and exit
  --dry-run    build the zip in \$TMPDIR, skip the upload
  --help       show this help

Manifest format and env-var config are documented at the top of this script.
EOF
}

# --- Parse arguments -------------------------------------------------------
MODE=run
case "${1:-}" in
  "")                 MODE=run ;;
  --list)             MODE=list ;;
  --dry-run)          MODE=dry ;;
  -h|--help)          usage; exit 0 ;;
  *)                  usage >&2; die "unknown argument: $1" ;;
esac

# --- Locate the repo and its manifest --------------------------------------
REPO_ROOT="$(git rev-parse --show-toplevel)" || die "not inside the git repo"
cd "$REPO_ROOT"
REPO="$(basename "$REPO_ROOT")"
MANIFEST_FILE="${MANIFEST_FILE:-$REPO_ROOT/.backup-manifest}"
NAS_SUBDIR="$NAS_BACKUP_ROOT/$REPO"

[[ -f "$MANIFEST_FILE" ]] \
  || die "no manifest at $MANIFEST_FILE — create one (one repo-relative path or glob per line; # for comments)"

# Load the manifest: present[] = files that exist, missing[] = listed but absent.
present=()
missing=()
while IFS= read -r raw || [[ -n "$raw" ]]; do
  line="${raw#"${raw%%[![:space:]]*}"}"   # trim leading whitespace
  line="${line%"${line##*[![:space:]]}"}" # trim trailing whitespace
  [[ -z "$line" || "$line" == '#'* ]] && continue
  if matches="$(compgen -G "$line" 2>/dev/null)"; then
    while IFS= read -r m; do [[ -f "$m" ]] && present+=("$m"); done <<< "$matches"
  else
    missing+=("$line")
  fi
done < "$MANIFEST_FILE"

if [[ "$MODE" == list ]]; then
  log "Manifest: $MANIFEST_FILE"
  if (( ${#present[@]} )); then for f in "${present[@]}"; do printf '  \033[0;32m•\033[0m %s\n' "$f"; done; fi
  if (( ${#missing[@]} )); then for f in "${missing[@]}"; do printf '  \033[0;31m✗\033[0m %s (missing)\n' "$f"; done; fi
  exit 0
fi

if (( ${#missing[@]} )); then for f in "${missing[@]}"; do warn "$f not found"; done; fi
(( ${#present[@]} )) || die "nothing to back up — manifest matched no existing files"

# --- Build the archive -----------------------------------------------------
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${REPO}-$(hostname -s)-${STAMP}.zip"

# Cleanup handles both the temp build dir and the SMB mount (if we mounted one).
TMP="$(mktemp -d)"
MNT=""
MOUNTED=false
cleanup() {
  # Always close down a mount we opened — plain umount can fail if the share is
  # briefly busy, so force-unmount as a fallback to avoid leaving it behind.
  if $MOUNTED; then
    umount "$MNT" 2>/dev/null || diskutil unmount force "$MNT" >/dev/null 2>&1 || true
  fi
  [[ -n "$MNT" ]] && rmdir "$MNT" 2>/dev/null || true
  rm -rf "$TMP"
}
trap cleanup EXIT

log "Bundling ${#present[@]} files → $ARCHIVE"
# Paths are repo-relative (we cd'd to the repo root), so the zip restores into
# the same tree on extract.
zip -q "$TMP/$ARCHIVE" "${present[@]}"
log "Archive size: $(du -h "$TMP/$ARCHIVE" | cut -f1)"

if [[ "$MODE" == dry ]]; then
  out="${TMPDIR:-/tmp}/$ARCHIVE"
  cp "$TMP/$ARCHIVE" "$out"
  log "--dry-run: wrote $out, skipped upload"
  exit 0
fi

# --- Resolve the destination: a share you mounted yourself, or mount it -----
if [[ -n "$NAS_DIR" ]]; then
  [[ -d "$NAS_DIR" ]] || die "NAS_DIR '$NAS_DIR' is not a directory (is the share mounted?)"
  BASE="$NAS_DIR"
else
  NAS_USER=""
  while [[ -z "$NAS_USER" ]]; do read -r -p "NAS username: " NAS_USER </dev/tty; done
  # macOS refuses to mount the same SMB share twice ("File exists"). If it's
  # already mounted (Finder, or a prior run), reuse it instead of failing — and
  # don't unmount it on exit, since we didn't open it.
  existing="$(/sbin/mount | awk -v sh="/$NAS_SHARE" '/\(smbfs/ && $1 ~ sh"$" {print $3; exit}')"
  if [[ -n "$existing" ]]; then
    log "//$NAS_HOST/$NAS_SHARE already mounted at $existing — reusing it"
    BASE="$existing"
  else
    MNT="$(mktemp -d)"
    log "Mounting //$NAS_USER@$NAS_HOST/$NAS_SHARE — enter the NAS password when asked"
    # mount_smbfs prompts for the password itself; no sudo, nothing on disk.
    mount_smbfs "//${NAS_USER}@${NAS_HOST}/${NAS_SHARE}" "$MNT" \
      || die "SMB mount failed — check the username/password, that SMB is enabled on the NAS, and that '$NAS_USER' can access '$NAS_SHARE'"
    MOUNTED=true
    BASE="$MNT"
  fi
fi

# --- Copy, verify, prune ---------------------------------------------------
DEST="$BASE/$NAS_SUBDIR"
mkdir -p "$DEST"
log "Copying → $DEST/$ARCHIVE"
cp "$TMP/$ARCHIVE" "$DEST/"

# Read the zip back from the NAS and CRC-test every entry — catches truncated
# SMB writes before we trust the backup.
unzip -tqq "$DEST/$ARCHIVE" >/dev/null 2>&1 \
  || die "verify failed: the copy on the NAS is unreadable or corrupt"
dst_n="$(zipinfo -1 "$DEST/$ARCHIVE" 2>/dev/null | grep -cv '/$' || true)"
[[ "$dst_n" == "${#present[@]}" ]] \
  || die "verify failed: expected ${#present[@]} files, the copy on the NAS has $dst_n"
log "Verified $dst_n files in $ARCHIVE on the NAS"

if [[ "$KEEP" -gt 0 ]]; then
  log "Pruning to newest $KEEP snapshots"
  # Our archive names are timestamped (no spaces/newlines), so sorting by mtime
  # with `ls -t` is safe and simpler than a portable find-based sort.
  # shellcheck disable=SC2012
  ls -1t "$DEST/${REPO}-"*.zip 2>/dev/null | tail -n +$((KEEP + 1)) \
    | while read -r old; do rm -f "$old"; done
fi

log "Done — $NAS_SUBDIR/$ARCHIVE on the NAS"
