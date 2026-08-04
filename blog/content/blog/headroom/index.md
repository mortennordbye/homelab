---
title: "School Taught You Prøysen, Not Trinnskatt: Headroom Does That Maths"
description: "A self-hosted finance tracker built for Norwegian rules: trinnskatt, feriepenger, BSU, folketrygd, wealth tax and mortgage deduction. One container, live demo."
date: 2026-08-04
draft: false
tags: ["self-hosted", "docker", "personal-finance", "privacy", "cilium", "kubernetes", "intermediate"]
---

# School Taught You Prøysen, Not Trinnskatt: Headroom Does That Maths

<img src="/images/headroom-logo.svg" alt="Headroom" title="Headroom" style="width:15%;" />

Norwegian school gave you Alf Prøysen. Musevisa every December, Teskjekjerringa in the reading book, and enough of the melody left to still sing it thirty years later.

It did not give you a tax return, a fund, or the sentence you need in a salary review.

The apps that offer to fix that want your bank login, a monthly fee, and a copy of your whole financial picture on someone else's server. So I built one that runs on your machine instead.

_Drop a ⭐ on [headroom](https://github.com/mortennordbye/headroom) if it is useful. The manifests that run it live in my [Homelab repo](https://github.com/mortennordbye/Homelab)._

{{< github repo="mortennordbye/headroom" >}}

**Click through everything at [headroom.nordbye.it](https://headroom.nordbye.it).** Fictional numbers, no signup, and your edits stay in your own tab.

## Built for Norwegian Money

One container, a SQLite file you own, no account. That part is ordinary. The maths is not.

| The rule | What Headroom does with it |
| --- | --- |
| Trinnskatt, personfradrag, trygdeavgift | Your real marginal rate on the next krone |
| Feriepenger at 12% | Earned this year, paid out next year |
| Arbeidsgiveravgift at 14.1% | What you actually cost to employ |
| BSU, 27 500 a year and 300 000 total | Both allowances tracked, and when you stop qualifying |
| Formuesskatt | Primary home at 25%, funds at 80%, then bunnfradrag |
| Mortgage interest | 22% back, so the effective rate beats the nominal one |
| Folketrygd at 18.1% up to 7.1 G | Divided by your cohort's delingstall, garantipensjon as floor |

Each of those is a tested function in [`src/lib/`](https://github.com/mortennordbye/headroom/tree/main/src/lib), not a number typed into a page.

There is an English toggle, a currency setting and a generic region. Here is what generic actually means:

```ts
if (region === 'no') return calcNorwegianTax(/* brackets, personfradrag, trygdeavgift */);
const rate = Math.min(100, Math.max(0, customRatePct)) / 100;  // <--- one flat rate you type in
```

One flat rate. Usable outside Norway, but the pension, holiday pay and property models stay Norwegian whatever you set. This was built for Norwegian money.

## Why It Is a Container and Not a Subscription

The obvious version of this is a SaaS. Sign up, connect your bank, 79 kroner a month.

I do not want to hold your banking data. A PSD2 transaction feed comes with obligations, and a database of a few thousand people's spending is a target that has to be defended correctly every day for years. I cannot lose data I never had.

And the useful parts are arithmetic. Your marginal rate, the inflation floor, what your mortgage payment is made of. Putting a subscription in front of that mostly means the people who need it never see it.

## The Dashboard

Total equity after tax and after all debt, which is the pessimistic number rather than the friendly one.

<img src="/images/headroom-oversikt.webp" alt="Headroom dashboard showing 1 362 739 kr total equity after tax and debt, remaining monthly budget, daily spending pace and asset allocation" title="Total equity, after tax and after debt" style="width:100%;" />

Student loan is split out from other debt, because it is a different animal. Below that, what you can spend today against the ideal pace, where the month's money went, and a fifteen year projection.

<img src="/images/headroom-fordeling.webp" alt="Headroom dashboard lower half showing budget distribution, wealth allocation across six assets, monthly investment, top categories and a twelve month cash flow chart" title="Budget split, asset allocation and cash flow" style="width:100%;" />

## The Raise That Is Actually a Pay Cut

If you open one page in the demo, open this one.

A raise below inflation is not a raise. It is a pay cut delivered as good news, and it works because nobody does the subtraction in the room.

<img src="/images/headroom-forhandling.webp" alt="Headroom salary negotiation view with a 744 000 kr base, a 748 368 kr inflation floor and a gradient bar from lose purchasing power to real raise" title="The inflation floor" style="width:100%;" />

Your salary was set in February at 744 000. SSB says prices moved 0.6% since. The offer has to clear **748 368** before you have gained anything.

Type the offer in and the bar tells you which of three things you just accepted. That is the whole feature, and it is the one I would keep if I deleted every other page.

## Where the Salary Goes

<img src="/images/headroom-pengestrom.webp" alt="Headroom salary page showing a cash flow diagram from gross to tax, fixed expenses, free spending and savings, a 43 percent marginal rate, and withheld versus expected tax" title="Gross to net, and an early restskatt warning" style="width:100%;" />

Gross, tax, fixed costs, what is actually free. Marginal rate on the next krone in the corner, which is what an extra shift is really worth.

Underneath, tax withheld so far this year against what this year should be taxed. Rough on purpose, but it is the difference between hearing about restskatt now and hearing about it from Skatteetaten.

## The Month

<img src="/images/headroom-budsjett.webp" alt="Headroom budget page for August 2026 with monthly income, budget per month and per day, fixed expenses, an imported payslip and the spend and invest split" title="One month at a time" style="width:100%;" />

Income is typed or imported from a payslip PDF. The parser runs in your browser and never uploads the file.

Then it works out what you can spend _today_, not this month. Fixed costs off, savings target off, remainder divided by days left.

<img src="/images/headroom-utgifter.webp" alt="Headroom fixed expenses panel warning about double counting, offering to promote four detected recurring payments, and a chart of where the fixed money goes" title="It notices the subscription you forgot" style="width:100%;" />

Two things here earn their place. It spots a fixed expense and a matching transaction and offers to link them, so a bill is not counted twice. And it finds repeated payments and offers to promote them, which is how the forgotten subscription surfaces.

## What You Are Worth After Tax

A portfolio of 285 000 with 62 000 of gain is not worth 285 000. Sell it and 37.84% of the gain goes to tax.

<img src="/images/headroom-formue.webp" alt="Headroom wealth page showing latent tax deducted from an investment portfolio, home equity, pension balances, BSU allowances and crypto" title="Latent tax, deducted" style="width:100%;" />

So the app deducts the latent tax and shows the net position. Unpopular way to display a portfolio. Correct one.

The rest is the balance sheet: property against mortgage, OTP and IPS held separately because they are locked, savings and buffer accounts, and credit frames counted at their full limit the way a bank counts them.

## One Home, One Loan

<img src="/images/headroom-bolig.webp" alt="Headroom mortgage page showing 1 250 000 kr equity, 4 200 000 kr value, 2 950 000 kr debt and 70.24 percent loan to value" title="The mortgage page" style="width:100%;" />

The monthly payment is 18 166 kr. Of that, **13 521 is interest and 4 595 is repayment**. Seeing that written down is educational in a way your bank's app avoids being.

Belåningsgrad falls from both ends at once, as you pay down and the property drifts up:

{{< chart alt="Loan to value falling from 70 percent in 2026 to zero in 2051" ratio="16/6" caption="Read straight out of the app's own projection." >}}
{
  "type": "line",
  "data": {
    "labels": ["2026","2027","2028","2029","2030","2031","2032","2033","2034","2035","2036","2037","2038","2039","2040","2041","2042","2043","2044","2045","2046","2047","2048","2049","2050","2051"],
    "datasets": [
      {
        "label": "Belåningsgrad (%)",
        "data": [70.2,66.9,63.6,60.4,57.2,54.1,51.0,48.0,45.1,42.1,39.3,36.5,33.7,30.9,28.2,25.5,22.9,20.2,17.6,15.1,12.5,10.0,7.5,5.0,2.5,0],
        "fill": true,
        "tension": 0.2,
        "pointRadius": 0
      }
    ]
  },
  "options": {
    "plugins": { "legend": { "display": false } },
    "scales": { "y": { "suggestedMax": 75 } }
  }
}
{{< /chart >}}

<img src="/images/headroom-ssb.webp" alt="Headroom showing an SSB square metre market estimate, housing history, mortgage tax relief and a comparison of your rate against the Norges Bank policy rate" title="Live public data: SSB square metre prices and the Norges Bank rate" style="width:100%;" />

Three things pull live public data. A market estimate from SSB table 14310, with the number of sales behind it so you can judge it. Your interest rate next to the Norges Bank policy rate, because that spread is your argument at the bank. And the 22% deduction.

Thinking about a second home? It tells you what the bank will say.

<img src="/images/headroom-sekundarbolig.webp" alt="Headroom second home panel calculating real borrowing capacity at five times income, flagging over capacity and insufficient liquid funds" title="Over capacity, and short on cash" style="width:100%;" />

Income times five against all debt, with credit frames at their full limit and the cash you need at completion. In the demo that comes back **over capacity** and **629 046 kr short**. Better to learn that here than in a meeting.

## What You Cost

<img src="/images/headroom-lonnskostnad.webp" alt="Headroom employer cost page building 768 000 kr salary up to 1 115 257 kr total, and calculating a consultant hourly rate" title="Salary 768 000. Cost 1 115 257." style="width:100%;" />

Salary, plus feriepenger, plus employer OTP, then arbeidsgiveravgift on that base, plus a desk and a laptop. A 45.2% uplift on the contract figure.

Then it turns that into a consultant rate: 714,91 kr/t merely covers you, 1 021,30 kr/t hits the margin. That gap is the calculation freelancers get wrong exactly once.

## Pension, Forecast, and the Year

{{< carousel >}}
{{< figure src="pensjon.webp" alt="Headroom pension page combining folketrygd, AFP, OTP and IPS into 57 100 kr net per month" >}}
{{< figure src="prognose.webp" alt="Headroom forecast comparing paying down the mortgage against investing, with a net worth projection and uncertainty band" >}}
{{< figure src="ar.webp" alt="Headroom year summary with income, tax paid, savings rate and a month by month table" >}}
{{< figure src="lonn.webp" alt="Headroom salary page with total annual salary, growth against CPI and effective hourly wage" >}}
{{< /carousel >}}

Pension combines folketrygd, AFP, OTP and IPS into one number: what lands per month after tax, and what share of today's take-home that is.

Forecast is where you argue with your assumptions, with an uncertainty band at plus or minus three points of return, because a single confident line fifteen years out is a lie told with a chart library. It also settles prepay against invest at the effective post-deduction rate.

The year page prints to PDF, which is what people actually want once a year.

## It Works on a Phone

<img src="/images/headroom-mobil.webp" alt="Headroom on a phone showing a two by two grid of monthly figures, an imported payslip card and a bottom tab bar" title="Installable as a PWA" style="width:35%;" />

Full mobile layout, installable as a PWA with its own icon. Behind Tailscale that is a budgeting app on your phone that never leaves your network.

## Where the Transactions Come From

Type them, or connect a bank through [Enable Banking](https://enablebanking.com/). A fetch reaches back about 90 days, but nothing is ever dropped, so your history keeps growing on your own disk.

{{< timeline >}}
{{< timelineItem header="Fetched" subheader="server/bank.js" badge="~90 days" >}}
Anything older is already in your database from an earlier sync.
{{< /timelineItem >}}
{{< timelineItem header="Deduplicated" subheader="src/lib/bankDedup.ts" >}}
The same payment arrives twice, once pending and once booked. This is what stops your grocery bill doubling.
{{< /timelineItem >}}
{{< timelineItem header="Categorised" subheader="src/lib/categorize.ts" >}}
Rules map a merchant to a category. Tune for a month, then stop thinking about it.
{{< /timelineItem >}}
{{< timelineItem header="Labelled" subheader="src/lib/labelRules.ts" >}}
For what a category cannot express, like which of two shared costs was yours.
{{< /timelineItem >}}
{{< timelineItem header="Transfers removed" subheader="src/lib/transferRules.ts" >}}
Money between your own accounts is not spending, and counting it is the fastest way to ruin a budget.
{{< /timelineItem >}}
{{< /timeline >}}

## Your Data Stays Yours

<img src="/images/headroom-eksport.webp" alt="Headroom settings listing all 342 entries included in an export, and one click configuration for Claude, Cursor, Codex and Gemini" title="Export lists exactly what it takes" style="width:100%;" />

One JSON export holds everything, and the screen lists what that means instead of asking you to trust it. Import opens a preview where you pick which sections to restore, and it downloads a safety copy first.

There is also a rotating SQLite snapshot in the volume and a `make backup` to the host.

Same screen wires up an AI assistant. The [MCP server](https://github.com/mortennordbye/headroom/tree/main/mcp) runs locally over stdio, reuses the app's own tested math so the numbers cannot drift, and puts writes through the same guards as the UI.

```bash
make mcp-install
```

## Run It

One command. No clone, no build, no config file.

```bash
docker run -d \
  --name headroom \
  -p 127.0.0.1:8080:3001 \
  -v headroom_data:/data \
  --restart unless-stopped \
  ghcr.io/mortennordbye/headroom:latest
```

Open <http://localhost:8080>. The `127.0.0.1` binds it to loopback so nothing else on your network can reach it, and the volume survives restarts and upgrades.

## There Is No Login

{{< alert type="warning" >}}
Anyone who can reach the port can read and overwrite your entire financial picture. Do not put this on the open internet.
{{< /alert >}}

Two safe shapes. Loopback on a laptop, which is the default. Or a home server reached over WireGuard or Tailscale, which is also what makes the phone work.

Want it in a browser without a tunnel? Put a reverse proxy with authentication in front. There is an optional scrypt-hashed password and an `ALLOWED_HOSTS` guard against DNS rebinding, but treat both as depth, not as the front door.

## How the Public Demo Is Locked Down

Which is an obvious contradiction, since there is an instance of it on the public internet.

`DEMO_MODE=1` refuses every non-GET under `/api/`, refuses the whole `/api/bank/*` namespace (its GETs are not safe reads, one proxies to Enable Banking on the instance's own credentials), fills the client from a browser-generated dataset, and skips the background jobs. Enforced in [`server/demo.js`](https://github.com/mortennordbye/headroom/blob/main/server/demo.js), server-side.

I did not want that to be the only thing between a stranger and a bank API.

**Full file:** [`k8s/talos/apps/headroom-demo/ciliumnetworkpolicy.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/apps/headroom-demo/ciliumnetworkpolicy.yaml)

```yaml
  egress:
    - toEndpoints:                              # DNS, so toFQDNs can resolve
        - matchLabels:
            "k8s:io.kubernetes.pod.namespace": kube-system
            "k8s:k8s-app": kube-dns
      toPorts:
        - ports: [{ port: "53", protocol: ANY }]
    - toFQDNs:
        - matchName: "data.ssb.no"          # <--- inflation, m² prices, wage stats
        - matchName: "data.norges-bank.no"  # <--- the policy rate
      toPorts:
        - ports: [{ port: "443", protocol: TCP }]
```

The important part is what is missing. Writing any egress rule makes egress deny-by-default for this pod, so those two hostnames are the only places it can reach. `api.enablebanking.com` is deliberately absent.

A regression in the demo gate alone cannot reach a bank, because the packet has nowhere to go. Two mechanisms in two systems both have to fail.

## Common Mistakes to Avoid

**Pointing a demo instance at your real volume.** `DEMO_MODE` protects writes. `GET /api/data` still serves your finances to the internet. Separate instance, empty storage.

**Assuming an update failed because nothing changed.** It is a PWA and caches itself. Accept the prompt or hard-reload. The data is fine; it just looks like a broken deploy.

**Setting `runAsUser` on the pod.** The entrypoint starts as root, fixes `/data` ownership, then drops to uid 1000. Starting non-root removes its ability to chown at all. Use `fsGroup`.

**Treating a lagging public series as missing data.** SSB publishes CPI with a lag. Reading that as "no data" hid a working feature for a month. Decide what a normal lag looks like, and keep it off the same code path as a real failure.

## What's Next?

Payslip parsing beyond Visma, which needs one function per provider and a sample PDF. Uncertainty bands on the stacked projection charts, which needs a design decision rather than more code. And turning defaults into explicit choices with a first-run flow.

## Final Thoughts

Plenty of budgeting apps exist. What keeps me on this one is that the understanding is worth more than the features. Knowing your marginal rate changes what an extra shift is worth. Knowing the inflation floor changes what you say in February. Knowing that 13 521 of 18 166 is interest changes how you feel about paying extra.

None of that needs my app. It needs the numbers in front of you often enough that you stop guessing, and it should not cost a subscription to get there.

Headroom does the tax maths. You are still on your own for Musevisa.
