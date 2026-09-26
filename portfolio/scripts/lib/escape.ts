/**
 * LaTeX-escape a string. Handles the seven characters that have a meaning
 * in LaTeX text mode plus backslash, tilde, and caret. Designed for the
 * narrow set of values flowing from `src/content/*.ts` — bullet text,
 * names, organisations, dates — not for arbitrary code blocks.
 */
export function tex(s: string | undefined | null): string {
  if (s == null) return "";
  // One pass: chained replaces would re-escape the braces of \textbackslash{}.
  return s.replace(/[\\&%$#_{}~^]/g, (c) => TEX[c]);
}

const TEX: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
};
