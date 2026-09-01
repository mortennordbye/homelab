import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const dynamic = "force-static";
export const alt = `${site.name} — ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The card is a bookplate: a paper plate on the dark ground, the same family
// as the return slip and the contact card. Flat by design — the off-site
// imagery rule wants something that survives feed recompression.
export default async function Image() {
  // Read from disk rather than fetched by URL: the route is force-static, so
  // this runs in the builder where src/ exists, and Turbopack has no asset
  // fetch. Buffer.buffer keeps satori's ArrayBuffer contract.
  const fontDir = join(process.cwd(), "src/app/og-fonts");
  const [serif, mono] = await Promise.all([
    readFile(join(fontDir, "SourceSerif4-Regular.ttf")),
    readFile(join(fontDir, "FragmentMono-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(70% 90% at 30% 0%, rgba(74,53,32,0.35), transparent 60%), linear-gradient(180deg, #12170f 0%, #0b0e0b 100%)",
          fontFamily: "'Source Serif 4'",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 760,
            padding: "56px 64px 60px",
            transform: "rotate(-0.4deg)",
            borderRadius: 2,
            background: "linear-gradient(160deg, #e8ddc9 0%, #d9cbb2 80%)",
            boxShadow:
              "0 2px 2px rgba(0,0,0,0.6), 18px 34px 60px -20px rgba(0,0,0,0.95)",
            color: "#3a2e1d",
          }}
        >
          <div
            style={{
              fontFamily: "'Fragment Mono'",
              fontSize: 19,
              letterSpacing: "0.42em",
              color: "#62523c",
            }}
          >
            EX BIBLIOTHECA
          </div>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              marginTop: 26,
              color: "#3a2e1d",
            }}
          >
            {site.name}
          </div>
          <div
            style={{
              width: 150,
              height: 2,
              background: "#62523c",
              marginTop: 30,
            }}
          />
          <div
            style={{
              fontFamily: "'Fragment Mono'",
              fontSize: 19,
              letterSpacing: "0.16em",
              whiteSpace: "nowrap",
              marginTop: 30,
              color: "#574733",
            }}
          >
            {`${site.role.toUpperCase()} — NORDBYE.IT`}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Source Serif 4", data: serif, style: "normal", weight: 400 },
        { name: "Fragment Mono", data: mono, style: "normal", weight: 400 },
      ],
    },
  );
}
