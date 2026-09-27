"""ProperDocs hook: point links that leave the site at the file on GitHub.

The docs link freely to code (`../../../terraform/...`), to folders, and to the
backlog, none of which are pages on the site. Rewriting them keeps them working
on docs.nordbye.it while `properdocs build --strict` still fails on a broken link
between pages.
"""

import os
import re

REPO = "https://github.com/mortennordbye/homelab"
LINK = re.compile(r"(\]\()([^)\s#]+)(#[^)\s]*)?(\))")


def on_page_markdown(markdown, page, config, files):
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
