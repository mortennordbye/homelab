import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-display font-medium transition-colors duration-[180ms] ease-out focus-ring disabled:opacity-50 disabled:cursor-not-allowed";

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-sm",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-interactive-hover shadow-[0_0_0_1px_var(--accent)] hover:shadow-[0_0_24px_-6px_var(--accent)]",
  secondary:
    "border border-line-2 bg-surface/60 text-fg hover:border-accent/60 hover:text-accent",
  ghost: "text-fg-2 hover:text-fg hover:bg-surface/60",
  link: "text-accent hover:text-interactive-hover underline-offset-4 hover:underline px-0 py-0",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

type AsButton = CommonProps &
  ComponentPropsWithoutRef<"button"> & { href?: undefined };

type AsLink = CommonProps &
  Omit<ComponentPropsWithoutRef<"a">, "href"> & { href: string };

export function Button(props: AsButton | AsLink) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    iconLeft,
    iconRight,
    ...rest
  } = props as CommonProps & { href?: string };

  const classes = cn(base, sizes[size], variants[variant], className);
  const content = (
    <>
      {iconLeft}
      <span>{children}</span>
      {iconRight}
    </>
  );

  if ("href" in rest && rest.href) {
    const { href, ...anchorRest } = rest as { href: string } & Record<string, unknown>;
    const external = href.startsWith("http") || href.startsWith("mailto:");
    if (external) {
      return (
        <a href={href} className={classes} {...(anchorRest as ComponentPropsWithoutRef<"a">)}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...(anchorRest as Omit<ComponentPropsWithoutRef<"a">, "href">)}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ComponentPropsWithoutRef<"button">)}>
      {content}
    </button>
  );
}
