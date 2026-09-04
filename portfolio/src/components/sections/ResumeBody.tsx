import { Reveal } from "@/components/primitives/Reveal";
import { certs, education, experience, summary } from "@/content/resume";
import { site } from "@/content/site";

/**
 * The resume, set as a sheet of paper (branding/DECISIONS.md §12: everything
 * is an object or a document). Reading happens here with no click; the object
 * on the desk is how you take the PDF away (§4). The broadsheet layout is
 * load-bearing: every word of every role stays on the sheet, height paid for
 * with columns; everything flush left off one edge, dates as overlines;
 * education runs two-up and the certifications one line to an entry.
 */

// Current engagement plus the one before it; the rest is one press away, and
// the whole record stays in the DOM for crawlers and screen readers.
const ABOVE_THE_FOLD = 2;

/** One role, set the same way whichever side of the fold it falls on. */
function roles(from: number, to?: number) {
  return experience.slice(from, to).map((e, i) => {
    const paras = Array.isArray(e.description) ? e.description : [e.description];
    return (
      <Reveal
        key={`${e.company}-${from + i}`}
        delay={i * 0.04}
        className="mt-10 border-t border-[rgba(58,46,29,0.16)] pt-9 first:mt-8 first:border-t-0 first:pt-0"
      >
        <EntryHead
          title={e.role}
          meta={[e.company, e.location].filter(Boolean).join("  ·  ")}
          when={e.period}
        />
        <Prose paras={paras} />
      </Reveal>
    );
  });
}

export function ResumeBody() {
  return (
    <article className="sheet mx-auto max-w-[60rem] px-7 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
      <Masthead />

      {/* Ahead of Experience, not between two of its roles: a run dropped into
          the middle of the list is what forces a "continued" label on the half
          below the fold. Here nothing is split and the fold stays the only
          break on the sheet. */}
      <Run label="Licenses and certifications">
        <Certifications />
      </Run>

      <Run label="Experience">
        {roles(0, ABOVE_THE_FOLD)}

        {/* The fold, inside the Experience run so the roles below it continue
            the same list.
            A <details> rather than a state hook, which is what keeps this file
            a server component: no client JS, keyboard and screen-reader
            behaviour for free, the hidden text still in the DOM for crawlers,
            and Chrome's find-in-page opens it on a hit. */}
        <details className="group [&_summary::-webkit-details-marker]:hidden">
          {/* The control has to read as pressable, and the first version did not.
              A line of small caption-grey type between two hairlines is the exact
              shape of a divider, so it was taken for one and the rest of the
              record went unread.

              What it cannot be is green: §2 spends that once per view, and this
              section already spends it on the take action above the object. So
              the affordance is ink and shape instead — a bordered box at full
              8.9:1 contrast, big enough to be a target, with a real arrow in it.
              That is what a control printed on a form looks like, which is the
              only kind of button this sheet can carry. */}
          <summary className="focus-ring mt-14 flex cursor-pointer list-none flex-col items-center gap-3">
            <span className="inline-flex items-center gap-3 rounded-[2px] border border-[rgba(58,46,29,0.55)] bg-[rgba(58,46,29,0.05)] px-5 py-3.5 font-mono text-[0.68rem] tracking-[0.16em] whitespace-nowrap text-[color:var(--paper-ink)] uppercase transition-colors duration-200 hover:border-[rgba(58,46,29,0.9)] hover:bg-[rgba(58,46,29,0.11)] sm:gap-3.5 sm:px-7 sm:text-[0.72rem] sm:tracking-[0.18em]">
              <span className="group-open:hidden">Read the full record</span>
              <span className="hidden group-open:inline">Fold the record back</span>
              {/* The nod lives on the wrapper so it does not fight the flip: the
                  arrow's rotation and its bob would otherwise be the same
                  property on the same element. */}
              <span aria-hidden className="fold-arrow">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="transition-transform duration-300 group-open:-rotate-180"
                >
                  <circle cx="8" cy="8" r="7.2" stroke="currentColor" strokeOpacity="0.5" />
                  <path
                    d="M4.9 6.7 8 9.8l3.1-3.1"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </span>
            <span className="font-mono text-[0.62rem] tracking-[0.14em] text-[color:var(--paper-ink-3)] uppercase group-open:hidden">
              {experience.length - ABOVE_THE_FOLD} more roles · education
            </span>
          </summary>

          {/* The remaining roles continue the run above without repeating its
              label, so the fold reads as a break in one list rather than as the
              start of a second one. */}
          <div>{roles(ABOVE_THE_FOLD)}</div>

          <Run label="Education">
            <Rows>
              {education.map((e, i) => (
                <Cell key={e.title} index={i}>
                  <EntryHead title={e.title} meta={e.institution} when={e.period} small />
                  {e.detail && (
                    <p className="mt-3 text-[0.94rem] leading-relaxed">{e.detail}</p>
                  )}
                </Cell>
              ))}
            </Rows>
          </Run>

          {/* The sheet states its own provenance, the way FooterStamp does for
              the page. Every value here is measured rather than typed. */}
          <p className="mt-16 flex flex-wrap justify-between gap-x-8 gap-y-2 border-t border-[rgba(58,46,29,0.22)] pt-5 font-mono text-[0.64rem] tracking-[0.08em] text-[color:var(--paper-ink-3)]">
            <span>
              {site.firstName} {site.lastName} · {site.location}
            </span>
            <span>
              {experience.length} roles · {certs.length} certifications
            </span>
          </p>
        </details>
      </Run>
    </article>
  );
}

/**
 * The certifications, one line to a certificate rather than two-up.
 *
 * The two-up grid this replaced existed because a four-line entry given the
 * full 848px measure is mostly empty paper. One line to an entry answers that
 * the other way round, and it is what lets the whole run sit above the fold:
 * six certificates cost ~190px set this way against ~340px set as cells.
 *
 * Nothing is abbreviated to make it fit. The title, the issuer and the
 * paperwork are the strings the record already carries; only their
 * arrangement changed.
 */
function Certifications() {
  return (
    <div className="mt-6">
      {certs.map((c) => (
        <div
          key={c.title}
          className="flex flex-wrap items-baseline border-b border-[rgba(58,46,29,0.18)] py-2.5 first:border-t first:border-t-[rgba(58,46,29,0.18)] sm:flex-nowrap sm:py-3"
        >
          {/* Below sm the date leads as an overline: trailing the issuer, it
              lands hard against the credential number with nothing between. */}
          <p className="order-first w-full shrink-0 pb-0.5 font-mono text-[0.63rem] tracking-[0.13em] whitespace-nowrap text-[color:var(--paper-ink-3)] uppercase sm:order-last sm:w-[9ch] sm:pb-0 sm:pl-4 sm:text-right">
            {c.date}
          </p>
          <h5
            className="font-display text-[1.02rem] font-semibold tracking-[-0.005em]"
            style={{ fontVariationSettings: '"opsz" 18' }}
          >
            {c.title}
          </h5>
          <p className="text-[0.93rem] text-[color:var(--paper-ink-2)] sm:pl-2.5">
            {c.issuer}
          </p>
          <span aria-hidden className="hidden min-w-6 flex-1 sm:block" />
          {(c.credentialId || c.href) && (
            <p className="font-mono text-[0.63rem] tracking-[0.09em] whitespace-nowrap text-[color:var(--paper-ink-3)] sm:pl-4">
              {/* Only below sm, where this runs straight on from the issuer with
                  nothing between. Above it the flex fill is the separation. */}
              <span className="sm:hidden">
                <Sep />
              </span>
              {c.credentialId}
              {c.href && (
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring uppercase underline underline-offset-4 hover:text-[color:var(--paper-ink)]"
                >
                  Certificate
                </a>
              )}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * The masthead: name and role left, contact block right — the block that
 * belongs there on every CV, and what keeps the top from being empty paper.
 */
function Masthead() {
  return (
    <header>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-[clamp(2.1rem,4.6vw,3rem)] leading-[1.02] tracking-[-0.022em]">
            {site.firstName} {site.lastName}
          </h3>
          <p className="mt-3 font-mono text-[0.6875rem] tracking-[0.2em] text-[color:var(--paper-ink-3)] uppercase">
            {site.role}
          </p>
        </div>
        <dl className="font-mono text-[0.7rem] leading-[2] tracking-[0.04em] text-[color:var(--paper-ink-2)] sm:text-right">
          <div>
            <dt className="sr-only">Location</dt>
            <dd>{site.location}</dd>
          </div>
          <div>
            <dt className="sr-only">Email</dt>
            <dd>
              <a
                href={`mailto:${site.email}`}
                className="focus-ring underline decoration-[rgba(58,46,29,0.3)] underline-offset-4 hover:decoration-[rgba(58,46,29,0.7)]"
              >
                {site.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="sr-only">Site</dt>
            <dd>{site.homepage}</dd>
          </div>
          <div>
            <dt className="sr-only">GitHub</dt>
            <dd>github.com/{site.github}</dd>
          </div>
        </dl>
      </div>

      {/* The brass rule runs the full measure here rather than sitting as a
          92px mark, because at this width it is the masthead's own rule and a
          short stub under a 3rem name reads as an offcut. */}
      <span
        aria-hidden
        className="mt-8 block h-[2px] w-full"
        style={{ background: "linear-gradient(90deg, var(--brass), rgba(127,90,47,0.08))" }}
      />

      {/* The standfirst. Set larger than the body and held to one column at
          reading measure: it is the only paragraph read cold, and a standfirst
          set in columns reads as body copy rather than as an opening. */}
      <p className="mt-8 max-w-[64ch] text-[1.12rem] leading-[1.62]">{summary}</p>
    </header>
  );
}

/**
 * The head of an entry. Paper has one hue, so hierarchy is carried by three
 * distinct registers:
 *
 *   the title   large serif at 600, the only heavy thing in the entry
 *   the date    mono, small, pushed to the right edge on its own baseline
 *   the meta    serif at body size in the second ink, under the title
 *
 * The date sits right of the title: it is the field a CV is scanned by and
 * belongs on the line of the thing it dates.
 */
function EntryHead({
  title,
  meta,
  when,
  small,
}: {
  title: string;
  meta: string;
  when: string;
  small?: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-x-8 gap-y-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h5
          className={
            "font-display font-semibold tracking-[-0.008em] " +
            (small ? "text-[1.12rem] leading-snug" : "text-[1.55rem] leading-[1.2]")
          }
          style={{ fontVariationSettings: small ? '"opsz" 18' : '"opsz" 24' }}
        >
          {title}
        </h5>
        <p className="shrink-0 font-mono text-[0.64rem] tracking-[0.14em] text-[color:var(--paper-ink-3)] uppercase sm:pt-1">
          {when}
        </p>
      </div>
      <p
        className={
          "mt-1 text-[color:var(--paper-ink-2)] " + (small ? "text-[0.95rem]" : "text-[1.05rem]")
        }
      >
        {meta}
      </p>
    </>
  );
}

/**
 * An entry's description, in two columns once there is enough of it: two
 * columns land at ~51 characters (inside 45–75), where one full-measure
 * column runs to 107. Paragraphs break across the boundary with a rule drawn
 * between them — holding them whole leaves a hole under the left column.
 * lg+ only, and only for three paragraphs or more: one paragraph split down
 * the middle reads as a mistake.
 */
function Prose({ paras }: { paras: string[] }) {
  return (
    <div
      className={
        "mt-5 text-[0.99rem]" +
        (paras.length >= 3
          ? " lg:columns-2 lg:gap-10 lg:[column-rule:1px_solid_rgba(58,46,29,0.16)] lg:[orphans:2] lg:[widows:2]"
          : " max-w-[68ch]")
      }
    >
      {paras.map((p, i) => (
        <p key={i} className="mb-3.5 leading-relaxed last:mb-0">
          {p}
        </p>
      ))}
    </div>
  );
}

/**
 * A two-up ruled grid for short entries. The rule over every row is what
 * separates a short entry from a tall neighbour — the gutter alone leaves
 * unbounded white.
 */
function Rows({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 sm:gap-x-14">{children}</div>;
}

/**
 * One cell of that grid. The rule is dropped where the run's own hairline is
 * already sitting directly above it: the first cell always, and the second as
 * well once the grid is two columns wide.
 */
function Cell({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <Reveal
      delay={index * 0.03}
      className="border-t border-[rgba(58,46,29,0.18)] py-6 first:border-t-0 sm:[&:nth-child(2)]:border-t-0"
    >
      {children}
    </Reveal>
  );
}

/** The divider inside a meta line. Thin, and never the weight of the ink. */
function Sep() {
  return <span className="mx-2 text-[rgba(58,46,29,0.38)]">·</span>;
}

/** One run of entries on the sheet, headed by a label and a hairline. */
function Run({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-20">
      <h4 className="font-mono text-[0.78rem] tracking-[0.26em] text-[color:var(--paper-ink)] uppercase">
        {label}
      </h4>
      {/* Heavier than the rules inside the run, so the run reads as the level
          above its entries rather than as another one of them. */}
      <span aria-hidden className="mt-3.5 block h-[2px] bg-[rgba(58,46,29,0.5)]" />
      {/* Wrapped so the entries are siblings of each other rather than of the
          hairline: without it `first:` matches nothing, and the first entry
          draws its own rule directly under the run's. */}
      <div>{children}</div>
    </section>
  );
}
