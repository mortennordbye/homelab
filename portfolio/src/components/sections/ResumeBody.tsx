import { Reveal } from "@/components/primitives/Reveal";
import { certs, education, experience, summary } from "@/content/resume";
import { site } from "@/content/site";

/**
 * The resume, as a sheet of paper.
 *
 * Converted from the two-column card layout under branding/DECISIONS.md §12:
 * everything is either an object or a document, and this is the most
 * document-shaped thing on the site. It was the one place where a long read
 * sat at 17px on the near-black ground, which is what every dark portfolio
 * gets wrong, and the fix was already in the record — paper is the fourth
 * material and it had no screen surface until now.
 *
 * Reading happens here, with no click. The object on the desk above is how
 * you take the PDF away, which is the split §4 spent four rejected prototypes
 * arriving at.
 *
 * The page is set as a broadsheet, and every part of that is load-bearing
 * rather than styling:
 *
 * Every word of every role is on the sheet. The height that costs is paid for
 * with width instead of with cuts, which is the reason a newspaper has columns
 * at all. Six roles at full prose in one column ran to 8,600px.
 *
 * Everything is flush left off one edge. An earlier pass put the dates in a
 * margin and the prose across the full width, so each role's title started two
 * hundred pixels to the right of its own first line. A margin and a
 * full-measure column cannot both be right, and the columns are what the
 * length needs, so the dates became an overline.
 *
 * Education and certifications run two-up rather than as full rows. They are
 * short entries, and a short entry given the full width of the sheet is
 * mostly empty paper.
 */
/**
 * How many roles stand above the fold.
 *
 * Two, because that is the current engagement and the one before it, which is
 * what anyone reading a CV looks at first and often only. The rest is one
 * press away rather than cut: the whole record is still in the DOM, so a
 * crawler and a screen reader read all of it either way.
 */
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

      <Run label="Experience">{roles(0, ABOVE_THE_FOLD)}</Run>

      {/* The fold.
          A <details> rather than a state hook, which is what keeps this file a
          server component: no client JS, keyboard and screen-reader behaviour
          for free, the hidden text still in the DOM for crawlers, and Chrome's
          find-in-page opens it on a hit. */}
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
            {experience.length - ABOVE_THE_FOLD} more roles · education · certifications
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

        <Run label="Licenses and certifications">
          <Rows>
            {certs.map((c, i) => (
              <Cell key={c.title} index={i}>
                <EntryHead title={c.title} meta={c.issuer} when={c.date} small />
                {(c.credentialId || c.href) && (
                  <p className="mt-2.5 font-mono text-[0.64rem] tracking-[0.08em] text-[color:var(--paper-ink-3)]">
                    {c.credentialId && <span className="break-all">{c.credentialId}</span>}
                    {c.credentialId && c.href && <Sep />}
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
              </Cell>
            ))}
          </Rows>
        </Run>

        {/* The sheet states its own provenance, the way FooterStamp does for the
            page. Every value here is measured rather than typed. */}
        <p className="mt-16 flex flex-wrap justify-between gap-x-8 gap-y-2 border-t border-[rgba(58,46,29,0.22)] pt-5 font-mono text-[0.64rem] tracking-[0.08em] text-[color:var(--paper-ink-3)]">
          <span>
            {site.firstName} {site.lastName} · {site.location}
          </span>
          <span>
            {experience.length} roles · {certs.length} certifications
          </span>
        </p>
      </details>
    </article>
  );
}

/**
 * The masthead. Name and role left, the ways to reach him right.
 *
 * The right column is not filler. With the name alone the top of the sheet was
 * a headline over five hundred pixels of empty paper, which is what a masthead
 * on a real document never is, and the contact block is the thing that
 * belongs there on every CV ever set.
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
 * The head of an entry: what it is, when it was, and who it was with.
 *
 * On a dark ground the old layout could hand the hierarchy to colour — the
 * company was green, the period was a grey eyebrow, the role was a heading.
 * Paper has one hue, so the whole job falls to size, weight, case and
 * position, and the first pass did not spend enough of any of them: role,
 * company and body were all regular serif within half a step of each other.
 *
 * Three registers now, and no two of them are the same kind of type:
 *
 *   the title   large serif at 600, the only heavy thing in the entry
 *   the date    mono, small, pushed to the right edge on its own baseline
 *   the meta    serif at body size in the second ink, directly under the title
 *
 * The date moves to the right of the title rather than sitting above it. It is
 * the field a reader scans a CV by, it belongs on the same line as the thing
 * it dates, and putting it there also stops the entry opening with two quiet
 * lines before anything with weight in it.
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
 * An entry's description, set in two columns once there is enough of it.
 *
 * The arithmetic behind the numbers: the sheet is 60rem with 3.5rem of padding
 * a side, so the measure runs 848px, and two columns with a 2.5rem gutter land
 * at about 404px each. At the body size that is roughly 51 characters, inside
 * the classic 45-to-75 range. Widening the single column instead would have
 * run to 107 characters, so the extra width had to become a second column
 * rather than a longer line.
 *
 * The rule between them is doing work rather than decorating. Holding whole
 * paragraphs across the break left the left column ending half way down with a
 * hole under it, because a seven-line paragraph will not fit in what is left.
 * Letting them break and drawing the boundary is what a newspaper does, and it
 * is the only version where both columns fill.
 *
 * Two columns from lg only, and only for three paragraphs or more: one
 * paragraph split down the middle reads as a mistake.
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
 * A two-up ruled grid, for the runs whose entries are short.
 *
 * The gutter alone was not enough separation. With rows sizing to the tallest
 * cell, a short entry beside a long one left a field of white with no boundary
 * in it, and reading down a column you could not tell where one certificate
 * ended and the next began. A rule over every row is how a printed directory
 * has always solved this, and it costs one line.
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
