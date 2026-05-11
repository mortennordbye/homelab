"use client";

import Link from "next/link";
import { ArrowRight, RotateCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-start justify-center px-5 md:px-8">
      <p className="font-display text-xs uppercase tracking-[0.3em] text-accent">
        500 — something broke
      </p>
      <h1 className="mt-6 text-display-lg font-display text-fg leading-[1]">
        That didn&apos;t go{" "}
        <span className="gradient-text">according to plan.</span>
      </h1>
      <p className="mt-6 max-w-xl text-fg-2">
        Something went wrong rendering this page. The error has been logged.
        Try again, or head back to the front page.
      </p>
      {error.digest && (
        <p className="mt-4 font-mono text-xs text-fg-3">
          digest: {error.digest}
        </p>
      )}
      <div className="mt-10 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-sm text-accent-ink transition-all hover:shadow-[0_0_44px_-8px_var(--accent)]"
        >
          Try again
          <RotateCw
            size={16}
            className="transition-transform group-hover:rotate-180"
          />
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/40 px-6 py-3 font-display text-sm text-fg hover:border-accent hover:text-accent"
        >
          Back home
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
