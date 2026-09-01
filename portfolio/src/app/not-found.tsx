"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The 404 as a librarian's return slip: a small piece of card stock on the
// desk, with the failed URL written on its ruled line. No green — a dead end
// has not earned the lamp.
export default function NotFound() {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-5 md:px-8">
      <div className="card-stock max-w-sm -rotate-[0.6deg] p-7">
        <p className="border-b-2 border-[color:var(--paper-ink)] pb-2 font-mono text-[0.6rem] tracking-[0.18em] text-[color:var(--paper-ink-3)] uppercase">
          Not found — return slip
        </p>
        <p className="mt-4 text-lg leading-snug text-[color:var(--paper-ink)]">
          The page you asked for is not in the collection.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--paper-ink-2)]">
          It may have been removed, or it may never have existed. The whole
          site lives at the front page.
        </p>
        <p className="mt-5 truncate border-b border-[color:var(--paper-ink-3)] pb-1 font-mono text-[0.68rem] text-[color:var(--paper-ink-3)]">
          requested: {pathname}
        </p>
        <Link
          href="/"
          className="focus-ring mt-5 inline-block font-mono text-[0.72rem] tracking-[0.06em] text-[color:var(--paper-ink-2)] underline underline-offset-4 hover:text-[color:var(--paper-ink)]"
        >
          → return to the front page
        </Link>
      </div>
    </div>
  );
}
