import type { Metadata } from "next";
import { Fragment_Mono, Source_Serif_4 } from "next/font/google";
import {
  a11y,
  colorGroups,
  dataSeries,
  fonts,
  imagery,
  licensing,
  motion,
  radii,
  semantic,
  spacing,
  theme,
  typeScale,
} from "@/content/brand";
import "./brand.css";

// Loaded on this route only, and self-hosted at build time by next/font, so
// the specimens are the real faces rather than a fallback approximation and
// no request reaches Google at runtime. Both are OFL-1.1.
const specimenSerif = Source_Serif_4({
  variable: "--b-serif",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const specimenMono = Fragment_Mono({
  variable: "--b-mono-face",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
});

/**
 * Brand system spec. Unlisted: not in the nav, not in the sitemap, noindex.
 * Reachable from the fun-room terminal with `brand`, or directly by URL.
 */
export const metadata: Metadata = {
  title: "Brand system",
  description: "Colour, type, spacing and imagery specification.",
  robots: { index: false, follow: false },
};

export default function BrandPage() {
  return (
    // A div, not a main: the root layout already provides the page's <main>.
    <div className={`bsys ${specimenSerif.variable} ${specimenMono.variable}`}>
      <div className="bsys__wrap">
        <header className="bsys__head">
          <p className="bsys__eyebrow">Brand system &middot; Eucalyptus Deepened</p>
          <h1>One place for every colour, face and rule</h1>
          <p style={{ fontSize: "1.05rem" }}>
            Hue is locked to 130. Every value below was solved against its own ground for a
            target contrast ratio rather than picked by hand, so the figures are measured. The
            categorical data colours were separately validated for colour-vision deficiency.
          </p>
          <p style={{ fontSize: "0.9rem", color: "var(--b-snow-3)" }}>
            The dark half of this system is what the site ships, token for token, in{" "}
            <code style={{ fontFamily: "var(--b-mono)" }}>styles/tokens.css</code>. The light half
            has no screen consumer — the site is dark only — and is kept for print and for
            documents.
          </p>
        </header>

        <hr className="bsys__rule" />

        {/* ------------------------------------------------------------- theme */}
        <section className="bsys__sec">
          <div className="bsys__head">
            <p className="bsys__eyebrow">
              00 &middot; Theme &middot; {theme.name} &middot; {theme.gloss} &middot; {theme.rule}
            </p>
            <h2>{theme.line}</h2>
            <p style={{ fontSize: "1.05rem" }}>{theme.intro}</p>
            {theme.register.intro.map((r) => (
              <p key={r}>{r}</p>
            ))}
          </div>

          <div className="bsys__two">
            <div className="bsys__panel">
              <div className="bsys__cap">What the register is</div>
              <div className="bsys__body">
                <ul className="bsys__list">
                  {theme.register.is.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="bsys__panel">
              <div className="bsys__cap">What it is constantly mistaken for</div>
              <div className="bsys__body">
                <ul className="bsys__list">
                  {theme.register.isNot.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bsys__head" style={{ gap: "0.35rem", marginTop: "0.6rem" }}>
            <h3>Four materials, and one lamp</h3>
            <p style={{ fontSize: "0.88rem" }}>
              Every surface on the site is one of four materials and there are no others. The
              values are read off the hero scene rather than chosen here, so the spec and the
              render cannot drift apart.
            </p>
          </div>
          <div className="bsys__grid">
            {[...theme.materials, ...theme.light].map((m) => (
              <div key={m.name} className="bsys__sw">
                <i style={{ background: m.hex }} />
                <div>
                  <b>{m.name}</b>
                  <code>{m.hex}</code>
                  <span>{m.use}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bsys__head" style={{ gap: "0.35rem", marginTop: "0.6rem" }}>
            <h3>How the page behaves</h3>
            <p style={{ fontSize: "0.88rem" }}>
              The half of a brand that no palette can express, and the half this page used to be
              missing entirely.
            </p>
          </div>
          <div className="bsys__rules">
            {theme.page.map((p) => (
              <div key={p.rule}>
                <h3>{p.rule}</h3>
                <p>{p.detail}</p>
              </div>
            ))}
          </div>

          <div className="bsys__two">
            <div className="bsys__panel">
              <div className="bsys__cap">Never</div>
              <div className="bsys__body">
                <ul className="bsys__list">
                  {theme.never.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="bsys__panel">
              <div className="bsys__cap">The tension to manage</div>
              <div className="bsys__body">
                <p style={{ margin: 0 }}>{theme.tension}</p>
              </div>
            </div>
          </div>
        </section>

        <hr className="bsys__rule" />

        {/* ------------------------------------------------------------ colour */}
        <section className="bsys__sec">
          <div className="bsys__head">
            <p className="bsys__eyebrow">01 &middot; Colour</p>
            <h2>Grounds, ink and the brand</h2>
            <p>
              No single value clears AA text contrast on both white and near-black. That is
              luminance arithmetic, not a hue problem, so the brand is a small ramp rather than
              one hex. Neutrals are hue-locked to 130 at very low saturation, so nothing on the
              page reads as default grey.
            </p>
          </div>

          {colorGroups.map((g) => (
            <div key={g.title} className="bsys__sec" style={{ gap: "0.85rem" }}>
              <div className="bsys__head" style={{ gap: "0.35rem" }}>
                <h3>{g.title}</h3>
                {g.intro ? <p style={{ fontSize: "0.88rem" }}>{g.intro}</p> : null}
              </div>
              <div className="bsys__grid">
                {g.swatches.map((s) => (
                  <div key={s.name} className="bsys__sw">
                    <i style={{ background: s.hex }} />
                    <div>
                      <b>{s.name}</b>
                      <code>{s.hex}</code>
                      {s.cr ? <em>{s.cr}</em> : null}
                      {s.use ? <span>{s.use}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ---------------------------------------------------------- semantic */}
        <section className="bsys__sec">
          <div className="bsys__head">
            <p className="bsys__eyebrow">02 &middot; Status</p>
            <h2>Four states, and only one green</h2>
            <p>
              A green brand cannot also have a separate green for success without the two
              competing. Success is the brand colour; the neutral-positive signal moves to
              teal-blue. Status never travels on colour alone.
            </p>
          </div>
          <div className="bsys__grid">
            {semantic.map((s) => (
              <div key={s.name} className="bsys__sw">
                <i style={{ background: s.dark }} />
                <div>
                  <b>{s.name}</b>
                  <code>{s.dark}</code>
                  <em>
                    {s.crDark} dark &middot; {s.light} light
                  </em>
                  <span>{s.note}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bsys__row">
            {semantic.map((s) => (
              <span
                key={s.name}
                className="bsys__badge"
                style={{ color: s.dark, borderColor: s.dark, background: s.bgDark }}
              >
                <span className="bsys__dot" style={{ background: s.dark }} aria-hidden />
                {s.name}
              </span>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------- data */}
        <section className="bsys__sec">
          <div className="bsys__head">
            <p className="bsys__eyebrow">03 &middot; Data</p>
            <h2>Five series, fixed order, never cycled</h2>
            <p>
              Assigned in this order every time. Colour follows the entity, never its rank, so a
              filter that changes the series count must not repaint the survivors. A sixth series
              folds into Other or becomes small multiples.
            </p>
          </div>
          <div className="bsys__grid">
            {dataSeries.map((d) => (
              <div key={d.name} className="bsys__sw">
                <i style={{ background: d.dark }} />
                <div>
                  <b>{d.name}</b>
                  <code>{d.dark}</code>
                  <em>{d.light} on light</em>
                  <span>{d.label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="bsys__rule" />

        {/* -------------------------------------------------------- typography */}
        <section className="bsys__sec">
          <div className="bsys__head">
            <p className="bsys__eyebrow">04 &middot; Typography</p>
            <h2>Two faces, and no sans anywhere</h2>
            <p>
              Serif headline over grotesque body over mono label is the signature of a generated
              portfolio, whatever families are substituted into it. Setting body copy in the display
              serif breaks that pattern harder than any font swap does, and Source Serif&rsquo;s
              optical-size axis is what makes it honest: a lighter cut at 60 for headlines, a
              sturdier one at 12 for paragraphs, which is how metal type actually worked.
            </p>
            <p style={{ fontSize: "0.9rem", color: "var(--b-snow-3)" }}>
              Rank is position in Google Fonts popularity out of 1,942 families, used as a proxy for
              how worn a choice is. The faces these replace sat at 5, 59 and 93, all inside the top
              five per cent and all staples of generated design.
            </p>
          </div>

          <div className="bsys__grid">
            {fonts.map((f) => (
              <div key={f.role} className="bsys__sw">
                <div style={{ padding: "1rem 0.9rem" }}>
                  <b>{f.role}</b>
                  <code style={{ fontSize: "1.05rem" }}>{f.family}</code>
                  <em>
                    {f.weights} &middot; {f.license} &middot; rank {f.rank}
                  </em>
                  <span>{f.why}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bsys__panel">
            <div className="bsys__cap">Scale &middot; Source Serif, optical size by step</div>
            <div className="bsys__body">
              <div className="bsys__type">
                {typeScale.map((t) => (
                  <div key={t.role}>
                    <div className="bsys__typemeta">
                      <b>{t.role}</b>
                      {t.size}
                      <br />
                      {t.weight} &middot; lh {t.lh}
                      <br />
                      {t.tracking}
                    </div>
                    <div
                      className="bsys__sample"
                      style={{
                        fontFamily:
                          t.face === "display"
                            ? "var(--b-display)"
                            : t.face === "mono"
                              ? "var(--b-mono)"
                              : "var(--b-body)",
                        fontSize: t.size,
                        fontWeight: t.weight,
                        lineHeight: t.lh,
                        letterSpacing: t.tracking,
                        textTransform: t.role === "label" ? "uppercase" : undefined,
                        fontVariantNumeric: t.face === "mono" ? "tabular-nums" : undefined,
                      }}
                    >
                      {t.sample}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <hr className="bsys__rule" />

        {/* ------------------------------------------------- spacing / motion */}
        <section className="bsys__sec">
          <div className="bsys__head">
            <p className="bsys__eyebrow">05 &middot; Space, shape, motion</p>
            <h2>A 4px rhythm and almost no corner radius</h2>
            <p>
              Square corners are load-bearing. Rounding them, lightening the ground and thinning
              the type is exactly the treatment that makes a green like this read as a wellness
              brand rather than an engineering one.
            </p>
          </div>
          <div className="bsys__two">
            <div className="bsys__panel">
              <div className="bsys__cap">Spacing</div>
              <div className="bsys__body">
                <div className="bsys__scale">
                  {spacing.map((s) => (
                    <div key={s.token}>
                      <code>{s.token}</code>
                      <code>{s.px}px</code>
                      <span className="bsys__bar" style={{ width: `${s.px}px`, maxWidth: "100%" }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bsys__panel">
              <div className="bsys__cap">Radius &amp; motion</div>
              <div className="bsys__body" style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
                <div className="bsys__scale">
                  {radii.map((r) => (
                    <div key={r.token} style={{ gridTemplateColumns: "3.5rem 4rem 1fr" }}>
                      <code>{r.token}</code>
                      <code>{r.px}px</code>
                      <span>{r.use}</span>
                    </div>
                  ))}
                </div>
                <div className="bsys__scale">
                  {motion.map((m) => (
                    <div key={m.token} style={{ gridTemplateColumns: "3.5rem 4rem 1fr" }}>
                      <code>{m.token}</code>
                      <code>{m.ms}ms</code>
                      <span>{m.use}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="bsys__rule" />

        {/* -------------------------------------------------------- components */}
        <section className="bsys__sec">
          <div className="bsys__head">
            <p className="bsys__eyebrow">06 &middot; Components</p>
            <h2>States are part of the spec, not an afterthought</h2>
            <p>
              Hover, pressed, focus and disabled are specified for every interactive element.
              Targets are at least 44px tall. Focus rings are never removed.
            </p>
          </div>

          <div className="bsys__two">
            <div className="bsys__panel">
              <div className="bsys__cap">Buttons &middot; hover and focus them</div>
              <div className="bsys__body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="bsys__row">
                  <button type="button" className="bsys__btn bsys__btn--primary">Start a conversation</button>
                  <button type="button" className="bsys__btn bsys__btn--secondary">Read the work</button>
                </div>
                <div className="bsys__row">
                  <button type="button" className="bsys__btn bsys__btn--ghost">Cancel</button>
                  <button type="button" className="bsys__btn bsys__btn--danger">Delete cluster</button>
                  <button type="button" className="bsys__btn bsys__btn--primary" disabled>Disabled</button>
                </div>
                <p style={{ fontSize: "0.82rem" }}>
                  One primary action per view. Destructive actions sit apart from the primary and
                  carry a confirmation step.
                </p>
              </div>
            </div>

            <div className="bsys__panel">
              <div className="bsys__cap">Inputs &middot; label, helper, error</div>
              <div className="bsys__body" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div className="bsys__field">
                  <label htmlFor="bsys-a">Cluster name</label>
                  <input id="bsys-a" placeholder="genesis-prod" />
                  <span className="bsys__help">Lowercase, digits and hyphens.</span>
                </div>
                <div className="bsys__field">
                  <label htmlFor="bsys-b">Namespace</label>
                  <input id="bsys-b" defaultValue="Prod Cluster" aria-invalid="true" aria-describedby="bsys-b-err" />
                  <span className="bsys__err" id="bsys-b-err">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <circle cx="8" cy="8" r="6.6" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M8 4.8v3.8M8 11.1h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    Uppercase is not allowed. Use prod-cluster.
                  </span>
                </div>
                <p style={{ fontSize: "0.82rem" }}>
                  Visible label always, never placeholder-only. Errors sit below the field they
                  belong to, state the cause and the fix, and carry an icon.
                </p>
              </div>
            </div>
          </div>

          <div className="bsys__two">
            <div className="bsys__panel">
              <div className="bsys__cap">Card</div>
              <div className="bsys__body">
                <div className="bsys__card">
                  <span
                    style={{
                      fontFamily: "var(--b-mono)", fontSize: "0.62rem", letterSpacing: "0.12em",
                      textTransform: "uppercase", color: "var(--b-snow-3)",
                    }}
                  >
                    Selected work
                  </span>
                  <h4>Genesis</h4>
                  <p style={{ fontSize: "0.86rem" }}>
                    Six-node Proxmox cluster running Talos Kubernetes, reconciled by ArgoCD.
                  </p>
                  <span style={{ color: "var(--b-brand)", fontWeight: 600, fontSize: "0.84rem" }}>
                    Read the case study &rarr;
                  </span>
                </div>
              </div>
            </div>

            <div className="bsys__panel">
              <div className="bsys__cap">Table &middot; tabular numerals</div>
              <div className="bsys__body">
                <div className="bsys__tablewrap">
                  <table className="bsys__table">
                    <thead>
                      <tr>
                        <th>Node</th>
                        <th className="n">CPU</th>
                        <th className="n">Memory</th>
                        <th>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["talos-cp-1", "12%", "38%", "success", "Ready"],
                        ["talos-w-2", "64%", "71%", "warning", "Pressure"],
                        ["talos-w-3", "8%", "22%", "success", "Ready"],
                      ].map(([n, c, m, kind, label]) => {
                        const s = semantic.find((x) => x.name === kind)!;
                        return (
                          <tr key={n}>
                            <td style={{ fontFamily: "var(--b-mono)" }}>{n}</td>
                            <td className="n">{c}</td>
                            <td className="n">{m}</td>
                            <td>
                              <span className="bsys__badge" style={{ color: s.dark, borderColor: s.dark, background: s.bgDark }}>
                                <span className="bsys__dot" style={{ background: s.dark }} aria-hidden />
                                {label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="bsys__rule" />

        {/* ------------------------------------------------------------ imagery */}
        <section className="bsys__sec">
          <div className="bsys__head">
            <p className="bsys__eyebrow">07 &middot; Imagery</p>
            <h2>Two surfaces, two opposite rules</h2>
            <p>{imagery.intro}</p>
          </div>

          <div className="bsys__two" style={{ marginBottom: "1.5rem" }}>
            <div className="bsys__panel">
              <div className="bsys__cap">On the site &middot; rendered</div>
              <div className="bsys__body">
                <p style={{ marginTop: 0 }}>{imagery.onsite.intro}</p>
                <ul className="bsys__list">
                  {imagery.onsite.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="bsys__panel">
              <div className="bsys__cap">Off the site &middot; flat</div>
              <div className="bsys__body">
                <p style={{ marginTop: 0 }}>{imagery.offsite.intro}</p>
                <ul className="bsys__list">
                  {imagery.offsite.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bsys__imggrid">
            <figure className="bsys__mock" style={{ background: imagery.offsite.grounds[0], margin: 0 }}>
              <svg viewBox="0 0 200 112" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden>
                <circle cx="150" cy="34" r="26" fill="none" stroke="#65a16e" strokeWidth="2" />
                <circle cx="150" cy="34" r="15" fill="none" stroke="#65a16e" strokeWidth="2" opacity="0.5" />
                <path d="M14 90h70M14 80h44" stroke="#a1ada3" strokeWidth="2" opacity="0.6" />
              </svg>
              <figcaption>cover &middot; field ground, one accent</figcaption>
            </figure>
            <figure className="bsys__mock" style={{ background: imagery.offsite.grounds[1], margin: 0 }}>
              <svg viewBox="0 0 200 112" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden>
                {[0, 1, 2, 3].map((r) =>
                  [0, 1, 2, 3, 4, 5].map((c) => (
                    <rect
                      key={`${r}-${c}`} x={112 + c * 13} y={16 + r * 13} width="8" height="8"
                      fill={r === 1 && c === 3 ? "#65a16e" : "#2a382c"}
                    />
                  )),
                )}
              </svg>
              <figcaption>og card &middot; anchor ground, grid</figcaption>
            </figure>
            <figure className="bsys__mock" style={{ background: imagery.offsite.grounds[2], margin: 0 }}>
              <svg viewBox="0 0 200 112" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden>
                <path d="M100 22 148 50v34l-48 28-48-28V50z" fill="none" stroke="#65a16e" strokeWidth="2" />
                <path d="M100 22v34m0 0 48 28m-48-28-48 28" stroke="#a1ada3" strokeWidth="1.5" opacity="0.55" />
              </svg>
              <figcaption>diagram &middot; subtle ground, geometry</figcaption>
            </figure>
          </div>

          <div className="bsys__panel">
            <div className="bsys__cap">Off-site generation prompt &middot; paste as-is</div>
            <div className="bsys__body" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <pre className="bsys__pre">{imagery.offsite.prompt}</pre>
              <p style={{ fontSize: "0.82rem" }}>
                Append the subject to the front. Keep the constraint tail unchanged, since the
                negatives are what stop a generator returning the glossy 3D blob it defaults to.
                There is no equivalent prompt for on-site imagery: those are rendered in the
                scene, not generated.
              </p>
            </div>
          </div>
        </section>

        <hr className="bsys__rule" />

        {/* ---------------------------------------------------------- licensing */}
        <section className="bsys__sec">
          <div className="bsys__head">
            <p className="bsys__eyebrow">08 &middot; Licensing</p>
            <h2>Everything here is free to use commercially</h2>
            <p>
              Checked against the upstream repositories rather than assumed. All three faces are
              SIL Open Font License 1.1, which permits commercial use, embedding and modification
              at no cost. Colour values cannot be copyrighted at all; only a name or a mark can.
            </p>
          </div>

          <div className="bsys__panel">
            <div className="bsys__cap">Cleared</div>
            <div className="bsys__body">
              <div className="bsys__tablewrap">
                <table className="bsys__table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Licence</th>
                      <th>Commercial</th>
                      <th>Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licensing.cleared.map((l) => (
                      <tr key={l.item}>
                        <td style={{ color: "var(--b-snow)" }}>{l.item}</td>
                        <td style={{ fontFamily: "var(--b-mono)" }}>{l.license}</td>
                        <td>
                          <span
                            className="bsys__badge"
                            style={{
                              color: "var(--b-success)",
                              borderColor: "var(--b-success)",
                              background: "var(--b-subtle-d)",
                            }}
                          >
                            <span className="bsys__dot" style={{ background: "var(--b-success)" }} aria-hidden />
                            {l.commercial}
                          </span>
                        </td>
                        <td>{l.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bsys__two">
            <div className="bsys__panel">
              <div className="bsys__cap">What the licence asks in return</div>
              <div className="bsys__body">
                <ul className="bsys__list">
                  {licensing.obligations.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="bsys__panel">
              <div className="bsys__cap">Still open</div>
              <div className="bsys__body">
                <ul className="bsys__list">
                  {licensing.open.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <hr className="bsys__rule" />

        {/* ------------------------------------------------------ accessibility */}
        <section className="bsys__sec">
          <div className="bsys__head">
            <p className="bsys__eyebrow">09 &middot; Non-negotiables</p>
            <h2>What is not up for redesign</h2>
          </div>
          <div className="bsys__rules">
            {a11y.map((r) => (
              <div key={r.rule}>
                <h3>{r.rule}</h3>
                <p>{r.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <footer style={{ color: "var(--b-snow-3)", fontSize: "0.82rem" }}>
          <hr className="bsys__rule" style={{ marginBottom: "1.1rem" }} />
          <p style={{ color: "var(--b-snow-3)" }}>
            Ratios are WCAG 2.1 against each token&rsquo;s own ground. Type specimens render in
            system fallbacks until Source Serif and Fragment Mono are loaded, so treat the shapes
            as indicative and the hierarchy as the specification.
          </p>
        </footer>
      </div>
    </div>
  );
}
