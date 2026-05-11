import type { ElementType, ReactNode, CSSProperties } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
};

/**
 * CSS-only fade/translate-in. Renders the same HTML on the server and the
 * client, no IntersectionObserver, no client JS — so it works for no-JS
 * visitors, gets captured in static screenshots, and is safely overridden
 * by the prefers-reduced-motion rule in globals.css.
 */
export function Reveal({ children, delay = 0, className, as }: Props) {
  const Tag = (as ?? "div") as ElementType;
  const style = { "--d": `${delay}s` } as CSSProperties;
  return (
    <Tag className={cn("reveal", className)} style={style}>
      {children}
    </Tag>
  );
}
