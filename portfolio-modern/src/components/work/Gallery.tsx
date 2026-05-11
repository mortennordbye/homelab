import Image from "next/image";

export function Gallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  if (!images.length) return null;

  return (
    <section className="mt-20">
      <div className="border-b border-line pb-4 font-display text-xs uppercase tracking-[0.2em] text-fg-3">
        gallery — {String(images.length).padStart(2, "0")} screens
      </div>

      {/* CSS columns masonry — respects natural aspect ratios */}
      <div className="mt-8 columns-1 gap-4 sm:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {images.map((src, i) => (
          <figure
            key={src}
            className="group overflow-hidden rounded-lg border border-line bg-surface/40"
          >
            <Image
              src={src}
              alt={`${title} — screen ${i + 1}`}
              width={1600}
              height={900}
              sizes="(max-width: 640px) 100vw, 50vw"
              className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
            />
          </figure>
        ))}
      </div>
    </section>
  );
}

export function CoverImage({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  return (
    <figure className="relative mt-12 overflow-hidden rounded-lg border border-line bg-surface/40">
      <div className="relative aspect-[2/1] w-full">
        <Image
          src={src}
          alt={`${title} — cover`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-bg/30 via-transparent to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-3 text-fg-3/40 font-display text-xs"
        >
          +
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 bottom-3 text-fg-3/40 font-display text-xs"
        >
          +
        </span>
      </div>
    </figure>
  );
}
