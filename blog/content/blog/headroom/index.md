---
title: "School Taught You Pythagoras, Not Trinnskatt: Headroom Does That Maths"
description: "A self-hosted Norwegian finance tracker: equity after tax, a decade of salary against CPI, what you cost your employer, the month, and a forecast built on both."
date: 2026-08-04
draft: false
tags: ["self-hosted", "docker", "personal-finance", "privacy", "cilium", "kubernetes", "intermediate"]
---

# School Taught You Pythagoras, Not Trinnskatt: Headroom Does That Maths

<img src="/images/headroom-logo.svg" alt="Headroom" title="Headroom" style="width:15%;" />

School taught you Pythagoras. You have not used it since.

It never taught you how to set up a monthly budget, how to make savings grow, or how to tell debt that is working for you from debt that is not. Nothing about what a raise is worth after inflation, or what you cost the company that pays you.

The apps that offer to fix that want your bank login, a monthly fee, and a copy of your whole financial picture on someone else's server. So I built one that runs on your own machine.

Headroom answers four questions and not much else. What is actually mine, after tax and after debt. What can I spend today. Is my salary keeping up. And where does all of this end up in fifteen years.

_Drop a ⭐ on [headroom](https://github.com/mortennordbye/headroom) if it is useful. The manifests that run it live in my [Homelab repo](https://github.com/mortennordbye/Homelab)._

{{< github repo="mortennordbye/headroom" >}}

**[headroom.nordbye.it](https://headroom.nordbye.it) is a showroom, not a service.** Click every page and change every number you like. It runs on invented data, nothing you type is saved, and the server refuses every write. Do not put your real finances into it. To actually use Headroom, [run your own copy](#run-it).

## Why It Is a Container and Not a Subscription

The obvious version of this is a SaaS. Sign up, connect your bank, 79 kroner a month.

I do not want to hold your banking data. A database of a few thousand people's spending is a target that has to be defended correctly every day for years, and I cannot lose data I never had. So it is one container, a database file you own, and no account.

The other reason is that the useful parts are arithmetic. Your marginal rate, the inflation floor, what your mortgage payment is made of. Putting a subscription in front of that mostly means the people who need it never see it.

## Built for Norwegian Money

Most budgeting apps track spending and stop there. Headroom knows the rules underneath. What trinnskatt does to the next krone you earn, that feriepenger is earned one year and paid the next, that arbeidsgiveravgift is most of why you cost more than your salary, that part of your mortgage interest comes back. Real brackets and real rates, updated when they move.

Set the region to generic and switch the interface to English, and the tax rules collapse to one flat rate you type in yourself. That gets you a working budget, not your own country's rules. If you want those, the seam is there: one fork in the tax calculation, a table of brackets, tests next to the Norwegian ones. Open a PR and start filling in numbers.

## The Dashboard

What you want from a finance app is money in, money out, what is left standing after both, and whether that is enough for the things you said you wanted. The front page is all four.

<img src="/images/headroom-oversikt.webp" alt="Headroom dashboard showing 1 362 739 kr total equity after tax and debt, a twelve month equity line, remaining monthly budget and daily spending pace" title="Total equity, after tax and after debt" style="width:100%;" />

The big number is equity after tax and after all debt. Student loan is split from the rest, because it behaves nothing like a credit card, and both versions are on the card. 1 362 739 with it, 1 646 739 without. Under that, twelve months as a line and 223 125 kr of change.

The right column is the near end of the same question. 14 190 left this month after fixed costs, and 11 352 you can actually spend, which is 366 kr a day. Your line is solid, the ideal pace is dotted, and being above it on the 12th is the only budgeting feedback that arrives early enough to act on.

Then the goals. A goal is a name, a target and a source. Point it at your BSU account, a savings account, the portfolio, the buffer or total equity, and it reads the balance itself.

<img src="/images/headroom-mal.webp" alt="Headroom goals card showing three savings goals at 60, 27 and 70 percent, each with its source, the amount remaining and the month it reaches the target at the current pace" title="Three goals, and when each one lands" style="width:100%;" />

What makes it more than a progress bar is the line underneath. The buffer goal reaches 100 000 in March 2032 at the rate it is actually growing. Add a deadline and that line becomes how many months ahead or behind you are, and what the monthly amount would have to be. Stop paying in and it says so.

<img src="/images/headroom-fordeling.webp" alt="Headroom dashboard lower half showing budget distribution, wealth allocation across six assets, monthly investment, top categories and a twelve month cash flow chart" title="Budget split, asset allocation and cash flow" style="width:100%;" />

Below that, the month split three ways and where the equity actually sits. 72% of it is house, which is the argument for reading this page instead of a bank balance, because a net worth made almost entirely of one illiquid asset behaves nothing like the same number held in funds.

Two tiles do work most budgeting apps skip. Emergency fund coverage counts your buffer in months of fixed expenses and says what to set aside monthly to reach the target. Debt-to-income shows the headroom to the 5x cap, which is the number that decides how short the next conversation at the bank is.

## Your Career, Written Down

Nobody remembers what they earned in 2019. Ask three people what their raise was two jobs ago and you get three shrugs. That is exactly what you are missing in February when someone across a table asks what you had in mind.

<img src="/images/headroom-lonn.webp" alt="Headroom salary page showing 768 000 kr total annual gross at 10 percent above the national median, 68.8 percent cumulative growth since 2015, 3.9 percent year over year against 2.7 percent CPI, and a 416 kr effective hourly rate" title="Pay over time" style="width:100%;" />

The salary page is a log you keep for a decade. Jobs with employer, role, dates and contracted hours. Salary changes with an effective date and a type, so an initial, a raise, a promotion and a job change are not the same event. Bonuses, overtime and the hours you actually worked go in separately, because a year where you got 3% and worked 15% more is not a good year.

Four numbers sit at the top, and in the demo they read 768 000 gross including on-call, up 68.8% since February 2015, 3.9% this year against 2.7% inflation, and 416 kr an hour on the hours actually worked. The badge says ten percent above the national median for the occupation, from SSB's wage statistics.

Then the charts, which is where ten years of entries turn into an argument. A marker on every change, so a flat three-year stretch is something you can see rather than half remember. One bar per year against CPI, green when you beat it. Total comp stacked, so the year the bonus vanished is not filed as the year the base moved. And hours against hourly rate, which catches a promotion that was really a workload increase.

Effective hourly is the one that stings. A 5% raise that arrives with four extra hours a week is a pay cut per hour, and nothing on your payslip will tell you.

There is also a calculator that divides your salary down to the second. 0,106 kr. Useless, and I look at it anyway.

<img src="/images/headroom-pengestrom.webp" alt="Headroom salary page showing a cash flow diagram from gross to tax, fixed expenses, free spending and savings, with a 43 percent marginal rate" title="Where the month's salary goes" style="width:100%;" />

The same page traces one month from gross to what is genuinely free, with the marginal rate on the next krone in the corner. 43% is what an extra shift is really worth.

### The Raise That Is Actually a Pay Cut

If you open one page in the demo, open this one.

A raise below inflation is not a raise. It is a pay cut delivered as good news, and it works because nobody does the subtraction in the room.

<img src="/images/headroom-forhandling.webp" alt="Headroom salary negotiation view with a 744 000 kr base, a 748 368 kr inflation floor and a gradient bar from lose purchasing power to real raise" title="The inflation floor" style="width:100%;" />

Your salary was set in February at 744 000. SSB says prices moved 0.6% since. The offer has to clear **748 368** before you have gained anything. Type it in, as kroner or as a percentage, and the bar tells you which of three things you just accepted.

That is the floor, not the ask. What you take into the meeting is the rest of the page: growth against CPI for every year you have logged, where you sit against the median, and what your effective hourly did while your title changed twice.

The alternative is arguing from memory against someone who has the numbers in front of them.

## The Month

<img src="/images/headroom-budsjett.webp" alt="Headroom budget page for August 2026 with monthly income, budget per month and per day, fixed expenses, an imported payslip and the spend and invest split" title="One month at a time" style="width:100%;" />

Income at the top, typed, derived from your salary entries, or lifted out of a payslip PDF that is read in your browser and never uploaded. In the demo it picked up 43 840 net, 64 000 gross, 20 160 withheld and 7 680 of holiday pay accrued, straight off the document.

From there, three numbers. Fixed costs of 29 650, then 11 352 spendable this month, then 366 kr a day. Per day is the one you use, because "you have 11 000 left" on the 3rd and on the 27th are different sentences.

The split is a target, not a leftover. Set 20% and it reserves 2 838 for investment first, then tells you what is spendable. Saving whatever survives the month is how people save nothing.

<img src="/images/headroom-utgifter.webp" alt="Headroom fixed expenses panel warning about double counting, offering to promote four detected recurring payments, and a chart of where the fixed money goes" title="It notices the subscription you forgot" style="width:100%;" />

Two things earn their place. It spots a fixed expense and a matching transaction and offers to link them, so a bill is not counted twice. And it finds repeated payments and offers to promote them, which is how the forgotten subscription surfaces.

Transactions get a rules engine. Rename one or fix its category, tick "remember", and every match in every month gets the same treatment, retroactively.

The one I did not expect to need is transfer detection. Moving 10 000 to your own savings account is not spending, but a bank feed cannot tell, and counting it ruins both the budget and the savings rate. Headroom flags what looks like an internal move, on round amounts, account numbers and monthly repetition, and offers to make each one a rule. It also warns about the way that goes wrong. Net out a credit card bill without importing the card's own transactions and everything you spent on that card disappears.

Under all that, spend per account per month, a search across every transaction you have, bulk recategorisation, and a nudge when the savings rate has been under target for months.

## What You Are Worth After Tax

A portfolio of 285 000 with 62 000 of unrealised gain is not worth 285 000. Sell it and 37.84% of the gain goes to tax, so the honest figure is 261 539.

<img src="/images/headroom-formue.webp" alt="Headroom wealth page showing latent tax deducted from an investment portfolio, home equity, pension balances, BSU allowances and crypto" title="Latent tax, deducted" style="width:100%;" />

So the page deducts it and shows the net position. Crypto gets the same treatment at 22%. Unpopular way to display a portfolio. Correct one.

The rest is a balance sheet with the parts held apart on purpose. Property is 4 200 000 against a 2 950 000 mortgage, so 1 250 000 of equity, and none of it is spendable. Liquidity is what you can reach this week, BSU included, with both its allowances tracked. Pension stays out of liquid equity, because OTP and IPS are real money that is not yours yet.

Credit frames count at their full limit rather than their balance, the way a bank counts them. An unused 100 000 card is 100 000 of debt in that conversation.

Under the balance sheet, the same assets projected to now, to five years out and to fifteen. Each class grows at its own rate rather than one blended number smeared over everything, and the monthly savings from your budget flow into stocks. Which is where the wealth page and the budget page stop being separate pages.

## The Forecast

Everything above feeds this one. Wealth is the opening balance, the budget supplies the monthly contribution, and the salary page supplies the raise assumption. Five sliders decide the rest: annual raise, share of net saved, expected real return, expected inflation, and how far out to look.

<img src="/images/headroom-prognose.webp" alt="Headroom forecast comparing 5 000 kr a month prepaid against invested over fifteen years, and a net worth projection to 2041 with nominal, today's kroner and an uncertainty band" title="Two assumptions, fifteen years apart" style="width:100%;" />

The chart draws two lines and a band. Nominal, which is the impressive one. The same figure in today's kroner, which is the one that means something. And the band sits at plus or minus three points of return, because a single confident line fifteen years out is a lie told with a chart library.

Prepay against invest takes an extra amount per month and runs it both ways. 5 000 a month against a 4.3% effective mortgage rate after the deduction, versus 7% expected return. Investing ends 324 745 ahead after fifteen years. Drag the return under the mortgage rate and the answer flips, which is the useful part. You get to see how much of the advice you have been given rests on an assumption nobody said out loud.

Financial independence puts the projection against 25 times your essential annual spending and gives the year it crosses, with essential spending taken from your own fixed expenses rather than a rule of thumb. And scenario compare runs two sets of assumptions side by side. Model 4% raises instead of 2% and read what fifteen years of the difference is worth, which is a better reason to prepare for February than any of the ones you rehearsed.

## What You Cost

This is the page nobody asks for and everybody reads twice.

<img src="/images/headroom-lonnskostnad.webp" alt="Headroom employer cost page building 768 000 kr salary up to 1 115 257 kr total, then deriving 1 560 billable hours, a 714,91 kr cover rate and a 1 021,30 kr target rate" title="Salary 768 000. Cost 1 115 257." style="width:100%;" />

Your contract says 768 000. Feriepenger goes on top, then employer OTP, then arbeidsgiveravgift on that whole base, then a desk, a laptop, licences and insurance. Total 1 115 257, a 45.2% uplift on the number you negotiated. Worth knowing before you ask for 30 000 more, because you are asking for 43 000.

The lower half is the part I keep coming back to. 1 950 working hours in a year, 80% of them billable, so 1 560 are actually sellable. Divide the cost by those and you get **714,91 kr/t**, the rate where your employer breaks exactly even on you. Add a 30% margin and it becomes **1 021,30 kr/t**, or 7 659 kr a day.

Spread the cost over every worked hour and it is 572 kr. Spread it over the billable ones and it is 715, and those 143 kroner of difference are nothing but the 390 hours a year nobody is invoiced for. That calculation is the one freelancers get wrong exactly once.

## One Home, One Loan

<img src="/images/headroom-bolig.webp" alt="Headroom mortgage page showing 1 250 000 kr equity, 4 200 000 kr value, 2 950 000 kr debt and 70.24 percent loan to value" title="The mortgage page" style="width:100%;" />

The monthly payment is 18 166 kr. Of that, **13 521 is interest and 4 595 is repayment**. Seeing that written down is educational in a way your bank's app avoids being. Belåningsgrad then falls from both ends at once, as you pay down and the property drifts up:

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

## Pension and the Year

{{< carousel >}}
{{< figure src="pensjon.webp" alt="Headroom pension page combining folketrygd, AFP, OTP and IPS into 57 100 kr net per month" >}}
{{< figure src="ar.webp" alt="Headroom year summary with income, tax paid, savings rate and a month by month table" >}}
{{< /carousel >}}

Pension folds folketrygd, AFP, OTP and IPS into one figure, what lands per month after tax and what share of today's take-home that is. The year page prints to PDF, which is what people want from it once a year.

## It Works on a Phone

<img src="/images/headroom-mobil.webp" alt="Headroom on a phone showing a two by two grid of monthly figures, an imported payslip card and a bottom tab bar" title="Installable as a PWA" style="width:35%;" />

Full mobile layout, installable with its own icon. Behind Tailscale that is a budgeting app on your phone that never leaves your network.

## Under the Hood

If you came for what it does, you can stop here. The rest is how it runs, for the people who want that part.

### Run It

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

### There Is No Login

{{< alert type="warning" >}}
Anyone who can reach the port can read and overwrite your entire financial picture. Do not put this on the open internet.
{{< /alert >}}

Two safe shapes. Loopback on a laptop, which is the default. Or a home server reached over WireGuard or Tailscale, which is also what makes the phone work.

Want it in a browser without a tunnel? Put a reverse proxy with authentication in front. There is an optional scrypt-hashed password and an `ALLOWED_HOSTS` guard against DNS rebinding, but treat both as depth, not as the front door.

### Where the Transactions Come From

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

Every rule in the table further up is a tested function in [`src/lib/`](https://github.com/mortennordbye/headroom/tree/main/src/lib) with its own test file next to it, which is the only reason I trust the numbers on the wealth page.

### Your Data Stays Yours

<img src="/images/headroom-eksport.webp" alt="Headroom settings listing all 342 entries included in an export, and one click configuration for Claude, Cursor, Codex and Gemini" title="Export lists exactly what it takes" style="width:100%;" />

One JSON export holds everything, and the screen lists what that means instead of asking you to trust it. Import opens a preview where you pick which sections to restore, and it downloads a safety copy first.

There is also a rotating SQLite snapshot in the volume and a `make backup` to the host.

Same screen wires up an AI assistant. The [MCP server](https://github.com/mortennordbye/headroom/tree/main/mcp) runs locally over stdio, reuses the app's own tested math so the numbers cannot drift, and puts writes through the same guards as the UI.

```bash
make mcp-install
```

### How the Public Demo Is Locked Down

There is no login, and yet there is an instance of it on the public internet. That only works because the public one is not really the app.

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

### Common Mistakes to Avoid

**Pointing a demo instance at your real volume**

`DEMO_MODE` protects writes. `GET /api/data` still serves your finances to the internet. Separate instance, empty storage.

**Assuming an update failed because nothing changed**

It is a PWA and caches itself. Accept the prompt or hard-reload. The data is fine; it just looks like a broken deploy.

**Setting `runAsUser` on the pod**

The entrypoint starts as root, fixes `/data` ownership, then drops to uid 1000. Starting non-root removes its ability to chown at all. Use `fsGroup`.

**Treating a lagging public series as missing data**

SSB publishes CPI with a lag. Reading that as "no data" hid a working feature for a month. Decide what a normal lag looks like, and keep it off the same code path as a real failure.

## What's Next?

Payslip parsing beyond Visma, which needs one function per provider and a sample PDF. Uncertainty bands on the stacked projection charts, which needs a design decision rather than more code. And turning defaults into explicit choices with a first-run flow.

## Final Thoughts

Plenty of budgeting apps exist. What keeps me on this one is that the understanding is worth more than the features. Knowing what a decade of your own raises did against CPI changes what you say in February. Knowing that 1 560 of your 1 950 hours are the billable ones changes how you read a rate. Knowing that 13 521 of an 18 166 payment is interest changes how you feel about paying extra.

None of that needs my app. It needs the numbers in front of you often enough that you stop guessing, and it should not cost a subscription to get there.

Headroom does the maths school skipped. The hypotenuse is still your problem.
