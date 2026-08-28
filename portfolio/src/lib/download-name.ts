// Relative rather than the usual "@/" alias: `next.config.ts` imports this
// module to build the Content-Disposition headers, and the config is loaded
// before the tsconfig path aliases are wired up.
import { site } from "../content/site";

/**
 * The names the three downloadable files land under.
 *
 * There are three places a file leaves this site — the contact card, the
 * resume object's take action, and the printer in `/fun` — and before this
 * they spelled the same person three ways: `Morten-Victor-Nordbye.vcf`,
 * `Morten-Nordbye-CV.pdf` with the name hardcoded, and `cv-1101.pdf`, which
 * was the manifest stem with its leading slash removed.
 *
 * Hyphenated and given-name-first. It needs no shell quoting, it survives a
 * URL, and it sorts under M beside whatever else the reader has saved from the
 * site.
 *
 * The stem is derived from `site.ts` rather than written out, because the one
 * failure this file exists to prevent is the name drifting in one of three
 * places and nobody noticing until it is in someone's downloads folder.
 */
const STEM = `${site.firstName}-${site.lastName}`.replace(/\s+/g, "-");

export const VCARD_FILENAME = `${STEM}.vcf`;

/** The résumé and the CV are different documents, and the reader keeps both. */
export function pdfFilename(asResume: boolean): string {
  return `${STEM}-${asResume ? "Resume" : "CV"}.pdf`;
}
