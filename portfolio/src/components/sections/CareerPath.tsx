import { careerPath, type CareerStop } from "@/content/resume";

export function CareerPath() {
  return (
    <div>
      {/* No label of its own. The block above already carries the "career"
          plate and the heading "The route here.", and two plates stacked read
          as a mistake rather than as hierarchy. */}

      {/* Mobile: vertical stops */}
      <ol className="space-y-6 sm:hidden">
        {careerPath.map((stop, i) => (
          <li key={`${stop.year}-${stop.role}-${i}`} className="relative flex items-start gap-4">
            <span
              className={
                "mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full border " +
                (stop.current
                  ? "border-copper bg-copper"
                  : "border-brass bg-brass")
              }
            />
            <StopLabel stop={stop} />
          </li>
        ))}
      </ol>

      {/* Desktop: horizontal stops with connector line */}
      <div className="relative hidden sm:block">
        <div
          aria-hidden
          className="pointer-events-none absolute left-[6px] right-[6px] top-[5px] h-px bg-gradient-to-r from-copper via-brass to-brass/25"
        />
        <ol
          className="grid gap-x-6"
          style={{
            gridTemplateColumns: `repeat(${careerPath.length}, minmax(0, 1fr))`,
          }}
        >
          {careerPath.map((stop, i) => (
            <li key={`${stop.year}-${stop.role}-${i}`} className="relative">
              <span
                className={
                  "relative z-10 inline-block h-3 w-3 rounded-full border " +
                  (stop.current
                    ? "border-copper bg-copper"
                    : "border-brass bg-brass")
                }
              />
              <div className="mt-4">
                <StopLabel stop={stop} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function StopLabel({ stop }: { stop: CareerStop }) {
  return (
    <div>
      <p className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-3">
        {stop.year}
        {/* Green survives here as ink, not as a second lit point: the copper
            stop marker already says which one is current. */}
        {stop.current && <span className="text-accent">now</span>}
      </p>
      <p className={"mt-1.5 text-sm " + (stop.current ? "text-fg font-medium" : "text-fg-2")}>
        {stop.role}
      </p>
      <p className="mt-0.5 text-xs text-fg-3">{stop.company}</p>
      {stop.note && (
        <p className="mt-2 text-xs leading-relaxed text-fg-3">{stop.note}</p>
      )}
    </div>
  );
}
