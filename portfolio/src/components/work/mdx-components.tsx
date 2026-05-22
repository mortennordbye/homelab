import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/primitives/Callout";

export const mdxComponents: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="text-h1 text-fg mt-10 mb-4 leading-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-h2 text-fg mt-12 mb-3 leading-tight">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-h3 text-fg mt-8 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-fg-2 leading-relaxed mb-5">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-6 space-y-3 pl-0">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="flex gap-3 text-fg-2 leading-relaxed">
      <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
      <span>{children}</span>
    </li>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="focus-ring text-fg underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="text-fg font-medium">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-fg-2 italic">{children}</em>
  ),
  code: ({ children }) => (
    <code className="font-mono text-sm text-accent bg-surface px-1.5 py-0.5 rounded">
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent pl-5 py-1 my-6 text-fg italic">
      {children}
    </blockquote>
  ),
  Callout,
};
