import { Download, FileText } from "lucide-react";

/**
 * Two side-by-side download buttons for the LaTeX-generated PDFs.
 * The PDFs are produced by `make cv` and committed under public/.
 */
export function ResumePdfButtons({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={"flex flex-wrap items-center gap-3 " + (className ?? "")}>
      <a
        href="/resume.pdf"
        download="Morten-Nordbye-Resume.pdf"
        className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-display text-sm text-accent-ink transition-all hover:shadow-[0_0_36px_-8px_var(--accent)]"
      >
        <Download size={14} />
        Download résumé
      </a>
      <a
        href="/cv.pdf"
        download="Morten-Nordbye-CV.pdf"
        className="group inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/40 px-5 py-2.5 font-display text-sm text-fg transition-all hover:border-accent hover:text-accent"
      >
        <FileText size={14} />
        Download full CV
      </a>
    </div>
  );
}
