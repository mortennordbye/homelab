/**
 * Reformat a website-style period like "Jan 2026 — Present" into the
 * Awesome-CV-style "Jan. 2026 -- Present" — abbreviated months gain a
 * trailing period; the em / en dash becomes the LaTeX double-hyphen.
 *
 * Idempotent: passing already-formatted strings through is a no-op.
 */
const MONTHS = new Set([
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
]);

export function period(input: string): string {
  let s = input.trim();
  // Normalise dashes to LaTeX `--`.
  s = s.replace(/\s*[–—]\s*/g, " -- ");
  // Add a period after bare three-letter month abbreviations that aren't
  // already followed by ".".
  s = s.replace(/\b([A-Z][a-z]{2,4})\b(?!\.)/g, (m, mon) => {
    return MONTHS.has(mon) ? `${mon}.` : m;
  });
  return s;
}

/** Friendly category labels for skill groups. */
export function skillGroupLabel(group: string): string {
  switch (group) {
    case "platform":
      return "Platform & Infrastructure";
    case "delivery":
      return "Delivery & Automation";
    case "ops":
      return "Operations";
    case "soft":
      return "Leadership";
    default:
      return group.charAt(0).toUpperCase() + group.slice(1);
  }
}
