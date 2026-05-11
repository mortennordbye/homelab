import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent/90 hover:shadow-[0_0_36px_-8px_var(--accent)]",
  secondary:
    "border border-line-2 bg-surface/40 text-fg hover:border-accent hover:text-accent",
  ghost:
    "border border-transparent text-fg-2 hover:text-fg hover:border-line-2",
};

export function Button({
  href,
  children,
  variant = "primary",
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  external?: boolean;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display text-sm tracking-wide transition-all duration-300";
  const cls = cn(base, styles[variant], className);

  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
