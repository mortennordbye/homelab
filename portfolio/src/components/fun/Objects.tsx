"use client";

import { Html, RoundedBox } from "@react-three/drei";
import { site } from "@/content/site";
import { interests } from "@/content/interests";
import type { InfoCard } from "./Hud";
import { Interactive } from "./interaction";
import type { CareerData } from "./shelf";

/**
 * The remaining portfolio sections as objects: socials, contact, the blog,
 * the two interests, and the career timeline.
 *
 * Everything here follows the rule the certificates taught — an object that is
 * meant to be looked at has to present a face to the room at roughly standing
 * eye level, and be big enough to put a crosshair on. That is why the social
 * links went on the wall rather than onto a laptop lid, and why the timeline is
 * framed rather than filed away.
 */

/**
 * The social links, as a row of framed tiles on the wall above the desk.
 *
 * Three earlier shapes were tried and discarded. Stickers on a laptop lid is
 * what a real desk looks like, but a 10cm sticker carrying a logo drawn out of
 * primitives is unreadable from anywhere you would stand, and the whole point
 * of a social link is recognising it at a glance.
 *
 * The fix is the same one the monitors already use: real DOM through drei's
 * Html, so the icons are vector SVG and stay sharp at any distance instead of
 * being a texture that blurs. The brand marks are Simple Icons (CC0), applied
 * as a CSS mask so each one can take its own colour.
 *
 * One Html layer holds all four tiles, with a separate invisible mesh per tile
 * for picking, rather than four Html layers — the DOM layer is the expensive
 * part and the picking geometry is nearly free.
 */
const SOCIAL_ICON: Record<string, { file: string; colour: string }> = {
  GitHub: { file: "github", colour: "#e6edf3" },
  LinkedIn: { file: "linkedin", colour: "#4aa3f0" },
  X: { file: "x", colour: "#e7e9ea" },
  Blog: { file: "rss", colour: "#f0913a" },
};

const TILE_W = 0.24;
const TILE_H = 0.24;
const TILE_GAP = 0.035;
const TILE_PX = 200;

export function SocialWall({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: (card: InfoCard) => void;
}) {
  const socials = site.socials;
  const n = socials.length;
  const totalW = n * TILE_W + (n - 1) * TILE_GAP;
  const xOf = (i: number) => -totalW / 2 + TILE_W / 2 + i * (TILE_W + TILE_GAP);

  const pxW = Math.round((totalW / TILE_W) * TILE_PX);
  const pxH = TILE_PX;

  return (
    <group position={position} rotation={rotation}>
      {/* backing board, so the tiles read as mounted rather than floating */}
      <RoundedBox
        position={[0, 0, -0.012]}
        args={[totalW + 0.06, TILE_H + 0.06, 0.022]}
        radius={0.005}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#2b2f34" roughness={0.72} />
      </RoundedBox>

      <Html
        transform
        occlude="blending"
        distanceFactor={(totalW / pxW) * 400}
        position={[0, 0, 0.002]}
        zIndexRange={[10, 0]}
        style={{
          width: `${pxW}px`,
          height: `${pxH}px`,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div
          className="flex h-full w-full items-center justify-between"
          style={{ gap: `${(TILE_GAP / TILE_W) * TILE_PX}px` }}
        >
          {socials.map((sItem) => {
            const icon = SOCIAL_ICON[sItem.label];
            return (
              <div
                key={sItem.label}
                className="flex flex-col items-center justify-center"
                style={{
                  width: `${TILE_PX}px`,
                  height: `${TILE_PX}px`,
                  background:
                    "linear-gradient(160deg, #12171d 0%, #0d1216 100%)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    width: "88px",
                    height: "88px",
                    backgroundColor: icon?.colour ?? "#ffffff",
                    WebkitMaskImage: `url(/icons/social/${icon?.file}.svg)`,
                    maskImage: `url(/icons/social/${icon?.file}.svg)`,
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                  }}
                />
                <span
                  className="mt-3 font-mono"
                  style={{
                    fontSize: "20px",
                    letterSpacing: "0.12em",
                    color: "#8ea0b2",
                  }}
                >
                  {sItem.label.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </Html>

      {socials.map((sItem, i) => (
        <Interactive
          key={sItem.label}
          label={sItem.label}
          verb="open"
          detail={sItem.href.replace(/^https?:\/\//, "")}
          onActivate={() =>
            onOpen({
              kicker: "social",
              title: sItem.label,
              subtitle: sItem.href.replace(/^https?:\/\//, ""),
              rows: [],
              body: `Opens ${sItem.href} in a new tab.`,
              href: sItem.href,
              hrefLabel: `open ${sItem.label}`,
            })
          }
        >
          {(hovered) => (
            <group position={[xOf(i), 0, 0.004]}>
              <mesh visible={false}>
                <planeGeometry args={[TILE_W, TILE_H]} />
                <meshBasicMaterial />
              </mesh>
              {/* hover ring, drawn behind the DOM layer so it frames the tile */}
              <mesh position={[0, 0, -0.011]} visible={hovered}>
                <planeGeometry args={[TILE_W + 0.03, TILE_H + 0.03]} />
                <meshBasicMaterial color="#ffd9a6" />
              </mesh>
            </group>
          )}
        </Interactive>
      ))}
    </group>
  );
}

/**
 * A contact card standing in a holder on the desk.
 *
 * This replaces a ruled notepad with a pen on it. The notepad was legible as an
 * object and useless as a signpost: a blank pad tells you nothing about what
 * pressing E will do, so the only way to discover it held contact details was
 * to walk up and read the hover prompt. Anything whose whole job is to say
 * "here is how to reach me" should say that at a glance, from across the desk.
 *
 * The text is real DOM through `Html`, for the reason the social icons are SVG:
 * lettering built from geometry is unreadable at any distance a visitor
 * actually stands at.
 */
export function ContactCard({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: (card: InfoCard) => void;
}) {
  const W = 0.148;
  const H = 0.092;
  const PX_W = 592;
  const PX_H = 368;
  /* Leaned back like a card in a stand. Upright would present the best face to
     the room, but a card standing dead vertical on a desk reads as a screen. */
  const LEAN = -0.34;

  return (
    <Interactive
      label="my contact card"
      verb="read"
      detail={site.email}
      onActivate={() =>
        onOpen({
          kicker: "contact",
          title: "Get in touch",
          subtitle: site.location,
          rows: [
            { k: "Email", v: site.email },
            { k: "Phone", v: site.phoneDisplay },
            { k: "Site", v: site.homepage },
          ],
          body: "Available through Orange Business and for direct engagements.",
          href: `mailto:${site.email}`,
          hrefLabel: "send an email",
        })
      }
    >
      {(hovered) => (
        <group position={position} rotation={rotation}>
          {/* brushed steel holder */}
          <RoundedBox
            position={[0, 0.006, 0.004]}
            args={[W + 0.03, 0.012, 0.038]}
            radius={0.003}
            smoothness={3}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#9aa0a6" roughness={0.34} metalness={0.85} />
          </RoundedBox>

          <group position={[0, 0.012 + (H / 2) * Math.cos(LEAN), 0]} rotation={[LEAN, 0, 0]}>
            {/* the card itself */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[W, H, 0.0022]} />
              <meshStandardMaterial
                color={hovered ? "#fffdf8" : "#f6f3ec"}
                roughness={0.86}
                emissive={hovered ? "#ffd9a6" : "#000000"}
                emissiveIntensity={hovered ? 0.34 : 0}
              />
            </mesh>
            <Html
              transform
              occlude="blending"
              distanceFactor={(W / PX_W) * 400}
              position={[0, 0, 0.0016]}
              zIndexRange={[10, 0]}
              style={{
                width: `${PX_W}px`,
                height: `${PX_H}px`,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {/* The card stock is painted here, not left to the mesh behind.
                  A transparent layer over a thin card on a dark desk renders as
                  light text on black — the whiteboard taught this exact lesson
                  one wall away. */}
              <div
                className="flex h-full w-full flex-col justify-center"
                style={{
                  padding: "0 46px",
                  color: "#1e2732",
                  background: "linear-gradient(150deg, #fdfbf6 0%, #f2eee5 100%)",
                }}
              >
                <div style={{ fontSize: "46px", fontWeight: 600, lineHeight: 1.1 }}>
                  {site.firstName} {site.lastName}
                </div>
                <div
                  className="font-mono"
                  style={{
                    fontSize: "25px",
                    letterSpacing: "0.1em",
                    color: "#7c8894",
                    marginTop: "10px",
                  }}
                >
                  {site.role.toUpperCase()}
                </div>
                <div
                  style={{
                    height: "2px",
                    background: "#d6d0c4",
                    margin: "22px 0 20px",
                  }}
                />
                <div className="font-mono" style={{ fontSize: "27px", color: "#2b3642" }}>
                  {site.email}
                </div>
                <div
                  className="font-mono"
                  style={{ fontSize: "27px", color: "#6b7683", marginTop: "8px" }}
                >
                  {site.phoneDisplay}
                </div>
              </div>
            </Html>
          </group>
        </group>
      )}
    </Interactive>
  );
}

/** Gym bag in the corner — the fitness half of the About section. */
export function GymBag({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: (card: InfoCard) => void;
}) {
  const fitness = interests.find((i) => i.icon === "fitness");
  return (
    <Interactive
      label="the gym bag"
      verb="look at"
      detail="five times a week"
      onActivate={() =>
        onOpen({
          kicker: "outside work",
          title: fitness?.title ?? "Fitness",
          rows: [],
          body: fitness?.body ?? "",
        })
      }
    >
      {(hovered) => (
        <group position={position} rotation={rotation}>
          {/* body */}
          <RoundedBox
            position={[0, 0.13, 0]}
            args={[0.44, 0.24, 0.24]}
            radius={0.09}
            smoothness={5}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={hovered ? "#3f4a55" : "#333c46"}
              roughness={0.88}
              emissive={hovered ? "#ffd9a6" : "#000000"}
              emissiveIntensity={hovered ? 0.22 : 0}
            />
          </RoundedBox>
          {/* handles */}
          {[-0.06, 0.06].map((x) => (
            <mesh key={x} position={[x, 0.27, 0]} rotation={[0, 0, 0]} castShadow>
              <torusGeometry args={[0.055, 0.008, 8, 20, Math.PI]} />
              <meshStandardMaterial color="#20262c" roughness={0.7} />
            </mesh>
          ))}
          {/* zip line */}
          <mesh position={[0, 0.243, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.36, 0.012]} />
            <meshStandardMaterial color="#8b949e" roughness={0.5} metalness={0.6} />
          </mesh>
        </group>
      )}
    </Interactive>
  );
}

/**
 * The career timeline, framed on the wall above the desk.
 *
 * Rebuilt from geometry to text. The first version drew the timeline as a rail
 * with dots and small coloured rectangles standing in for the labels — which is
 * the mistake the social icons already taught: shapes standing in for words are
 * not a timeline, they are a diagram of one. You could see that something was
 * being charted and never what.
 *
 * It also turned the long way round. A career is a list of lines of text, and
 * lines of text stack vertically; laid out horizontally, six roles gave each
 * entry 80px of width to hold a job title in. Portrait frame, vertical rail,
 * real type.
 */
export function CareerFrame({
  position,
  rotation = [0, 0, 0],
  career,
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  career: CareerData;
  onOpen: (card: InfoCard) => void;
}) {
  const W = 0.62;
  const H = 0.78;
  const PX_W = 520;
  const PX_H = 654;
  const PAD = 34;

  return (
    <Interactive
      label="the timeline"
      verb="read"
      detail={`${career.roles.length} roles · ${career.education.length} in education`}
      onActivate={() =>
        onOpen({
          kicker: "career",
          title: "Where I have worked",
          subtitle: career.roles[0]
            ? `Now: ${career.roles[0].role}, ${career.roles[0].company}`
            : undefined,
          rows: [
            ...career.roles.map((r) => ({
              k: r.period,
              v: `${r.role} — ${r.company}`,
            })),
            ...career.education.map((e) => ({
              k: e.period,
              v: `${e.title} — ${e.institution}`,
            })),
          ],
        })
      }
    >
      {(hovered) => (
        <group position={position} rotation={rotation}>
          {/* frame */}
          <RoundedBox args={[W, H, 0.022]} radius={0.004} smoothness={3} castShadow>
            <meshStandardMaterial
              color="#8d7350"
              roughness={0.6}
              emissive={hovered ? "#ffd9a6" : "#000000"}
              emissiveIntensity={hovered ? 0.26 : 0}
            />
          </RoundedBox>
          {/* mount board, so the print sits inside a border rather than
              filling the frame edge to edge */}
          <mesh position={[0, 0, 0.0115]}>
            <planeGeometry args={[W - 0.03, H - 0.03]} />
            <meshStandardMaterial color="#efece3" roughness={0.9} />
          </mesh>

          <Html
            transform
            occlude="blending"
            distanceFactor={((W - 0.06) / PX_W) * 400}
            position={[0, 0, 0.013]}
            zIndexRange={[10, 0]}
            style={{
              width: `${PX_W}px`,
              height: `${PX_H}px`,
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {/* Paper painted here, not left to the mesh — this wall faces away
                from both lamps and an unlit plane behind a transparent layer
                comes out black. */}
            <div
              className="flex h-full w-full flex-col"
              style={{
                padding: `${PAD}px`,
                background: "linear-gradient(160deg, #fbf8f1 0%, #f2eee3 100%)",
                color: "#26313d",
              }}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className="font-mono"
                  style={{ fontSize: "23px", letterSpacing: "0.22em", fontWeight: 600 }}
                >
                  CAREER
                </span>
                <span
                  className="font-mono"
                  style={{ fontSize: "15px", color: "#8b8271" }}
                >
                  {career.roles.length} roles
                </span>
              </div>
              <div style={{ height: "2px", background: "#ddd6c7", margin: "14px 0 16px" }} />

              {/* The rail is a left border on the list rather than its own
                  element, so it cannot fall out of step with the entries. */}
              <div
                className="flex-1"
                style={{ borderLeft: "2px solid #cfc6b4", paddingLeft: "20px" }}
              >
                {career.roles.map((r, i) => (
                  <div
                    key={`${r.company}-${r.period}`}
                    style={{ position: "relative", marginBottom: "15px" }}
                  >
                    {/* dot, pulled back onto the rail; the current role is
                        filled and larger so "now" reads without a legend */}
                    <span
                      style={{
                        position: "absolute",
                        left: i === 0 ? "-27px" : "-25px",
                        top: "6px",
                        width: i === 0 ? "12px" : "8px",
                        height: i === 0 ? "12px" : "8px",
                        borderRadius: "50%",
                        background: i === 0 ? "#b4653a" : "#efece3",
                        border: i === 0 ? "none" : "2px solid #a79c88",
                      }}
                    />
                    <div
                      className="font-mono"
                      style={{ fontSize: "14px", color: "#8b8271", letterSpacing: "0.04em" }}
                    >
                      {r.period}
                    </div>
                    <div style={{ fontSize: "19px", fontWeight: 600, lineHeight: 1.2 }}>
                      {r.role}
                    </div>
                    <div style={{ fontSize: "16px", color: "#5d6875", lineHeight: 1.25 }}>
                      {r.company}
                    </div>
                  </div>
                ))}
              </div>

              {career.education.length > 0 && (
                <>
                  <div
                    style={{ height: "1px", background: "#ddd6c7", margin: "4px 0 12px" }}
                  />
                  <div
                    className="font-mono"
                    style={{
                      fontSize: "13px",
                      letterSpacing: "0.18em",
                      color: "#8b8271",
                      marginBottom: "8px",
                    }}
                  >
                    EDUCATION
                  </div>
                  {career.education.map((e) => (
                    <div
                      key={`${e.institution}-${e.period}`}
                      className="flex items-baseline justify-between"
                      style={{ fontSize: "15px", marginBottom: "4px" }}
                    >
                      <span style={{ color: "#3c4753" }}>{e.title}</span>
                      <span className="font-mono" style={{ fontSize: "13px", color: "#8b8271" }}>
                        {e.period}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Html>
        </group>
      )}
    </Interactive>
  );
}
