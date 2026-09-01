"use client";

import Link from "next/link";

// Same return-slip language as not-found.tsx: an error is the other thing a
// desk hands back. The digest goes on the ruled line, where the slip records
// what happened.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-5 md:px-8">
      <div className="card-stock max-w-sm rotate-[0.4deg] p-7">
        <p className="border-b-2 border-[color:var(--paper-ink)] pb-2 font-mono text-[0.6rem] tracking-[0.18em] text-[color:var(--paper-ink-3)] uppercase">
          Something failed — return slip
        </p>
        <p className="mt-4 text-lg leading-snug text-[color:var(--paper-ink)]">
          This page did not render.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--paper-ink-2)]">
          The error has been logged. Try the page again, or head back to the
          front page.
        </p>
        {error.digest && (
          <p className="mt-5 truncate border-b border-[color:var(--paper-ink-3)] pb-1 font-mono text-[0.68rem] text-[color:var(--paper-ink-3)]">
            digest: {error.digest}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="focus-ring self-start font-mono text-[0.72rem] tracking-[0.06em] text-[color:var(--paper-ink-2)] underline underline-offset-4 hover:text-[color:var(--paper-ink)]"
          >
            → try again
          </button>
          <Link
            href="/"
            className="focus-ring self-start font-mono text-[0.72rem] tracking-[0.06em] text-[color:var(--paper-ink-2)] underline underline-offset-4 hover:text-[color:var(--paper-ink)]"
          >
            → return to the front page
          </Link>
        </div>
      </div>
    </div>
  );
}
