// Relative import: next.config.ts loads this module before tsconfig path
// aliases are wired up, so "@/" would break there.
import { site } from "../content/site";

// One stem, derived from site.ts, for every file the site serves for download
// (contact card, resume, /fun printer) — so the name cannot drift per call site.
const STEM = `${site.firstName}-${site.lastName}`.replace(/\s+/g, "-");

export const VCARD_FILENAME = `${STEM}.vcf`;

/** The résumé and the CV are different documents, and the reader keeps both. */
export function pdfFilename(asResume: boolean): string {
  return `${STEM}-${asResume ? "Resume" : "CV"}.pdf`;
}
