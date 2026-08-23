import { cn } from "@/lib/cn";

export function Tag({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "accent" | "warm" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs tracking-wide",
        variant === "accent" && "border-accent/40 bg-accent/10 text-accent",
        variant === "warm" && "border-brass bg-wood text-fg",
        variant === "muted" && "border-line bg-bg-2/40 text-fg-3",
        variant === "default" && "border-line-2 bg-surface/40 text-fg-2",
        className,
      )}
    >
      {children}
    </span>
  );
}
