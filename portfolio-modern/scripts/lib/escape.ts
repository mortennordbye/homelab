/**
 * LaTeX-escape a string. Handles the seven characters that have a meaning
 * in LaTeX text mode plus backslash, tilde, and caret. Designed for the
 * narrow set of values flowing from `src/content/*.ts` — bullet text,
 * names, organisations, dates — not for arbitrary code blocks.
 */
export function tex(s: string | undefined | null): string {
  if (s == null) return "";
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}
