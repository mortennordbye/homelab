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

/** Notepad with the contact details written on it. */
export function Notepad({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: (card: InfoCard) => void;
}) {
  return (
    <Interactive
      label="the notepad"
      verb="read"
      detail="how to get hold of me"
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
          <RoundedBox
            args={[0.15, 0.006, 0.21]}
            radius={0.002}
            smoothness={3}
            receiveShadow
          >
            <meshStandardMaterial
              color={hovered ? "#fffaf0" : "#f3efe4"}
              roughness={0.9}
              emissive={hovered ? "#ffd9a6" : "#000000"}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </RoundedBox>
          {/* ruled lines */}
          {[-0.06, -0.03, 0, 0.03, 0.06].map((z) => (
            <mesh key={z} position={[0, 0.0031, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.11, 0.0016]} />
              <meshBasicMaterial color="#b9c4cf" />
            </mesh>
          ))}
          {/* pen */}
          <mesh
            position={[0.085, 0.006, 0.02]}
            rotation={[0, 0.24, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.005, 0.005, 0.13, 12]} />
            <meshStandardMaterial color="#1f2429" roughness={0.4} metalness={0.3} />
          </mesh>
        </group>
      )}
    </Interactive>
  );
}

/** A stack of printed blog posts. Reads the live feed when opened. */
export function BlogStack({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: () => void;
}) {
  const sheets = [0, 1, 2, 3];
  return (
    <Interactive
      label="the printed posts"
      verb="read"
      detail="latest from the blog"
      onActivate={onOpen}
    >
      {(hovered) => (
        <group position={position} rotation={rotation}>
          {sheets.map((i) => (
            <mesh
              key={i}
              position={[
                (i % 2 === 0 ? 1 : -1) * 0.004 * i,
                0.003 + i * 0.0055,
                (i % 3 === 0 ? -1 : 1) * 0.005 * i,
              ]}
              rotation={[0, (i - 1.5) * 0.035, 0]}
              receiveShadow
            >
              <boxGeometry args={[0.19, 0.005, 0.26]} />
              <meshStandardMaterial
                color={hovered ? "#fffdf7" : "#f5f2ea"}
                roughness={0.92}
                emissive={hovered ? "#ffd9a6" : "#000000"}
                emissiveIntensity={hovered ? 0.26 : 0}
              />
            </mesh>
          ))}
          {/* printed text blocks on the top sheet */}
          <mesh position={[0.006, 0.0245, -0.06]} rotation={[-Math.PI / 2, 0, 0.017]}>
            <planeGeometry args={[0.13, 0.012]} />
            <meshBasicMaterial color="#5d6873" />
          </mesh>
          {[-0.01, 0.01, 0.03, 0.05].map((z) => (
            <mesh
              key={z}
              position={[0.006, 0.0245, z]}
              rotation={[-Math.PI / 2, 0, 0.017]}
            >
              <planeGeometry args={[0.15, 0.004]} />
              <meshBasicMaterial color="#aeb8c2" />
            </mesh>
          ))}
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
 * The career timeline, framed on the wall.
 *
 * Roles are drawn as a rail with a marker per position, generated from
 * `resume.ts`, so a new job adds a marker rather than needing the art redrawn.
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
  const W = 0.72;
  const H = 0.46;
  const n = Math.max(career.roles.length, 1);
  const usable = W - 0.16;

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
          <RoundedBox args={[W, H, 0.02]} radius={0.004} smoothness={3} castShadow>
            <meshStandardMaterial
              color="#8d7350"
              roughness={0.6}
              emissive={hovered ? "#ffd9a6" : "#000000"}
              emissiveIntensity={hovered ? 0.26 : 0}
            />
          </RoundedBox>
          <mesh position={[0, 0, 0.012]}>
            <planeGeometry args={[W - 0.03, H - 0.03]} />
            <meshStandardMaterial color="#f4f1e8" roughness={0.9} />
          </mesh>
          {/* rail */}
          <mesh position={[0, -0.03, 0.013]}>
            <planeGeometry args={[usable, 0.004]} />
            <meshBasicMaterial color="#9aa6b2" />
          </mesh>
          {/* one marker per role, newest on the right */}
          {career.roles.map((r, i) => {
            const x =
              -usable / 2 + (usable * (n - 1 - i)) / Math.max(n - 1, 1);
            return (
              <group key={`${r.company}-${r.period}`} position={[x, 0, 0.014]}>
                <mesh position={[0, -0.03, 0]}>
                  <circleGeometry args={[i === 0 ? 0.014 : 0.009, 18]} />
                  <meshBasicMaterial color={i === 0 ? "#b4653a" : "#6d7a86"} />
                </mesh>
                {/* stem + label block, alternating above and below the rail */}
                <mesh position={[0, i % 2 === 0 ? 0.01 : -0.07, 0]}>
                  <planeGeometry args={[0.0025, 0.055]} />
                  <meshBasicMaterial color="#c2ccd6" />
                </mesh>
                <mesh position={[0, i % 2 === 0 ? 0.052 : -0.112, 0]}>
                  <planeGeometry args={[0.062, 0.03]} />
                  <meshBasicMaterial color="#dde3ea" />
                </mesh>
              </group>
            );
          })}
          {/* title block */}
          <mesh position={[0, H / 2 - 0.06, 0.013]}>
            <planeGeometry args={[0.26, 0.016]} />
            <meshBasicMaterial color="#5d6873" />
          </mesh>
        </group>
      )}
    </Interactive>
  );
}
