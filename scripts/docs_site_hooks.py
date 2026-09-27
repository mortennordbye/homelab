"""ProperDocs hooks: the home page, nav icons, and links that leave the site pointed at GitHub.

The docs link freely to code (`../../../terraform/...`), to folders, and to the
backlog, none of which are pages on the site. Rewriting them keeps them working
on docs.nordbye.it while `properdocs build --strict` still fails on a broken link
between pages.
"""

import os
import re

from properdocs.structure.files import File

REPO = "https://github.com/mortennordbye/homelab"
LINK = re.compile(r"(\]\()([^)\s#]+)(#[^)\s]*)?(\))")

# Set here, not in front matter, because GitHub renders front matter as a table.
# A new page without an entry just shows without an icon.
ICONS = {
    "apps/media-stack/README.md": "material/television-play",
    "apps/portfolio/README.md": "material/briefcase",
    "apps/portfolio/fun-room.md": "material/gamepad-variant",
    "apps/portfolio/brand/README.md": "material/palette",
    "apps/portfolio/brand/art-direction.md": "material/image",
    "apps/portfolio/brand/assets.md": "material/package-variant",
    "apps/portfolio/brand/decisions.md": "material/book-open-variant",
    "architecture/README.md": "material/sitemap",
    "assets/logo/README.md": "material/image",
    "assets/social-preview/README.md": "material/folder-multiple-image",
    "platform/backups/README.md": "material/backup-restore",
    "platform/backups/pbs.md": "simple/proxmox",
    "platform/backups/restore.md": "material/restore",
    "platform/cluster/README.md": "material/server-network",
    "platform/cluster/gpu-passthrough.md": "material/expansion-card",
    "platform/cluster/proxmox.md": "simple/proxmox",
    "platform/cluster/talos-upgrade.md": "material/arrow-up-bold-circle",
    "platform/cluster/talos.md": "simple/talos",
    "platform/data/README.md": "material/database",
    "platform/data/postgres.md": "simple/postgresql",
    "platform/delivery/README.md": "material/rocket-launch",
    "platform/delivery/kargo.md": "material/truck-delivery",
    "platform/network/README.md": "material/lan",
    "platform/network/cloudflare.md": "simple/cloudflare",
    "platform/network/dns.md": "material/dns",
    "platform/network/remote-access.md": "simple/tailscale",
    "platform/network/unifi.md": "simple/ubiquiti",
    "platform/observability/README.md": "material/chart-line",
    "platform/observability/incidents.md": "material/alert-octagon",
    "platform/secrets/README.md": "simple/bitwarden",
}


# docs/ holds folders only, so the root page is generated; its body is overrides/home.html.
HOME = """---
title: Homelab docs
template: home.html
hide:
  - navigation
  - toc
---
"""


def on_files(files, config):
    files.append(File.generated(config, "index.md", content=HOME))
    return files


def on_page_markdown(markdown, page, config, files):
    page.meta.setdefault("icon", ICONS.get(page.file.src_path))
    docs_dir = config["docs_dir"]
    repo_root = os.path.dirname(config["config_file_path"])
    page_dir = os.path.dirname(os.path.join(docs_dir, page.file.src_path))

    def rewrite(m):
        target = m.group(2)
        if re.match(r"^[a-z]+:", target) or target.startswith("/"):
            return m.group(0)
        path = os.path.normpath(os.path.join(page_dir, target))
        rel_docs = os.path.relpath(path, docs_dir)
        f = None if rel_docs.startswith("..") else files.get_file_from_path(rel_docs.replace(os.sep, "/"))
        # Excluded files (the backlog) are still in the collection but not on the site.
        on_site = f is not None and not f.inclusion.is_excluded()
        if on_site:
            return m.group(0)
        if not os.path.exists(path):
            return m.group(0)  # leave it for strict validation to report
        kind = "tree" if os.path.isdir(path) else "blob"
        rel_repo = os.path.relpath(path, repo_root).replace(os.sep, "/")
        return f"{m.group(1)}{REPO}/{kind}/main/{rel_repo}{m.group(3) or ''}{m.group(4)}"

    return LINK.sub(rewrite, markdown)
