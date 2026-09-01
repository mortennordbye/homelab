import { pickAllBrands } from "@/components/work/brand-icons";

type Props = {
  stack: readonly string[];
};

/**
 * Compact stack strip for a case study. Renders each recognised tech as a
 * tool mark: icon struck in single-ink copper in a square hairline tile.
 * Lucide icons (MIT) keep us out of trademark territory; the brand colours
 * stay in WorkCardCover — on the page everything is one material.
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
              className="inline-flex items-center gap-2 rounded-[2px] border border-line-2 px-3 py-1.5 transition-colors hover:border-copper"
            >
              <Icon
                size={14}
                strokeWidth={1.8}
                className="text-copper"
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
