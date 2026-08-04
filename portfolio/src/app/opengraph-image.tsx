import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const dynamic = "force-static";
export const alt = `${site.name} — ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(58% 76% at 24% -8%, rgba(81,164,94,0.13), transparent 62%), linear-gradient(180deg, #0a0a0a 0%, #040404 100%)",
          color: "#e9ebe9",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top — eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 22,
            letterSpacing: "0.3em",
            color: "#a1ada3",
            textTransform: "uppercase",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#51a45e",
              boxShadow: "0 0 24px #51a45e",
            }}
          />
          available · oslo &amp; remote
        </div>

        {/* Middle — name + role */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 124,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              fontFamily: "ui-monospace, monospace",
              display: "flex",
            }}
          >
            <span style={{ color: "#e9ebe9" }}>Morten </span>
            <span
              style={{
                marginLeft: 24,
                background:
                  "linear-gradient(110deg, #e9ebe9 30%, #61b86f 65%, #8ec798 95%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Nordbye
            </span>
          </div>
          <div
            style={{
              fontSize: 40,
              color: "#a1ada3",
              letterSpacing: "-0.01em",
              fontWeight: 400,
            }}
          >
            {`${site.role} · ${site.location}`}
          </div>
        </div>

        {/* Bottom — domain + tagline */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 24,
            color: "#a1ada3",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#e9ebe9",
            }}
          >
            <span style={{ color: "#51a45e" }}>●</span>
            nordbye.it
          </div>
          <div style={{ color: "#708373" }}>
            azure · k8s · gitops · terraform
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
