import { Download } from "lucide-react";
import { CvCustomizerPopover } from "./CvCustomizerPopover";

/**
 * Resume page download row: a direct résumé download and a popover-driven
 * "Customize CV" picker that maps four section toggles to one of 16 pre-built
 * PDFs (see scripts/build-cv.ts and src/content/cv-variants.ts).
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
        data-pdf-download
        className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-display text-sm text-accent-ink transition-all hover:shadow-[0_0_36px_-8px_var(--accent)]"
      >
        <Download size={14} />
        Download résumé
      </a>
      <CvCustomizerPopover />
    </div>
  );
}
