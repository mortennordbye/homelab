import type { WorkMeta } from "@/lib/work";

/**
 * The shelf's provenance line: volume count, the split, and the years the
 * periods span, all derived from the work index (decisions.md §12).
 */
export function ShelfStamp({ items }: { items: WorkMeta[] }) {
  const homelab = items.filter((w) => w.kind === "homelab").length;
  const years = items.flatMap((w) => w.period.match(/\d{4}/g)?.map(Number) ?? []);

  return (
    <p className="font-mono text-xs text-fg-3">
      <span className="text-fg-2">{items.length}</span> volumes
      <span aria-hidden> · </span>
      <span className="text-fg-2">{items.length - homelab}</span> client
      <span aria-hidden> · </span>
      <span className="text-fg-2">{homelab}</span> homelab
      {years.length > 0 && (
        <>
          <span aria-hidden> · </span>
          <span className="text-fg-2">
            {Math.min(...years)} to {Math.max(...years)}
          </span>
        </>
      )}
    </p>
  );
}
