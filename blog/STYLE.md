# Blog Style Guide

The personality and rule book for `blog.nordbye.it`. Read this before drafting a new post or proposing edits to an existing one. Examples below are pulled from posts that already shipped.

## Voice

The blog has a voice. Keep it.

- **Pragmatic, opinionated, dry.** State the position, then back it up. "If you're on Cilium already, write CiliumNetworkPolicy." Not "you could consider Cilium."
- **Second person, conversational.** Address the reader directly. "You will spend the first hour figuring out your pod CIDR." Not "users will spend…"
- **Short paragraphs.** One to three sentences. White space is part of the layout.
- **Self-deprecating, never smug.** "You know what 2026 was really missing? Another tech blog." "I'm not your boss." Make the joke at the author's expense, never at the reader's.
- **Specific over abstract.** "~40MB image, builds in under a second" beats "the image is small and fast."
- **Earned authority.** Write as someone who hit the wall and figured it out. "I caught myself writing a bunch of cross-namespace allows for callers that were, in fact, going out the public ingress and right back in." Not "one might encounter…"
- **No hedging.** Cut "I think," "maybe," "perhaps," "it could be argued." If a claim needs a qualifier, name the specific trade-off instead.
- **Lean.** Cut a sentence if removing it doesn't change the meaning. Revisions add prose by default. The version that ships should be tighter than the one you drafted. After every editing pass, re-read each paragraph and ask "what is this for?" If you can't answer in five words, the paragraph (or its weakest sentence) goes. Watch especially for additions made to fix nits during review; those are the ones that puff a post into bloat.
- **Don't claim postures you don't hold.** If you don't go to conferences, don't write "the buzzword CNI of the last two conference seasons." If you haven't run a 500-node cluster, don't frame an example as routine at that scale. The reader can smell a borrowed posture from one paragraph in.

### Norwegian English, not American English

The author is Norwegian. The blog should read like a fluent Norwegian wrote it, not like an American tech blog dressed up in technical content. Concretely:

- **Cut hype tokens.** "I'm serious," "trust me," "literally," "absolutely," "this is huge," "game-changer," "next-level." Make the claim and move on.
- **No Americanisms.** "Saves your bacon," "moves the needle," "low-key," "10x," "wild goose chase," "rocket science," "in the weeds," "get paged" (use "get called"). If you'd hear it on a SaaS podcast, replace it with the plain version.
- **No aviation, military, or sports metaphors as section labels.** "Pre-Flight Check," "Mission Control," "Battle Plan," "Game Plan," "Pulling the Trigger," "Home Stretch." They cheapen the section. Name the section after what it actually does ("Start With Hubble," "Verify the Rollout").
- **No clickbait connectors.** "Here's the wild part," "And the kicker?", "Spoiler alert," "But wait, there's more." Let the next sentence carry itself.
- **Allow observations to sit.** Not every section needs a punchline. A clean technical paragraph that ends on the fact, not on a quip, is fine.
- **Understatement over emphasis.** "It works fine" can mean "I like it." "It took three days" beats "It took forever." Specific numbers beat intensifiers; "47 AUDIT events" beats "tons of AUDIT events."
- **Plain English over technical jargon when both work.** If you wouldn't say "hairpin routing" out loud in conversation, don't lead a section with it. Inside the body, define the jargon the first time ("the packet gets pulled back into the cluster before it leaves the node"). Section titles especially. Name them after what the section IS, not after the term of art the section is teaching.
- **Contractions are fine.** This isn't translation English; it's fluent English written by someone who happens to be Norwegian. "It's" and "you're" stay. "Cannot" and "is not" sometimes land better than "can't" / "isn't". Go with whichever reads cleaner.

What to avoid:

- AI tells: "delve," "tapestry," "navigate the complexities," "in today's fast-paced world."
- **Em-dashes (`—`)**. The single most reliable AI tell. Use a period, a comma, parentheses, or a colon instead, depending on the job the dash was doing. The plain hyphen (`-`) is fine in compound words ("kube-proxy"); the em-dash is not fine anywhere in prose. This rule also applies to comments inside code snippets, and to this style guide itself.
- **Colons used to expand on a prose claim.** "The blog was mine: one pod, one allowed source, nobody cries if it goes down." "ArgoCD is a clean example: it has to pull manifests from GitHub." That construction reads declarative and formal. Use a period and let the next sentence carry the expansion. Colons stay legitimate for introducing a *list*, a *code block*, or a *formal definition*; not for tacking on a clarifying clause.
- Hype tokens and Americanisms (see the Norwegian English subsection above).
- Bullet lists where a sentence would do.
- "It's important to note that…" Just note it.
- Emoji in body text. The one exception is the GitHub ⭐ ask in the standard intro aside.

## Audience

Every post should land for all three of these readers at the same time. If a paragraph is pitched at only one of them, rewrite it.

- **Consultants and platform architects** working at customers. They need patterns that translate to production, the trade-offs they'll have to defend in a design review, and the failure modes they can name when stakeholders push back. Bias toward the *why* and the consequences.
- **In-house IT engineers running prod clusters.** They need actionable steps they can take next Tuesday. Concrete configs, a rollout procedure, the observability beat to watch while they do it. Bias toward the *how* and the verification steps.
- **Homelabbers.** They need to see the same patterns at a scale they can replicate on three Lenovo ThinkCentres in a garage. Bias toward "here's the actual file in my repo, copy what you like."

What this looks like in practice:

- Anchor abstract claims with a concrete example **from this Homelab repo**. Consultants and prod IT will recognise the pattern; homelabbers can clone and run it. The repo is the bridge between the three audiences.
- "Whether your cluster runs four pods or four hundred" is the canonical inclusive framing. Use it (or variants) when introducing a rollout.
- When you mention a production-only concern (compliance, multi-tenancy, formal audit), name it briefly and move on. Don't lose the homelabber in regulatory weeds.
- When you mention a homelab-only concern (cost, single-node, weekend tinkering), frame it with the production angle ("the same trick works at scale because…").
- Avoid "in an enterprise environment" / "in a real production cluster" framings that imply the homelab doesn't count. The patterns are the same; the stakes differ.

## Narrative arc

Every technical post hits these four beats, in this order. Posts that skip (2) or (4) become docs; the value is in all four.

1. **The issue.** State what is wrong right now, concretely and uncomfortably. Open the cilium post: *"Anything in `default` can open a TCP connection to anything in any other namespace."* No throat-clearing, no history lesson, no "let me start by defining…". Name the problem in the first three paragraphs.
2. **Why it matters.** The blast radius, the 3am call, the auditor's question, the "it works until it doesn't" moment. The reader has to feel the pain before they'll do the work. *"What changes is the size of the explosion when something goes sideways, and who gets called at 3am."*
3. **The fix.** The actual remedy. Real configs from the repo, walked through per the "Code blocks" rules. This is the longest section and usually the easiest to write. Don't let it eat the post.
4. **The pitfalls you hit.** Anti-patterns and gotchas you actually ran into. "I caught myself doing X." Written from scars, not from theory. This is the section that turns a how-to into a guide and is what separates the post from upstream docs. Two formats work: a dedicated "Common Mistakes to Avoid" section, or a named pitfall section folded into the body (e.g. "Internal DNS vs Public Hostname" in the cilium post). Cilium uses both.

A post can interleave (3) and (4): fix, pitfall it teaches, fix, pitfall, fix. What does not work is shipping (1) + (3) and calling it done.

## Structure of a post

Every post follows the same shape. Variations are fine but you should know which beat you're skipping and why.

1. **Frontmatter** (see below).
2. **H1 that mirrors the title** verbatim.
3. **Logo image** (raw `<img>` tag, `width:30%`). Used when the post is about a specific tool. Skip for general posts.
4. **Hook paragraph.** State the uncomfortable truth, the problem, or the reader's pain in one to three sentences. No throat-clearing.
5. **The Homelab aside.** Italicized, links to the repo. Two short sentences, tops. Established variants:
   - "_If you want to see how I did it, feel free to look at [my Homelab repo](https://github.com/mortennordbye/Homelab)._"
   - "_If you find this useful or just appreciate the over-engineering, drop a ⭐ on the [Homelab repo](https://github.com/mortennordbye/Homelab)._"
6. **Body.** H2 for major sections, H3 only when nesting is actually needed. No H4+.
7. **Closer.** One of: "Final Thoughts," "Summary," "What's Next?". Ends with a one-line kicker (see "Closers" below).

The intro (hook + aside + why-it-matters) should land in four paragraphs or fewer. Five or more means the post is throat-clearing before the body starts. Trim.

## Frontmatter

```yaml
---
title: "Punchy Title: Optional Subtitle"
date: YYYY-MM-DD
draft: false
tags: ["topic", "topic", "skill-level"]
authors:
  - name: Morten Victor Nordbye
---
```

Rules:

- **Title** uses sentence-style capitalization with a colon for the subtitle. Keep the verb active ("Locking Down," "Surviving," "Rolling Out"). Avoid "A Guide To" or "Understanding X."
- **Date** is the publish date, ISO format, no quotes.
- **Tags** always include a skill-level (`beginner`, `intermediate`, `advanced`) plus topical tags. Lowercase, kebab-case.
- **Authors** is the only author. Don't add co-authors.

## Code blocks

- Always tag the language: ```` ```yaml ````, ```` ```bash ````, ```` ```dockerfile ````, ```` ```nginx ````. Never untagged.
- Show **real configs from the cluster**, never invented examples. If you're tempted to invent, find the matching file in `k8s/talos/` or `blog/` and quote it.
- **Anchor the running example on the blog itself where possible.** The reader is already on the page; the policy that lets them load it is the most concrete example you have. "Reload this post and the request shows up here" lands harder than any generic `webapp` placeholder. Use generic names only for patterns the blog cannot demonstrate (e.g. multi-tier with a database).
- **Match cluster state to your claims.** If the cluster has `policyAuditMode: true`, don't write "anything else gets dropped" as a present-tense fact. The policy is in dry-run and nothing drops. State it as "would be dropped once enforcement flips on," or flip enforcement before publishing. The blog should be honest about what's running, not what *will* run.
- Above each significant block, link to the canonical source file:
  - ``**Full file:** [`blog/Dockerfile`](https://github.com/mortennordbye/Homelab/blob/main/blog/Dockerfile)``
- **Highlight the lines that matter.** A code block dropped on the page without any signal of *where to look* makes the reader scan all of it. Two complementary tools:
  - **Inline comments inside the snippet** for short, in-context notes. Use the file's native comment syntax (`#` for YAML/bash/dockerfile, `//` for JS, `--` for SQL). Reserve them for the lines that earn the call-out: surprises, gotchas, lines that change per environment, lines that look identical to a wrong version. Don't paraphrase what the line already says. Examples that work:
    ```yaml
    image: ghcr.io/mortennordbye/homelab/blog:2694c9b  # Updated by GitHub Actions
    paths:
      - "blog/**"  # Only run if I actually touch the blog source
    sectionName: websecure-cert-a  # <--- Explicitly picks the listener with Cert A
    ```
  - **A walkthrough below the block** for anything that needs more than half a line. Two layouts work, pick by how mechanical the field list is:
    - **Field-as-mini-heading.** Bold-only field name on its own line, blank line, then the prose paragraph. Cleanest for YAML walkthroughs with 4+ fields, because each field gets visual separation without dense double-emphasis inline:
      ```
      **endpointSelector**

      Picks which pods the policy applies to. ...
      ```
    - **Field-inline.** Field name integrated into the sentence flow, no leading bold. Works when there are only 1-2 fields or the prose is conversational enough that headings would feel mechanical. Don't lead every paragraph with a bold code-pill; that turns the page into a column of black chunks.
  - **Don't double-emphasize.** A field name wrapped in backticks (`endpointSelector`) is already visually distinct. Wrapping it in **bold** *as well* (**`endpointSelector`**) turns each paragraph into a chunky code-pill at the start and over-decorates the page. Pick one form per element: backticks for machine-readable identifiers (Cilium spec fields, exact label strings, file paths), bold for sparingly-used English emphasis. Never both on the same token.
  - **Use code formatting sparingly.** Don't put backticks around namespace names that read fine as English (`blog` namespace → blog namespace), conceptual phrases (`default-deny` → default-deny), or numbers in prose (`port 80` → port 80). Reserve backticks for things a reader might literally need to grep for or type into a manifest. The walkthrough should read like a sentence with a few highlighted terms, not a heatmap of black pills.
- Pick one or the other per line, not both. An inline comment AND a paragraph for the same line is noise.
- If a snippet has nothing worth highlighting, it probably shouldn't be in the post.
- Don't show 300-line manifests in full. Trim to the part that matters and link to the rest.

## Images

- **`featured.png`** is the card and social-preview art for the post. One per post, lives at `blog/content/blog/<slug>/featured.png`. Square-ish or landscape, recognisable at thumbnail size. The post's hero/logo image, not an inline screenshot.
- **Inline screenshots and diagrams** live in `blog/static/images/<name>.<ext>` and are referenced from posts via `/images/<name>.<ext>`. They are cluster artifacts (a Hubble screenshot, an architecture diagram, a UI capture), not card art.
- Don't mix the two. Putting an inline screenshot in the post's own directory and calling it `featured.png` is the wrong place; it ends up rendered as the card image and is missing from where the post tries to inline-reference it. Check both ends.
- Inline logos and diagrams use a raw `<img>` tag with a `style` attribute, **not** markdown image syntax. Hugo's default markdown image doesn't size them:
  ```html
  <img src="/images/cilium-logo.svg" alt="Cilium" title="Cilium" style="width:30%;" />
  ```
- Screenshots from the cluster: `width:100%`. Logos: `width:30%`. Architecture diagrams: `width:70%`.
- Always include `alt` and `title`.

## Linking

- **First mention** of an external tool links to its docs: `[Hubble](https://docs.cilium.io/en/stable/observability/hubble/)`.
- **Repo references** use the full `github.com/mortennordbye/Homelab/blob/main/...` URL with a backtick path as the link text.
- **Upstream PRs and issues** are welcome; they signal you're plugged into the project, not just consuming it.
- Don't bury the Homelab repo link. It should appear at least twice: once in the intro aside, once in "Final Thoughts" or "Resources."

## Closers

The kicker is the last line. It earns the bottom of the page.

Good ones already in use:

- "Now go open the Hubble tab."
- "Go judge my code, steal the workflows, and build something ridiculous."
- "Just watch out for those sticky sessions!"
- "Default-flat is a Kubernetes convention. It is not a Kubernetes requirement. Lock yours down."

Patterns that work: imperative call to action; throwaway joke that lands; one-sentence restatement of the post's thesis. Avoid generic "thanks for reading" or "let me know in the comments."

## Length

- **Quick-start / tutorial:** 200–300 lines of source markdown.
- **Deep guide:** 300–400 lines.
- If you're past 400, you have two posts, not one.

## Sections that earn their keep

Patterns that have shown up in multiple posts and should be reused when relevant:

- **Observability before action.** Tell readers what to watch *before* they touch anything. Section heading should be direct (e.g. "Start With Hubble"), not metaphorical ("Pre-Flight Check," "Mission Control," etc. are out).
- **A named gotcha section** when one specific failure mode deserves its own callout. Name it after the phenomenon itself or the contrast that triggers it ("Internal DNS vs Public Hostname," "TLS Certificate Routing"). Not after drama ("The X Trap," "The Y Panic," "The Z Disaster"). The reader figures out it bites once they read the section; the heading does not need to telegraph it.
- **Don't pre-flag the gotcha in the section opener.** Lines like "Here's the trap nobody warns you about" or "You might think X works, but…" telegraph the lesson and read like clickbait. Open with the example; let the reader discover the gotcha as it unfolds.
- **"Common Mistakes to Avoid".** Bulleted list of "I have made every one of these. So have you, probably." Three to five entries, each one a real scar with a one-paragraph explanation.
- **"What's Next?"** Three to four follow-up topics with one paragraph each. Doubles as a teaser for future posts. Reserved for things the *reader* (or you) have not done yet. If you've actually deployed a thing in the cluster, it's a body section with a worked example, not a "What's Next?" item.
- **Worked example, not future work.** When a policy or config is running in the cluster right now, present it as a body section with present-tense narration ("I rolled this out under audit mode, the stream is what I'm watching now"). Don't shove deployed work into "What's Next?". That section is for what comes after.
- **Rules of thumb as blockquotes:** `> **The Golden Rule.** ...`. Pull the one-liner the reader will tattoo on their forearm into a `>` callout. Use sparingly; one or two per post.

## What stays off the blog

Per `feedback_blog_linkedin_safe.md`:

- **No plex/arr/torrent/gluetun examples.** This blog is LinkedIn-visible. Use portfolio, blog, homepage, workout, it-tools, headroom, audiobookshelf, home-assistant, or generic placeholder app names (`webapp`, `api`, `dashboard`) for examples.
- **No customer names or work-specific incidents.** Anonymize: "I caught myself," "we hit two specific roadblocks," "a client."
- **No secrets.** Anything from External Secrets Operator is fine to reference by name; never paste decoded values.

## Self-check before publishing

1. Does the title pass the "would I click this from a LinkedIn feed?" test?
2. Does the post hit all four narrative beats: issue → why it matters → fix → pitfalls you hit?
3. Does every section land for all three audiences (consultant, prod IT engineer, homelabber)? Highlight any paragraph that's pitched at only one of them and rewrite it.
4. Is there at least one specific gotcha, scar, or surprise that you couldn't get from upstream docs?
5. Is every code block real, traceable to a file in this repo, language-tagged, and signalling *where to look* via inline comments or a labelled walkthrough?
6. Are post claims consistent with current cluster state? If `policyAuditMode: true`, no present-tense "anything else gets dropped" claims. Flip the mode before publishing, or hedge the claim.
7. Is the closer worth the last line of the page?
8. Have you used the word "delve"? Delete it.
9. Read it out loud. Anything that sounds like a SaaS podcast or an American tech-bro keynote? Trim it. (See "Norwegian English" under Voice.)
10. Any jargon a non-network-person would not recognise? Either replace with plain English or define it in-line the first time.
11. After all the revisions, is the draft *tighter* than the version before the last review pass, or longer? It should be tighter. If it grew, run "Lean" again.
12. Did you check the LinkedIn-safe constraint above?
13. Does `featured.png` exist and is it the card art (not an inline screenshot misplaced)? Does every inline `<img src="/images/...">` resolve to an actual file under `blog/static/images/`?

## When in doubt

`cilium-network-policy-rollout/index.md` is the canonical reference as of 2026-05-18. It has been through multiple polish passes against every rule in this guide. Pull a draft back toward it when the tone drifts. New rules added after that date may not be reflected yet; check Open refinements for the current in-flight draft.

## Continuous improvement

This guide is a living document. It gets better the same way a codebase does. You catch what's wrong, fix it once, and write down the lesson so the next post doesn't repeat the mistake.

The loop:

1. **Read a post.** Either an existing one or a fresh draft.
2. **Note what doesn't feel right.** Tone too flat, intro too long, a section that drags, a phrase that sounds like every other tech blog, a gotcha that wasn't explained. Whatever it is, name it specifically. "The multi-tier section reads like documentation, not like a story" is useful; "I don't love it" is not.
3. **Decide whether it's a one-off or a rule.** If only that one paragraph is wrong, edit the post. If you'd say the same thing about three different posts, it's a rule. Add or update the relevant section in this file.
4. **If a rule changed, sweep the in-flight draft.** Posts that are already published stay put. Don't go back in time and rewrite them just because a rule got refined. But the *current draft* (the one that's not yet shipped) inherits new rules immediately. Apply the rule to it in the same session as the rule was added. The "Open refinements" list tracks which post is currently in-flight.
5. **If a rule changed, re-check the canonical example.** The post pinned in "When in doubt" should drift toward the rules, not away from them. Update it (or replace it) when the gap gets uncomfortable.

Concrete things to capture when feedback comes in:

- **A phrase or word to ban.** Add it to the "What to avoid" list under "Voice."
- **A structural beat that's missing across posts.** Add it to "Structure of a post" or "Sections that earn their keep."
- **A formatting habit that doesn't scan.** Add it to "Code blocks" or "Images."
- **A specific tone failure** (too smug, too soft, hedges too much). Add a concrete example of the failure and the fix.

### Open refinements

Open items the author wants worked through over time. Delete entries from this list as they get resolved and promoted into the rules above. New posts inherit these refinements as soon as they're written down here, even before they're promoted.

- **Current in-flight draft:** `cilium-network-policy-rollout` (not yet published as of 2026-05-18). Any new STYLE.md rule added before publication should be applied to this post in the same session.
- _2026-05-18:_ Audit the remaining four posts (`i-have-a-blog`, `kubernetes-quick-start`, `surviving-nginx-eol`, `installing-argocd`) against the "highlight the lines that matter" rule under "Code blocks." Cilium was swept. The other four are pending.
- _2026-05-18:_ Audit the same four posts against the new "Audience" and "Narrative arc" sections. Cilium was swept; quick-start posts in particular skew homelab/beginner and may want a sentence each for prod IT and consultants.
- _2026-05-18:_ Session learnings absorbed into the rules above. Notable additions:
  - "Norwegian English" subsection (cut hype, no Americanisms, plain English over jargon, no aviation/sports metaphors, no "X Trap / Y Panic" naming).
  - "Lean" rule (cut filler, watch review-puff).
  - "Don't claim postures you don't hold" (no conference-poser framings).
  - "Match cluster state to your claims" (audit-mode honesty).
  - "Don't pre-flag the gotcha in the opener" (no "trap nobody warns you about" telegraphs).
  - "Worked example, not future work" (deployed = body section, not What's Next).
  - "Field-as-mini-heading" layout for YAML walkthroughs with 4+ fields.
  - "Don't double-emphasize" (bold OR backticks, never both).
  - "Use code formatting sparingly" (don't backtick generic English words).
  - "Anchor the running example on the blog itself."
  - Featured vs inline image organization.
  - Em-dash ban extended to STYLE.md itself; this file was swept on 2026-05-18.
- _(Add new feedback entries below, dated, with the post they came from and what specifically didn't work.)_
