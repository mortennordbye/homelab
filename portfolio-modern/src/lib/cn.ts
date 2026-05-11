type Cls = string | number | false | null | undefined;

export function cn(...args: (Cls | Cls[])[]): string {
  const out: string[] = [];
  for (const a of args) {
    if (!a) continue;
    if (Array.isArray(a)) {
      const inner = cn(...a);
      if (inner) out.push(inner);
    } else {
      out.push(String(a));
    }
  }
  return out.join(" ");
}
