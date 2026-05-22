import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "flat" | "bordered" | "glass";

const variants: Record<Variant, string> = {
  flat: "bg-surface/40",
  bordered: "border border-line bg-bg-2/40",
  glass: "border border-line/70 bg-surface/50 backdrop-blur-sm",
};

export function Card({
  variant = "bordered",
  className,
  children,
  as: As = "div",
}: {
  variant?: Variant;
  className?: string;
  children: ReactNode;
  as?: "div" | "article" | "section";
}) {
  return (
    <As className={cn("rounded-xl p-6 md:p-7", variants[variant], className)}>
      {children}
    </As>
  );
}

export function CardEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-h3 text-fg mt-3", className)}>{children}</h3>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-3 text-fg-2", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-6 flex items-center gap-3 text-sm", className)}>{children}</div>;
}
