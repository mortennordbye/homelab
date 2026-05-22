import { pickAllBrands } from "@/components/work/brand-icons";

type Props = {
  stack: readonly string[];
};

/**
 * Compact stack strip for a case study. Renders each recognised tech in
 * the project's stack as a small chip — icon + canonical label — using the
 * same brand language as WorkCardCover. Lucide icons (MIT) keep us out of
 * trademark territory while the brand colour carries the recognition.
 */
export function StackTiles({ stack }: Props) {
  const items = pickAllBrands(stack);
  if (items.length === 0) return null;

  return (
    <section className="mt-8">
      <p className="eyebrow mb-3">Stack</p>
      <ul className="flex flex-wrap gap-2">
        {items.map(({ key, brand }) => {
          const Icon = brand.Icon;
          return (
            <li
              key={key}
              className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/40 px-3 py-1.5 transition-colors hover:border-accent/50"
            >
              <Icon
                size={14}
                strokeWidth={1.8}
                style={{ color: brand.color }}
                aria-hidden
              />
              <span className="text-sm text-fg">{brand.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
