"use client";

import { Fragment } from "react";
import { pinnedRepos } from "@/content/repos";
import { site } from "@/content/site";
import { useRepos } from "@/components/fun/feed";

/**
 * The pinned repositories with their live star counts, in the same mono
 * treatment as `FooterStamp` (docs/apps/portfolio/brand/decisions.md §12).
 * A count the API could not fetch is left out rather than guessed.
 */
export function RepoStamp() {
  const stars = new Map(useRepos().map((r) => [r.name.toLowerCase(), r.stars]));

  return (
    <p className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-xs text-fg-3">
      <span>open source</span>
      {pinnedRepos.map((name) => {
        const count = stars.get(name.toLowerCase());
        return (
          <Fragment key={name}>
            <span aria-hidden>·</span>
            <span className="whitespace-nowrap">
              <a
                href={`https://github.com/${site.github}/${name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring text-fg-2 underline decoration-line underline-offset-4 hover:text-accent hover:decoration-accent"
              >
                {name}
              </a>
              {count !== undefined && (
                <>
                  {" "}
                  <span className="text-fg-2">{count.toLocaleString("en")}</span> {count === 1 ? "star" : "stars"}
                </>
              )}
            </span>
          </Fragment>
        );
      })}
    </p>
  );
}
