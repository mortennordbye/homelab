import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-start justify-center px-5 md:px-8">
      <p className="font-display text-xs uppercase tracking-[0.3em] text-accent">
        404 — page not found
      </p>
      <h1 className="mt-6 text-display-lg font-display text-fg leading-[1]">
        Took a wrong{" "}
        <span className="gradient-text">turn somewhere.</span>
      </h1>
      <p className="mt-6 max-w-xl text-fg-2">
        Whatever this URL pointed at does not exist anymore, or never did. The
        whole site lives at the front page now.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-sm text-accent-ink transition-all hover:shadow-[0_0_44px_-8px_var(--accent)]"
        >
          Back home
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
