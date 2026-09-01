"use client";

import { Html, RoundedBox } from "@react-three/drei";
import { site } from "@/content/site";
import { interests } from "@/content/interests";
import { services } from "@/content/services";
import { skills } from "@/content/skills";
import type { Skill } from "@/content/schemas";
import type { InfoCard } from "./Hud";
import { Interactive } from "./interaction";
import { ACCENT } from "./Panels";
import type { CareerData } from "./shelf";

/**
 * The remaining portfolio sections as objects: socials, contact, the blog,
 * the two interests, and the career timeline. Rule for all of them: anything
 * meant to be looked at presents a face to the room at standing eye level,
 * big enough to put a crosshair on.
 */

/**
 * The social links, as framed tiles on the wall above the desk. Real DOM via
 * drei's Html so the icons are sharp SVG at any distance; marks are Simple
 * Icons (CC0) applied as a CSS mask so each takes its own colour. One Html
 * layer holds all four tiles with an invisible mesh per tile for picking —
 * the DOM layer is the expensive part, picking geometry is nearly free.
 */
const SOCIAL_ICON: Record<string, { file: string; colour: string }> = {
  GitHub: { file: "github", colour: "#e6edf3" },
  LinkedIn: { file: "linkedin", colour: "#4aa3f0" },
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
 * A contact card standing in a holder on the desk — it must say "here is how
 * to reach me" at a glance, from across the desk. Text is real DOM through
 * `Html`: lettering built from geometry is unreadable at standing distance.
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

/**
 * The skills, as a rack faceplate on the wall right of the desk — deliberately
 * not a second framed print, so the two walls read as different kinds of
 * information. Bars are DOM: labels stay readable, and DOM is self-lit, which
 * matters because this wall faces away from both lamps.
 */
const SKILL_GROUPS: { id: Skill["group"]; label: string }[] = [
  { id: "platform", label: "PLATFORM" },
  { id: "delivery", label: "DELIVERY" },
  { id: "ops", label: "OPERATIONS" },
  { id: "soft", label: "TEAM" },
];

export function SkillPlate({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: (card: InfoCard) => void;
}) {
  const W = 0.62;
  const H = 0.78;
  const PX_W = 520;
  const PX_H = 654;
  const PAD = 30;
  /** Inset of the lit face from the plate edge, so the plate reads as a bezel.
   *  Wide enough to clear the corner screws, which would otherwise sit on the
   *  boundary and punch through the lit face. */
  const BEZEL = 0.06;
  /* The plate is 0.024 deep, so its front face is at z 0.012. Everything drawn
     on top has to clear that: laid flush, the lit face and the plate front
     z-fight and the panel tears along a diagonal. */
  const FACE_Z = 0.0126;

  const top = [...skills].sort((a, b) => b.level - a.level)[0];

  return (
    <Interactive
      label="the skills panel"
      verb="read"
      detail={`${skills.length} across ${SKILL_GROUPS.length} groups`}
      onActivate={() =>
        onOpen({
          kicker: "skills",
          title: "What I work with",
          subtitle: top ? `Strongest: ${top.label}` : undefined,
          rows: skills.map((s) => ({ k: s.label, v: `${s.level}` })),
          body: "Levels are self-assessed and carried over from the published skill bars on the site, not scored by anyone else.",
          href: "/#about",
          hrefLabel: "see these on the site",
        })
      }
    >
      {(hovered) => (
        <group position={position} rotation={rotation}>
          {/* the plate */}
          <RoundedBox args={[W, H, 0.024]} radius={0.005} smoothness={3} castShadow>
            <meshStandardMaterial
              color="#3c434a"
              roughness={0.38}
              metalness={0.72}
              emissive={hovered ? "#ffd9a6" : "#000000"}
              emissiveIntensity={hovered ? 0.22 : 0}
            />
          </RoundedBox>

          {/* Rack screws, one per corner. Real geometry rather than painted
              dots: at this size a printed screw head vanishes, and four of them
              are most of what makes a flat rectangle read as a faceplate. */}
          {[-1, 1].map((sx) =>
            [-1, 1].map((sy) => (
              <mesh
                key={`${sx}${sy}`}
                position={[sx * (W / 2 - 0.016), sy * (H / 2 - 0.016), 0.0125]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.007, 0.007, 0.004, 12]} />
                <meshStandardMaterial color="#8f979e" roughness={0.3} metalness={0.9} />
              </mesh>
            )),
          )}

          {/* The lit face, inside the bezel. */}
          <mesh position={[0, 0, FACE_Z]}>
            <planeGeometry args={[W - BEZEL, H - BEZEL]} />
            <meshStandardMaterial color="#0b0f14" roughness={0.9} />
          </mesh>

          <Html
            transform
            occlude="blending"
            distanceFactor={((W - BEZEL) / PX_W) * 400}
            position={[0, 0, FACE_Z + 0.001]}
            zIndexRange={[10, 0]}
            style={{
              width: `${PX_W}px`,
              height: `${PX_H}px`,
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <div
              className="flex h-full w-full flex-col font-mono"
              style={{
                padding: `${PAD}px`,
                background:
                  "linear-gradient(165deg, #0e141b 0%, #0a0f15 60%, #080c11 100%)",
                color: "#c2d0de",
              }}
            >
              <div className="flex items-baseline justify-between">
                <span
                  style={{
                    fontSize: "23px",
                    letterSpacing: "0.22em",
                    color: "#e6eef7",
                  }}
                >
                  SKILLS
                </span>
                <span style={{ fontSize: "14px", color: "#55677a" }}>
                  self-assessed
                </span>
              </div>
              <div
                style={{
                  height: "1px",
                  background: `${ACCENT.brand}3d`,
                  margin: "12px 0 14px",
                }}
              />

              {SKILL_GROUPS.map((g) => {
                const rows = skills.filter((s) => s.group === g.id);
                if (!rows.length) return null;
                return (
                  <div key={g.id} style={{ marginBottom: "13px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        letterSpacing: "0.2em",
                        color: "#4d5f72",
                        marginBottom: "7px",
                      }}
                    >
                      {g.label}
                    </div>
                    {rows.map((s) => (
                      <div
                        key={s.label}
                        className="flex items-center"
                        style={{ gap: "10px", marginBottom: "6px" }}
                      >
                        <span
                          style={{
                            flex: 1,
                            fontSize: "16px",
                            color: "#9fb6cc",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {s.label}
                        </span>
                        {/* track */}
                        <span
                          style={{
                            width: "176px",
                            height: "9px",
                            background: "#141c25",
                            border: "1px solid #1e2a36",
                            position: "relative",
                            flex: "0 0 176px",
                          }}
                        >
                          {/* fill, glowing so it reads as lit rather than painted */}
                          <span
                            style={{
                              position: "absolute",
                              inset: "0 auto 0 0",
                              width: `${s.level}%`,
                              background: ACCENT.brand,
                              boxShadow: `0 0 9px ${ACCENT.brand}b3`,
                            }}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </Html>
        </group>
      )}
    </Interactive>
  );
}

/**
 * The three services, as a leaflet rack by the door: an offer belongs where a
 * visitor is already leaving. The pockets are real geometry — a printed
 * pocket on a flat board reads as a flat board.
 */
const SERVICE_TONE: Record<string, string> = {
  brand: ACCENT.brand,
  material: ACCENT.copper,
  brand2: ACCENT.info,
};

export function ServiceRack({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: (card: InfoCard) => void;
}) {
  const LEAF_W = 0.135;
  const LEAF_H = 0.205;
  const GAP = 0.022;
  /** Authoring width of one leaflet inside the shared layer. */
  const LEAF_PX = 300;
  /** How much of the leaflet the pocket lip hides. Titles live above it. */
  const LIP_H = 0.058;

  const n = services.length;
  const totalW = n * LEAF_W + (n - 1) * GAP;
  const xOf = (i: number) => -totalW / 2 + LEAF_W / 2 + i * (LEAF_W + GAP);

  /* One DOM layer for all three leaflets, not one each — the same trade the
     social wall makes, and for the same reason: an `Html` layer is composited
     every frame whether or not it is in view, while the invisible plane that
     makes each leaflet pickable is nearly free. Three layers here was 3 of the
     room's 14, a fifth of the total, for one object on a wall behind you.

     This is also why the leaflets do not lean. Individually rotated paper
     cannot share a flat layer, and readability wanted them upright anyway. */
  const pxW = Math.round((totalW / LEAF_W) * LEAF_PX);
  const pxH = Math.round((LEAF_H / LEAF_W) * LEAF_PX);
  const gapPx = (GAP / LEAF_W) * LEAF_PX;

  /* This group is turned 180° onto the front wall, so local +z points into the
     room. Every offset below is written as "toward the visitor". */
  return (
    <group position={position} rotation={rotation}>
      {/* backboard */}
      <RoundedBox
        position={[0, 0, -0.008]}
        args={[totalW + 0.05, LEAF_H + 0.02, 0.016]}
        radius={0.004}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#2f353b" roughness={0.62} metalness={0.35} />
      </RoundedBox>

      {/* The paper, the pockets, and the picking planes. Text comes from the
          single layer below. */}
      {services.map((svc, i) => (
        <group key={svc.slug} position={[xOf(i), 0, 0]}>
          {/* pocket lip, standing proud of the board so the leaflet sits in
              something rather than against it */}
          <RoundedBox
            position={[0, -LEAF_H / 2 + LIP_H / 2, 0.026]}
            args={[LEAF_W + 0.014, LIP_H, 0.012]}
            radius={0.003}
            smoothness={3}
            castShadow
          >
            <meshStandardMaterial color="#3a4148" roughness={0.55} metalness={0.4} />
          </RoundedBox>
          {/* pocket sides */}
          {[-1, 1].map((sx) => (
            <mesh
              key={sx}
              position={[sx * (LEAF_W / 2 + 0.006), -LEAF_H / 2 + LIP_H / 2, 0.019]}
              castShadow
            >
              <boxGeometry args={[0.004, LIP_H, 0.03]} />
              <meshStandardMaterial color="#343b41" roughness={0.6} metalness={0.4} />
            </mesh>
          ))}

          {/* the sheet itself, for thickness and a shadow in the pocket */}
          <mesh position={[0, 0.012, 0.0155]} castShadow receiveShadow>
            <boxGeometry args={[LEAF_W, LEAF_H, 0.005]} />
            <meshStandardMaterial color="#f4f1ea" roughness={0.88} />
          </mesh>

          <Interactive
              label={svc.title}
              verb="take one"
              detail={svc.blurb}
              onActivate={() =>
                onOpen({
                  kicker: "services",
                  title: svc.title,
                  subtitle: svc.blurb,
                  rows: svc.proof ? [{ k: "Proof", v: svc.proof.label }] : [],
                  body: svc.summary,
                  /* The bullets deliberately do not come along. `tags` renders
                     10px chips for stack labels, and a full sentence in one
                     reads as a layout accident; the section on the site is one
                     click away and lays them out properly. */
                  href: "/#services",
                  hrefLabel: "see all services",
                })
              }
            >
            {(hovered) => (
              <group position={[0, 0.012, 0.017]}>
                <mesh visible={false}>
                  <planeGeometry args={[LEAF_W, LEAF_H]} />
                  <meshBasicMaterial />
                </mesh>
                {/* Hover shows as a ring peeking around the sheet rather than
                    a glow on it: the layer above paints the paper opaquely, so
                    lighting the mesh underneath would never be seen. */}
                <mesh position={[0, 0, -0.004]} visible={hovered}>
                  <planeGeometry args={[LEAF_W + 0.018, LEAF_H + 0.018]} />
                  <meshBasicMaterial color="#ffd9a6" />
                </mesh>
              </group>
            )}
          </Interactive>
        </group>
      ))}

      <Html
        transform
        occlude="blending"
        distanceFactor={(totalW / pxW) * 400}
        position={[0, 0.012, 0.0185]}
        zIndexRange={[10, 0]}
        style={{
          width: `${pxW}px`,
          height: `${pxH}px`,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div className="flex h-full w-full" style={{ gap: `${gapPx}px` }}>
          {services.map((svc) => {
            const tone = SERVICE_TONE[svc.accent] ?? ACCENT.brand;
            return (
              <div
                key={svc.slug}
                className="flex flex-col"
                style={{
                  width: `${LEAF_PX}px`,
                  flex: `0 0 ${LEAF_PX}px`,
                  padding: "27px 21px",
                  /* Paper painted here, not left to the mesh — this wall faces
                     away from the lamps, same as the career frame. */
                  background: "linear-gradient(160deg, #fbf8f1 0%, #efeae0 100%)",
                  color: "#26313d",
                }}
              >
                <div
                  className="font-mono"
                  style={{
                    fontSize: "15px",
                    letterSpacing: "0.18em",
                    color: tone,
                    filter: "brightness(0.72)",
                  }}
                >
                  SERVICE
                </div>
                <div
                  style={{
                    height: "3px",
                    background: tone,
                    margin: "10px 0 14px",
                    width: "44px",
                  }}
                />
                <div
                  style={{ fontSize: "27px", fontWeight: 600, lineHeight: 1.15 }}
                >
                  {svc.title}
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    lineHeight: 1.35,
                    color: "#5d6875",
                    marginTop: "13px",
                  }}
                >
                  {svc.blurb}
                </div>
              </div>
            );
          })}
        </div>
      </Html>
    </group>
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
          // The activities moved out of the body and into chips on the About
          // card, which this room has no equivalent of, so they are appended
          // back onto the sentence here rather than lost.
          body: [fitness?.body, fitness?.activities?.join(", ")]
            .filter(Boolean)
            .join(" "),
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
 * The career timeline, framed on the wall above the desk. Portrait frame,
 * vertical rail, real type — shapes standing in for words are a diagram of a
 * timeline, not one, and six roles laid horizontally leave no width for a
 * job title.
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
