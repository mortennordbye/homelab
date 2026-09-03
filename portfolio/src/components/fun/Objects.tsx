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
import { PAPER } from "@/components/materials/paper";
import type { CareerData } from "./shelf";

/**
 * The remaining portfolio sections as objects: socials, contact, skills,
 * services, the two interests, and the career.
 *
 * Two rules for all of them. Anything meant to be looked at presents a face to
 * the room, big enough to put a crosshair on. And it is a thing somebody would
 * own: none of these hangs on a wall any more, because six portfolio panels
 * screwed to a flat is the failure `branding/ART-DIRECTION.md` names — a UI
 * pasted over a photograph — committed in three dimensions.
 */

/**
 * The social links, as a note held to the fridge door by magnets — which is
 * where a flat keeps the things it wants to hand. They were a row of framed
 * tiles screwed to the wall above the desk, which is not something anybody has.
 *
 * The marks are still Simple Icons (CC0) through a CSS mask in one `Html`
 * layer, because a logo built from geometry is unreadable from anywhere you
 * would stand. The note is what makes that layer legal: `occlude="blending"`
 * lays an occlusion plane behind the DOM, and behind transparent DOM that
 * plane is a dark rectangle floating on the door. Every other layer in the
 * room paints an opaque background for the same reason. Here the opaque thing
 * is a piece of paper, which is also the only reason three social links would
 * be on a fridge at all.
 *
 * Rendered as a child of the fridge door, so it swings with it. Placed in
 * world space instead it would hang in mid-air the moment somebody opened the
 * fridge. Origin is the centre of the door's outer face, local +z out of it.
 */
const SOCIAL_ICON: Record<string, { file: string; colour: string }> = {
  GitHub: { file: "github", colour: "#e6edf3" },
  LinkedIn: { file: "linkedin", colour: "#4aa3f0" },
  Blog: { file: "rss", colour: "#f0913a" },
};

const NOTE_W = 0.21;
const NOTE_H = 0.285;
const NOTE_PX = 560;
/** Where the note sits on the door, measured up from the door's centre. */
const NOTE_Y = 0.4;
/** The magnets holding it, in metres from the note centre. Two, off-square,
 *  because a note held by one magnet hangs askew and by four reads as framed. */
const MAGNET_AT: [number, number][] = [
  [-0.068, 0.117],
  [0.071, 0.121],
];
const MAGNET_D = 0.03;

export function FridgeMagnets({ onOpen }: { onOpen: (card: InfoCard) => void }) {
  const socials = site.socials;
  const pxH = Math.round((NOTE_H / NOTE_W) * NOTE_PX);
  /** Authored pixels per metre, so the rows in the DOM and the picking planes
   *  in front of them are laid out from one number. */
  const ppm = NOTE_PX / NOTE_W;
  const rowH = NOTE_H * 0.19;
  /** Row i's centre, measured from the note centre. The heading takes the top
   *  third, so the rows hang off the bottom of the note rather than being
   *  spread down all of it. */
  const rowY = (i: number) => NOTE_H / 2 - NOTE_H * 0.4 - rowH * (i + 0.5);

  return (
    <group position={[0, NOTE_Y, 0]}>
      {/* the paper, with a curl of thickness so it has an edge and a shadow */}
      <mesh position={[0, 0, 0.0015]} castShadow receiveShadow>
        <boxGeometry args={[NOTE_W, NOTE_H, 0.003]} />
        <meshStandardMaterial color={PAPER.stock} roughness={0.93} />
      </mesh>

      {MAGNET_AT.map(([mx, my]) => (
        <mesh
          key={`${mx}`}
          position={[mx, my, 0.006]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[MAGNET_D / 2, MAGNET_D / 2, 0.007, 20]} />
          <meshStandardMaterial color="#1b2027" roughness={0.5} metalness={0.25} />
        </mesh>
      ))}

      <Html
        transform
        occlude="blending"
        distanceFactor={(NOTE_W / NOTE_PX) * 400}
        position={[0, 0, 0.0035]}
        zIndexRange={[10, 0]}
        style={{
          width: `${NOTE_PX}px`,
          height: `${pxH}px`,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div
          className="flex h-full w-full flex-col"
          /* Top padding clears the magnets: the heading sat under both of
             them at the note's own 34px margin. */
          style={{ background: PAPER.stock, color: PAPER.ink, padding: "92px 34px 40px" }}
        >
          <div
            className="font-mono"
            style={{ fontSize: "31px", letterSpacing: "0.16em", fontWeight: 600 }}
          >
            FIND ME
          </div>
          <div style={{ height: "3px", background: "#cfc6b4", margin: "16px 0 6px" }} />
          <div className="flex flex-1 flex-col justify-start">
            {socials.map((item) => {
              const icon = SOCIAL_ICON[item.label];
              return (
                <div
                  key={item.label}
                  className="flex items-center"
                  style={{ height: `${rowH * ppm}px`, gap: "16px" }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      flex: "0 0 34px",
                      backgroundColor: icon?.colour ?? PAPER.ink,
                      filter: "saturate(0.7) brightness(0.72)",
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
                  <span style={{ fontSize: "30px", fontWeight: 600 }}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Html>

      {socials.map((item, i) => (
        <Interactive
          key={item.label}
          label={item.label}
          verb="open"
          detail={item.href.replace(/^https?:\/\//, "")}
          onActivate={() =>
            onOpen({
              kicker: "social",
              title: item.label,
              subtitle: item.href.replace(/^https?:\/\//, ""),
              rows: [],
              body: `Opens ${item.href} in a new tab.`,
              href: item.href,
              hrefLabel: `open ${item.label}`,
            })
          }
        >
          {(hovered) => (
            <group position={[0, rowY(i), 0.005]}>
              <mesh visible={false}>
                <planeGeometry args={[NOTE_W - 0.02, rowH]} />
                <meshBasicMaterial />
              </mesh>
              {/* Hover rings the row rather than lighting it: the layer above
                  paints the paper opaquely, so a lit mesh under it would never
                  be seen. */}
              <mesh position={[0, 0, -0.003]} visible={hovered}>
                <planeGeometry args={[NOTE_W - 0.006, rowH + 0.008]} />
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

/** The four groups the skill bars on the site are sorted into, in the order the
 *  notebook writes them down. */
const SKILL_GROUPS: { id: Skill["group"]; label: string }[] = [
  { id: "platform", label: "PLATFORM" },
  { id: "delivery", label: "DELIVERY" },
  { id: "ops", label: "OPERATIONS" },
  { id: "soft", label: "TEAM" },
];

/**
 * Skills, in the notebook lying open on the desk.
 *
 * This was a rack faceplate screwed to the wall, corner screws and all, which
 * is the least likely object anybody has in a living room. A list of what you
 * work with, written down beside the keyboard, is what the same content
 * actually looks like in a flat.
 *
 * Only the group names go on the page. The pad is 0.23 across, so the layer
 * carries roughly a tenth of the pixels the plate had: at the plate's line
 * count the type would be under 5mm tall on the desk. The full list with
 * levels is on the card, which is where it was worth reading anyway.
 *
 * Origin at the desk top. Written in the desk's own frame like everything else
 * standing on it, so local +z is toward the visitor.
 */
const PAD_W = 0.23;
const PAD_D = 0.16;
const PAD_PX = 620;

export function DeskNotebook({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: (card: InfoCard) => void;
}) {
  const top = [...skills].sort((a, b) => b.level - a.level)[0];
  const pxH = Math.round((PAD_D / PAD_W) * PAD_PX);

  return (
    <Interactive
      label="the notebook"
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
          {/* The cover, open flat and proud of the paper on every side, which
              is the only part of an open notebook you see from the side. */}
          <RoundedBox
            position={[0, 0.004, 0]}
            args={[PAD_W + 0.014, 0.008, PAD_D + 0.012]}
            radius={0.002}
            smoothness={3}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color="#2a2a2d"
              roughness={0.78}
              emissive={hovered ? "#ffd9a6" : "#000000"}
              emissiveIntensity={hovered ? 0.2 : 0}
            />
          </RoundedBox>
          {/* the block of paper, one leaf either side of the spine */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (PAD_W / 4 + 0.001), 0.0105, 0]} receiveShadow>
              <boxGeometry args={[PAD_W / 2 - 0.004, 0.005, PAD_D]} />
              <meshStandardMaterial color="#e8e2d5" roughness={0.92} />
            </mesh>
          ))}
          {/* the spine, sunk between them */}
          <mesh position={[0, 0.0095, 0]}>
            <boxGeometry args={[0.008, 0.004, PAD_D]} />
            <meshStandardMaterial color="#3a3a3e" roughness={0.8} />
          </mesh>

          <Html
            transform
            occlude="blending"
            rotation={[-Math.PI / 2, 0, 0]}
            distanceFactor={(PAD_W / PAD_PX) * 400}
            position={[0, 0.0135, 0]}
            zIndexRange={[10, 0]}
            style={{
              width: `${PAD_PX}px`,
              height: `${pxH}px`,
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {/* Paper painted in the DOM rather than left to the mesh: an unlit
                plane behind a transparent layer renders near-black, which is
                the trap the career print and the leaflets both hit. */}
            <div
              className="flex h-full w-full"
              style={{ background: PAPER.stock, color: PAPER.ink }}
            >
              <div
                className="flex flex-col justify-center"
                style={{ width: "44%", padding: "34px 0 34px 40px" }}
              >
                <div
                  className="font-mono"
                  style={{ fontSize: "34px", letterSpacing: "0.14em", fontWeight: 600 }}
                >
                  STACK
                </div>
                <div style={{ height: "3px", background: "#cfc6b4", margin: "14px 0", width: "80px" }} />
                <div style={{ fontSize: "27px", lineHeight: 1.3, color: "#7d7364" }}>
                  {skills.length} things, honestly rated
                </div>
              </div>
              {/* the ruled leaf, with the groups written down it */}
              <div
                className="flex flex-col justify-center"
                style={{
                  width: "56%",
                  padding: "30px 40px",
                  borderLeft: "2px solid #ded6c6",
                }}
              >
                {SKILL_GROUPS.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-baseline justify-between"
                    style={{
                      fontSize: "29px",
                      lineHeight: 1.52,
                      borderBottom: "1px solid #e4dccc",
                    }}
                  >
                    <span>{g.label}</span>
                    <span style={{ fontSize: "24px", color: "#9a9082" }}>
                      {skills.filter((s) => s.group === g.id).length}
                    </span>
                  </div>
                ))}
              </div>
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

/**
 * The services, as three leaflets stood on the shoe bench by the front door —
 * post that came through the letterbox and got propped up so it would not be
 * forgotten. They were in a steel pocket rack screwed to the living room wall,
 * which is a thing that exists in a doctor's waiting room and nowhere else.
 *
 * The paper itself is unchanged, and so is the reason it stands upright rather
 * than lying in a pile: a flat stack presents only its top sheet to a standing
 * eye line, which is the failure the certificates had before they were stood
 * up. Anything meant to be looked at presents a face to the room.
 *
 * Origin at the middle of the row, at the paper's own centre. The caller leans
 * the whole group back against the wall; the leaflets do not lean
 * individually, because rotated paper cannot share one flat `Html` layer and
 * three layers here was a fifth of the room's total.
 */
export function ServiceLeaflets({
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
  const GAP = 0.01;
  /** Authoring width of one leaflet inside the shared layer. */
  const LEAF_PX = 300;

  const n = services.length;
  const totalW = n * LEAF_W + (n - 1) * GAP;
  const xOf = (i: number) => -totalW / 2 + LEAF_W / 2 + i * (LEAF_W + GAP);

  const pxW = Math.round((totalW / LEAF_W) * LEAF_PX);
  const pxH = Math.round((LEAF_H / LEAF_W) * LEAF_PX);
  const gapPx = (GAP / LEAF_W) * LEAF_PX;

  return (
    <group position={position} rotation={rotation}>
      {services.map((svc, i) => (
        <group key={svc.slug} position={[xOf(i), 0, 0]}>
          {/* the sheet itself, for thickness and the shadow it throws on the
              one behind it */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[LEAF_W, LEAF_H, 0.004]} />
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
              <group position={[0, 0, 0.003]}>
                <mesh visible={false}>
                  <planeGeometry args={[LEAF_W, LEAF_H]} />
                  <meshBasicMaterial />
                </mesh>
                {/* Hover shows as a ring peeking around the sheet rather than
                    a glow on it: the layer above paints the paper opaquely, so
                    lighting the mesh underneath would never be seen. */}
                <mesh position={[0, 0, -0.006]} visible={hovered}>
                  <planeGeometry args={[LEAF_W + 0.016, LEAF_H + 0.016]} />
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
        position={[0, 0, 0.0035]}
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
                  /* Paper painted here, not left to the mesh: the entré has one
                     small lamp in it and an unlit plane behind a transparent
                     layer renders near-black. */
                  background: PAPER.stock,
                  color: PAPER.ink,
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
                <div style={{ fontSize: "27px", fontWeight: 600, lineHeight: 1.15 }}>
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
 * The career, as a photo album stood on the bookshelf between the lamp and the
 * printer. It was a framed print of the whole timeline, hung on the wall over
 * the kitchen return — a chart of your own jobs is not a thing anybody frames.
 *
 * The cover carries the years and the current role and nothing else. The album
 * is 0.24 across against the print's 0.62, so the timeline itself would render
 * at a third of the type size it needed; it goes on the card, where every role
 * and every line of education already was.
 */
export function PhotoAlbum({
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
  const W = 0.24;
  const H = 0.3;
  const T = 0.042;
  const PX_W = 480;
  const PX_H = Math.round((H / W) * PX_W);

  const now = career.roles[0];
  /* The span comes off the data rather than being written down. A period is
     "Aug 2021 — Aug 2023" or "Jan 2026 — Present", so the years in it are
     whatever four digits it holds — and a role with only one of them is the
     one still running, which is what "now" is for. Reading the end off the
     clock instead would date the album to this year even if the last job
     ended three years ago. */
  const years = career.roles.flatMap((r) => r.period.match(/\d{4}/g) ?? []);
  const open = career.roles.some((r) => (r.period.match(/\d{4}/g) ?? []).length < 2);
  const span = years.length
    ? `${years.reduce((a, b) => (a < b ? a : b))}–${
        open ? "now" : years.reduce((a, b) => (a > b ? a : b))
      }`
    : "";

  return (
    <Interactive
      label="the album"
      verb="open"
      detail={`${career.roles.length} roles · ${career.education.length} in education`}
      onActivate={() =>
        onOpen({
          kicker: "career",
          title: "Where I have worked",
          subtitle: now ? `Now: ${now.role}, ${now.company}` : undefined,
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
          {/* The boards, in cloth. Rounded hard on the spine edge and barely at
              all on the fore edge, which is most of what tells a bound album
              from a box. */}
          <RoundedBox args={[W, H, T]} radius={0.006} smoothness={4} castShadow receiveShadow>
            <meshStandardMaterial
              color="#4a3b31"
              roughness={0.86}
              emissive={hovered ? "#ffd9a6" : "#000000"}
              emissiveIntensity={hovered ? 0.22 : 0}
            />
          </RoundedBox>
          {/* the block of pages, set in from the boards on three sides */}
          <mesh position={[0.004, 0, 0]} receiveShadow>
            <boxGeometry args={[W - 0.012, H - 0.01, T - 0.014]} />
            <meshStandardMaterial color="#ded6c4" roughness={0.94} />
          </mesh>
          {/* the spine band */}
          <mesh position={[-W / 2 + 0.018, 0, T / 2 + 0.001]}>
            <planeGeometry args={[0.006, H - 0.03]} />
            <meshStandardMaterial color="#8a6133" roughness={0.6} metalness={0.3} />
          </mesh>

          {/* The label on the cover: paper stuck to cloth, not printing on it,
              because a cover that carries type edge to edge reads as a book
              jacket and this is meant to be somebody's album. */}
          <mesh position={[0.012, 0.012, T / 2 + 0.0012]} receiveShadow>
            <planeGeometry args={[W - 0.075, H * 0.42]} />
            <meshStandardMaterial color={PAPER.stock} roughness={0.92} />
          </mesh>
          <Html
            transform
            occlude="blending"
            distanceFactor={(W / PX_W) * 400}
            position={[0.012, 0.012, T / 2 + 0.0022]}
            zIndexRange={[10, 0]}
            style={{
              width: `${PX_W - 150}px`,
              height: `${Math.round(PX_H * 0.42)}px`,
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <div
              className="flex h-full w-full flex-col justify-center"
              style={{ background: PAPER.stock, color: PAPER.ink, padding: "0 26px" }}
            >
              <div
                className="font-mono"
                style={{ fontSize: "34px", letterSpacing: "0.24em", fontWeight: 600 }}
              >
                CAREER
              </div>
              <div
                className="font-mono"
                style={{ fontSize: "30px", color: "#8b8271", marginTop: "10px" }}
              >
                {span}
              </div>
              {now && (
                <div style={{ fontSize: "26px", lineHeight: 1.25, marginTop: "18px" }}>
                  {now.company}
                </div>
              )}
            </div>
          </Html>
        </group>
      )}
    </Interactive>
  );
}
