import Image from "next/image";

type Item = string | { src: string; caption?: string; alt?: string };

function normalise(item: Item, i: number, title: string) {
  if (typeof item === "string") {
    return { src: item, caption: undefined as string | undefined, alt: `${title} — screen ${i + 1}` };
  }
  return {
    src: item.src,
    caption: item.caption,
    alt: item.alt ?? item.caption ?? `${title} — screen ${i + 1}`,
  };
}

export function Gallery({
  images,
  title,
}: {
  images: Item[];
  title: string;
}) {
  if (!images.length) return null;

  return (
    <section className="mt-20">
      <div className="border-b border-line pb-4 eyebrow">
        gallery — {String(images.length).padStart(2, "0")} screens
      </div>

      <div className="mt-8 columns-1 gap-4 sm:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {images.map((raw, i) => {
          const { src, caption, alt } = normalise(raw, i, title);
          return (
            <figure
              key={src}
              className="group overflow-hidden rounded-lg border border-line bg-surface/40"
            >
              <Image
                src={src}
                alt={alt}
                width={1600}
                height={900}
                sizes="(max-width: 640px) 100vw, 50vw"
                className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
              />
              {caption && (
                <figcaption className="border-t border-line bg-bg-2/40 px-4 py-3 font-mono text-xs text-fg-3">
                  {caption}
                </figcaption>
              )}
            </figure>
          );
        })}
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
      </div>
    </figure>
  );
}
