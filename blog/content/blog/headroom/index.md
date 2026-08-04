---
title: "School Taught You Prøysen, Not Trinnskatt: Headroom Does That Maths"
description: "A self-hosted finance tracker built for Norwegian rules: trinnskatt, feriepenger, BSU, folketrygd, wealth tax and mortgage deduction. One container, live demo."
date: 2026-08-04
draft: false
tags: ["self-hosted", "docker", "personal-finance", "privacy", "cilium", "kubernetes", "intermediate"]
---

# School Taught You Prøysen, Not Trinnskatt: Headroom Does That Maths

<img src="/images/headroom-logo.svg" alt="Headroom" title="Headroom" style="width:20%;" />

Norwegian school gave you Alf Prøysen. Musevisa every December, Teskjekjerringa in the reading book, and enough of the melody left over that you can still sing it thirty years later.

It did not give you a tax return. It did not give you a fund, a loan you understood, or the one sentence you need in the annual salary review.

So most of us learned personal finance the same way: late, in public, and expensively. The apps that offer to fix that want your bank login, a monthly fee, and a copy of your entire financial picture on a server you do not own.

_This is my own app and I use it every month. If it is useful, or if you just appreciate the amount of tax code baked into a hobby project, drop a ⭐ on [headroom](https://github.com/mortennordbye/headroom). The manifests that run it live in my [Homelab repo](https://github.com/mortennordbye/Homelab)._

{{< github repo="mortennordbye/headroom" >}}

## Built for Norwegian Money

Headroom is a self-hosted personal finance tracker. One container, a SQLite file on a volume you own, no account and no cloud. That part is ordinary.

What is less ordinary is that the maths underneath is Norwegian all the way down, rather than a generic budgeting app with a NOK symbol bolted on the front.

That means the trinnskatt brackets, personfradrag and trygdeavgift are modelled properly, so a marginal rate is the real one. Feriepenger are earned at 12% this year and paid out next year, which is where most spreadsheets quietly lie to you. Arbeidsgiveravgift sits at 14.1%. BSU knows about the 27 500 annual and 300 000 lifetime limits, and about the fact that you stop qualifying once you own a home. Wealth tax values your primary home at 25% and your funds at 80% before subtracting the bunnfradrag. Mortgage interest gives back 22%. Folketrygd accrues at 18.1% up to 7.1 G and is divided by the delingstall for your birth cohort, with garantipensjon as the floor.

Every one of those is a tested function in [`src/lib/`](https://github.com/mortennordbye/headroom/tree/main/src/lib), not a number typed into a page component. `norwegianTax.ts`, `folketrygd.ts`, `feriepenger.ts`, `bsu.ts`, `afp.ts`, `restskatt.ts`. That is the reason the app exists.

So be clear about who this is for. There is a language toggle with full English translations, a currency setting that will display everything in USD or a code you invent, and a region setting with a generic option. Use all three and the budget, the transaction log, assets, goals and net worth work exactly as they should.

But look at what the generic region actually is.

**Full file:** [`src/lib/norwegianTax.ts`](https://github.com/mortennordbye/headroom/blob/main/src/lib/norwegianTax.ts)

```ts
export type Region = 'no' | 'generic';

export function calcTaxByRegion(grossAnnual, region, customRatePct, /* ... */) {
  if (region === 'no') return calcNorwegianTax(/* brackets, personfradrag, trygdeavgift */);
  const rate = Math.min(100, Math.max(0, customRatePct)) / 100;  // <--- one flat rate you type in
```

One flat effective rate. In that mode the trinnskatt and trygdeavgift lines come back as zero, because there is nothing left to break down. It is an honest placeholder that keeps the app usable outside Norway, rather than a second tax engine, and the pension, holiday pay and property models stay Norwegian no matter what you set. This was built for Norwegian money. Everything else is a fallback.

## Why It Ships as a Container, Not a Subscription

The obvious version of this app is a SaaS. Sign up, connect your bank, 79 kroner a month, and I get to say the word "traction" in public.

Two things stopped me.

The first is that I do not want to hold your banking data. A transaction feed under PSD2 comes with obligations I would have to take seriously, and a database holding a few thousand people's spending history is a target that has to be defended correctly every day for years. I am one person with a homelab and a day job. The honest version of that risk assessment is that I cannot lose data I never had.

The second is that the parts of this that actually help you are arithmetic. Your marginal rate. The inflation floor before a salary review. What your monthly payment is made of. Those all come from numbers you already have, and putting a subscription in front of them mostly guarantees that the people who would gain the most from seeing them never do.

So it runs on your machine, against your own file, and the only thing I ship is the code. That decision is why there is no login screen, no account, no telemetry and no sync service anywhere in the rest of this post. It is also why the security section further down is blunter than a product page would be. Self-hosting hands you the threat model along with the data, and saying so is part of shipping it.

## Click Through It Before You Install It

There is a public demo at [headroom.nordbye.it](https://headroom.nordbye.it). Nothing to sign up for, no cookie wall.

It is filled with a fictional eleven-year career: three employers, raises, a promotion, a job change, bonuses and overtime, imported payslips for the recent months, roughly six months of categorised transactions across two accounts, a flat in Oslo with a mortgage, pension balances, debts and goals. The transaction dates are generated relative to the day you open it, so the current month is always populated.

Click anything. Change anything. Your edits stay in your own browser tab and disappear when you reload, and no visitor can affect what another one sees. The whole of this post links straight into it, so you can read a section and open the page it describes:

- [Salary and the negotiation floor](https://headroom.nordbye.it/salary)
- [Budget for the month](https://headroom.nordbye.it/budget?m=2026-08)
- [Net worth after tax](https://headroom.nordbye.it/assets)
- [Mortgage](https://headroom.nordbye.it/bolig?m=2026-08)
- [Pension](https://headroom.nordbye.it/pension) and [forecast](https://headroom.nordbye.it/forecast)
- [What you cost your employer](https://headroom.nordbye.it/employer-cost)

## What You See First

<img src="/images/headroom-oversikt.webp" alt="Headroom dashboard showing total equity of 1 362 739 kr after tax and debt, remaining budget for the month, a daily spending pace chart and asset allocation" title="The dashboard" style="width:100%;" />

One number at the top, and it is deliberately the pessimistic one. Total equity after tax and after all debt, rather than the friendlier sum of your accounts. The bar underneath splits out student loan and other debt, and because a Norwegian student loan is a different animal from consumer debt, it also shows the figure excluding it.

Around it sits the state of the current month. What is left after fixed expenses, what you can spend today against the ideal pace for the month, how your assets are distributed, and a twelve month net worth line.

The app also volunteers things. If you spent noticeably less on a category than your six month average, it says so. If your projections are still running on default assumptions, it tells you how many and links to the page where you change them, which is a small thing that stops a forecast quietly being fiction.

## The Raise That Is Actually a Pay Cut

If you only open one page in the demo, open this one. It is the page I wish someone had shown me at 25.

A raise below inflation is not a raise. It is a pay cut delivered as good news, and it works because almost nobody does the subtraction in the room.

<img src="/images/headroom-forhandling.webp" alt="Headroom salary negotiation view showing a 744 000 kr base, a 748 368 kr inflation floor, and a gradient bar from lose purchasing power to real raise" title="The inflation floor on the salary page" style="width:100%;" />

The floor is the number that matters. Your last salary was set in February at 744 000. SSB says consumer prices have moved 0.6% since then. So the offer has to clear 748 368 before you have gained anything at all, and everything below that line is you agreeing to be paid less for the same work.

Type the offer into the box and the bar tells you which of three things you just accepted: lost purchasing power, stood still, or got a real raise. That is the entire feature, and it is the one I would keep if I had to delete every other page.

The rest of the page fills in the argument you make with it. Total annual salary against the national median from SSB. Your growth since your first recorded month, next to what CPI did over the same stretch. The effective hourly wage once actual hours worked are counted, which is the number that quietly gets worse every time you absorb an extra evening. The marginal rate on your next krone, so you know what an extra shift is really worth after trinnskatt.

There is also a comparison of tax withheld so far this year against what this year's income should actually be taxed. It is a rough projection, and it is deliberately rough, but it is the difference between finding out about restskatt now and finding out about it when the settlement lands.

## Where the Money Actually Goes

The budget page is per month, with a picker in the header that the whole app follows.

<img src="/images/headroom-budsjett.webp" alt="Headroom budget page for August 2026 showing monthly income, budget per month and per day, fixed expenses, an imported payslip and the spend and invest split" title="The monthly budget" style="width:100%;" />

Income for the month can be typed, or imported from a payslip PDF. The parser runs entirely in your browser, pulls out net pay, gross, forskuddstrekk and feriepenger accrued this year, and never uploads the file anywhere. A multi-page archive fills your income history backwards in time in one go.

From there it works out what you can spend today, rather than what you can spend this month. Fixed expenses come off, the savings target comes off, and what is left is divided by the days remaining. The split adapts to your own income history rather than following a fixed rule, which matters if your income moves around.

Two smaller things earn their place. The app watches for a fixed expense and a matching transaction in the same month and offers to link them, so a bill does not get counted twice. And it looks for repeated payments in your transactions and offers to promote them to fixed expenses, which is how the subscription you forgot about ends up on screen.

Below that the month's expenses are grouped as fixed, variable, subscriptions and insurance, each with a per-category budget and what is left of it. The daily transaction log sits underneath, and every entry can be recategorised, relabelled or marked as a transfer.

## What You Are Worth After Tax

The wealth page is where the word "worth" gets taken literally.

<img src="/images/headroom-formue.webp" alt="Headroom wealth page showing an investment portfolio with calculated latent tax, home equity, pension balances, a BSU account with its annual and lifetime allowance, and crypto holdings" title="Net worth, after tax" style="width:100%;" />

An investment portfolio worth 285 000 with 62 000 of unrealised gain is not worth 285 000. Sell it and 37.84% of that gain goes to tax, so the app deducts the latent tax and gives you the net position. Crypto gets the same treatment at its own rate. It is a deeply unpopular way to display a portfolio and it is the correct one.

The rest of the page is the whole balance sheet in one place. Property value against mortgage debt. OTP and IPS pension balances, held separately and excluded from spendable equity because they are locked until retirement. Savings accounts, a holiday account, a buffer account. Debts, including credit frames counted at their full granted limit rather than their current balance, which is how a bank looks at them.

BSU gets its own treatment, because BSU has rules: 27 500 a year, 300 000 in total, a 10% tax credit, and no eligibility once you own a home. The app tracks how much of both allowances you have left and tells you plainly when you no longer qualify.

At the bottom, an estimate of formuesskatt, with the valuation discounts applied. Your primary home counts at 25% of its value, funds at 80%, everything else in full, all debt subtracts, then the bunnfradrag comes off what is left. In the demo that lands on zero, which is the answer for most people, and knowing that it is zero is worth more than assuming.

## One Home, One Loan

The mortgage page is the densest one in the app, and the reason is that a Norwegian home loan is not just a balance.

<img src="/images/headroom-bolig.webp" alt="Headroom mortgage page showing home equity of 1 250 000 kr, current value 4 200 000 kr, remaining debt 2 950 000 kr and a loan to value ratio of 70.24 percent" title="The mortgage page" style="width:100%;" />

Equity, current value, remaining debt and belåningsgrad across the top. Under that the loan itself, broken into what each month's payment is actually made of. The payment is 18 166 kr, of which 13 521 is interest and 4 595 is repayment. Seeing that split written down is educational in a way the bank's own app avoids being.

Belåningsgrad falls for two reasons at once, and the projection tracks both: you pay the loan down while the property drifts up.

{{< chart alt="Loan to value ratio falling from 70 percent in 2026 to zero in 2051" ratio="16/7" caption="Belåningsgrad on the demo's mortgage, projected to the final payment in 2051. Read straight out of the app's own projection." >}}
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
    "scales": {
      "y": { "title": { "display": true, "text": "Belåningsgrad (%)" }, "suggestedMax": 75 }
    }
  }
}
{{< /chart >}}

Three things on this page pull live public data. The market estimate uses SSB table 14310, the municipal average price per square metre, and says how many sales it is based on so you can judge how much to trust it. The interest rate you pay is shown next to the Norges Bank policy rate with the spread between them worked out, because that spread is the argument you take to your bank. And the interest deduction is calculated at 22%, which is what makes the effective cost of the loan lower than the number on the statement.

There is also a repayment view of plan against reality, so an extra payment shows up as being a month ahead rather than disappearing into the balance. Housing history keeps the places you have lived and what you sold them for, and a second tab models a secondary home, including whether a bank would actually lend you the money.

## Pension, and What You Cost

Two pages that answer questions most people postpone.

The pension page adds up folketrygd, AFP, OTP and IPS into a single figure, which is what lands in your account per month after tax, and what percentage of your current take-home that represents. A monthly income in today's kroner with the accrual rules and the pension tax rules applied, rather than a fund balance you have to interpret yourself.

The forecast page is where you argue with your own assumptions. Salary growth, savings rate, expected return, inflation, horizon. It projects net worth in both nominal and present-day kroner, with an uncertainty band at plus or minus three percentage points of return, because a single confident line for fifteen years out is a lie told with a chart library. It also settles the prepay-or-invest question at the effective post-deduction rate rather than the nominal one, and works out the year the 4% rule would cover your expenses.

Then there is a page that has nothing to do with your household at all, which works out what you cost your employer.

<img src="/images/headroom-lonnskostnad.webp" alt="Headroom employer cost page showing a cost build up from 768 000 kr gross salary to 1 115 257 kr total, and a consultant hourly rate calculation" title="What you cost, and what you would have to charge" style="width:100%;" />

Gross salary, plus feriepenger, plus employer OTP, then arbeidsgiveravgift on top of that combined base, plus a fixed-cost estimate for a desk, a laptop and insurance. For the demo's 768 000 salary that comes to 1 115 257, a 45.2% uplift on the number in the contract.

Underneath, the same figures turn into a consultant hourly rate. Set your billable share and target margin and it gives you the rate that merely covers you (714,91 kr) next to the rate that hits the margin (1 021,30 kr). That gap is the calculation most freelancers get wrong exactly once.

{{< carousel >}}
{{< figure src="lonn.webp" alt="Headroom salary page showing total annual salary, growth against CPI, effective hourly wage and a salary calculator down to earnings per second" >}}
{{< figure src="pensjon.webp" alt="Headroom pension page showing folketrygd, AFP, OTP and IPS combined into a monthly net pension of 57 100 kr" >}}
{{< figure src="prognose.webp" alt="Headroom forecast page comparing paying down the mortgage against investing, and a net worth projection with an uncertainty band" >}}
{{< figure src="ar.webp" alt="Headroom year summary showing income, tax paid, savings rate, biggest spending categories and a month by month table" >}}
{{< /carousel >}}

The last of those four is the year summary, and it is the page I open least often and value most. Income, tax paid, savings rate and change in net worth for the year, the categories you spent the most on, and a month by month table of income against spending with the savings rate for each. It prints to a PDF, which turns out to be the format people actually want when they sit down with this once a year.

## Where the Transactions Come From

You can type transactions in. You can also connect a bank through [Enable Banking](https://enablebanking.com/), which is the open banking layer that covers Norwegian banks under PSD2.

A fetch reaches back about 90 days, which sounds limiting until you notice that stored transactions are never dropped. They accumulate. Sync every couple of months and your history keeps growing on your own disk, and an export captures all of it.

What happens to a transaction between arriving and showing up in your budget:

{{< timeline >}}
{{< timelineItem header="Fetched" subheader="server/bank.js" badge="~90 days" >}}
The window each fetch can see. Anything older is already in your database from an earlier sync.
{{< /timelineItem >}}
{{< timelineItem header="Deduplicated" subheader="src/lib/bankDedup.ts" >}}
The same payment can arrive twice with different identifiers, once as pending and once as booked. Matching on amount, date and description is what stops your grocery bill doubling.
{{< /timelineItem >}}
{{< timelineItem header="Categorised" subheader="src/lib/categorize.ts" >}}
Rules you write map a merchant to a category. This is the part you tune for a month and then stop thinking about.
{{< /timelineItem >}}
{{< timelineItem header="Labelled" subheader="src/lib/labelRules.ts" >}}
A second pass for the things a category cannot express, like which of two shared expenses was actually yours.
{{< /timelineItem >}}
{{< timelineItem header="Transfers removed" subheader="src/lib/transferRules.ts" >}}
Money moved between your own accounts is not spending, and counting it as spending is the single fastest way to make a budget useless.
{{< /timelineItem >}}
{{< /timeline >}}

## Let an Agent Read Your Budget

Headroom ships a [Model Context Protocol](https://modelcontextprotocol.io) server in [`mcp/`](https://github.com/mortennordbye/headroom/tree/main/mcp). It runs on your machine over stdio and talks to the local API, so nothing is exposed to the network.

```bash
make mcp-install                 # registers it with Claude Code
```

Settings has copy-paste configuration for Claude Desktop, Claude Code, Cursor, Codex and Gemini CLI, so this is a two minute job rather than a JSON archaeology expedition. There is also a free-text field for context you want the assistant to have about your situation.

Then you can ask where your budget is leaking, or for an overview, in plain language. Two design decisions make this something other than a gimmick. The tools reuse the app's own tested `src/lib` math, so the assistant's numbers and the screen's numbers cannot drift apart. And writes go through the same `/api/data` guards as the UI, touching exactly one slice at a time, so an agent cannot quietly drop the rest of your data on the way past.

## Your Data, and Getting It Out

Everything lives in one SQLite file in a volume you own. No browser storage, nothing in a cloud. Updating the app never touches it, because the volume is separate from the container.

There are three ways to keep a copy, and they are deliberately different from each other. The container writes a timestamped snapshot into `/data/backups` on a schedule and prunes to the newest few, so you have recent copies without remembering anything. `make backup` copies the live database out to the host. And Settings, then Export, gives you the whole state as a single JSON file. That last one is the one that matters, because it is independent of Docker, survives losing the volume entirely, and imports into a fresh install on a different machine.

The export screen lists exactly what is included rather than making you trust it. Monthly income, payslips, jobs, salary history, bonuses, overtime, hours, fixed expenses, transactions, category budgets, debts, net worth history, balance snapshots, goals, second-home scenarios, assets and crypto, pension, loan and property, employer cost, and your settings.

Restoring opens a preview first. You choose which sections to bring back, income and work, budget and spending, assets and debt and goals, or settings, and the rest of your data is left alone. A safety copy of your current state downloads before anything is replaced. You can also restore straight from a `make backup` SQLite file through the same preview, without touching a terminal, because the server opens the uploaded database read-only, extracts the blob and hands it to the client.

## Details That Took the Longest

The features above are the reason to run it. These are the reason it is pleasant to run.

The month picker in the header is a time machine. The whole app follows one month, so moving it back renders the balance snapshot recorded then, rather than today's numbers wearing an old label.

Every assumption that could be a default or your own choice carries a small badge saying which it is, and the dashboard counts how many are still untouched. A fifteen year projection built on six defaults is a guess, and the app would rather say so than present it as analysis.

There is a glossary, because Norwegian personal finance runs on abbreviations that are not obvious even to people who have been paying into them for a decade. BSU, OTP, IPS, AFP, G, delingstall. A button in the header explains each one. There is also a setup guide that walks through the numbers worth entering first, in order, instead of dropping you into an empty dashboard and wishing you luck.

It works properly on a phone, with a full mobile layout and a PWA install that gives it its own icon and a fullscreen launch. Put that behind Tailscale and you have a budgeting app on your phone that never leaves your own network.

And somewhere in there is a salary calculator that converts your salary down to earnings per second. It is mostly useless. It is occasionally very clarifying about a meeting.

## Run It

One command. Nothing to clone, nothing to build, no config file and no environment variables.

**Full file:** [`README.md`](https://github.com/mortennordbye/headroom/blob/main/README.md)

```bash
docker run -d \
  --name headroom \
  -p 127.0.0.1:8080:3001 \
  -v headroom_data:/data \
  --restart unless-stopped \
  ghcr.io/mortennordbye/headroom:latest
```

Open <http://localhost:8080> and you are done.

The `127.0.0.1` prefix is doing real work. It binds the port to loopback, so the app is reachable from the machine it runs on and from nowhere else. Everything you enter lives in the `headroom_data` volume, which is separate from the container and survives restarts, reboots and upgrades. `--restart unless-stopped` brings it back after you reboot, so it is simply there when you open the browser.

If you would rather build it yourself, or run it on a home server behind a reverse proxy, the README covers both. The Kubernetes manifests I use are in [`k8s/talos/apps/headroom`](https://github.com/mortennordbye/Homelab/tree/main/k8s/talos/apps/headroom), and that instance scales to zero when nobody is looking at it. The app and the data format are identical either way, and an export from one imports straight into the other.

## There Is No Login

Headroom has no authentication by default. That is a deliberate choice for a single-user app on loopback, and it becomes a serious problem the moment you move it.

{{< alert type="warning" >}}
Anyone who can reach the port can read and overwrite your entire financial picture. Do not put this on the open internet.
{{< /alert >}}

There are two safe shapes. Local only, bound to `127.0.0.1`, which is the default and is right for a laptop. Or on a home server reached over WireGuard or Tailscale, which is also what makes it work on your phone, where it installs as a PWA with its own icon.

If you want it reachable from a browser without a tunnel, it has to sit behind a reverse proxy that adds authentication. There is an optional password (Settings, then Access, stored as a scrypt hash, or `AUTH_PASSWORD` from a Kubernetes Secret) but treat that as defence in depth rather than as the front door. There is also `ALLOWED_HOSTS`, an allowlist checked against the Host header, which is a small guard against DNS rebinding.

## How the Public Demo Is Locked Down

Which brings up an obvious contradiction. I have just spent a section telling you not to expose this app, and there is an instance of it on the public internet.

The demo runs with `DEMO_MODE=1`, and that flag does four things. Every non-GET request under `/api/` is refused with a 403. The entire `/api/bank/*` namespace is refused outright, because its GETs are not safe reads. One of them proxies to Enable Banking using the instance's own credentials. The client detects demo mode at boot and fills itself from a fictional dataset generated in the browser, so it never fetches or posts `/api/data` at all. And the background jobs are skipped, because a demo has nothing worth backing up and no bank to sync.

That is enforced in [`server/demo.js`](https://github.com/mortennordbye/headroom/blob/main/server/demo.js), server-side, so it holds no matter what a client sends.

I did not want that to be the only thing standing between a stranger and a bank API. So the pod that is reachable from the internet also has its egress locked down.

**Full file:** [`k8s/talos/apps/headroom-demo/ciliumnetworkpolicy.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/apps/headroom-demo/ciliumnetworkpolicy.yaml)

```yaml
  egress:
    # DNS to CoreDNS. Required for the toFQDNs rules below to resolve.
    - toEndpoints:
        - matchLabels:
            "k8s:io.kubernetes.pod.namespace": kube-system
            "k8s:k8s-app": kube-dns
      toPorts:
        - ports: [{ port: "53", protocol: ANY }]
    # The public statistics the app proxies and caches: SSB and Norges Bank.
    - toFQDNs:
        - matchName: "data.ssb.no"          # <--- inflation, square metre prices, wage stats
        - matchName: "data.norges-bank.no"  # <--- the policy rate
      toPorts:
        - ports: [{ port: "443", protocol: TCP }]
```

The important part of that block is what is missing from it. Writing any egress rule at all makes egress deny-by-default for this endpoint, so the two hostnames listed are the only places this pod can reach. `api.enablebanking.com` is deliberately absent.

That is the point. A regression in the demo gate, on its own, is not enough to reach a bank on my credentials, because the packet still has nowhere to go. Two independent mechanisms, in two different systems, both have to fail.

The rest of the deployment follows the same reasoning. Storage is an `emptyDir`, so every restart starts clean and there is no volume to leak. `ALLOWED_HOSTS` is set. Ingress only accepts traffic from Traefik and the kubelet probes.

## Common Mistakes to Avoid

I have made most of these.

**Pointing a demo instance at your real data volume.** `DEMO_MODE` protects writes. It does not stop `GET /api/data` serving your actual finances to the internet. Run the demo as a separate instance with its own empty storage, always.

**Assuming an update failed because the UI did not change.** The app is a PWA and caches itself. After an update the browser can keep serving the old version until you accept the update prompt or hard-reload. Your data is untouched, but it looks exactly like a broken deploy.

**Setting `runAsUser` on the pod.** The entrypoint starts as root, fixes ownership of `/data`, then drops to uid 1000. Starting the pod non-root removes its ability to chown at all, and you get a container that cannot open its own database. The fix is `fsGroup`, not `runAsUser`.

**Treating a lagging public series as missing data.** SSB publishes CPI with a publication lag. The app read that gap as "no inflation data available" and hid the comparison, which made a working feature look broken for a month. If you consume a public statistics API, decide up front what a normal lag looks like and do not let it share a code path with a genuine failure.

## What's Next?

**Payslips beyond Visma.** The parser is a registry that takes more formats, but only one is written. Adding another payroll provider means writing one function that returns null when it does not recognise the text. It needs a sample PDF to build a fixture from.

**Uncertainty bands on the remaining projections.** The forecast chart has them. The assets and dashboard projections are stacked area charts, where a band would sit hidden behind opaque fills, so that needs a design decision rather than a copy of the existing code.

**Turning defaults into choices.** The app marks which assumptions are still defaults and which you have set yourself, but the marker is a value comparison, so setting a value equal to the default still reads as a default. A first-run flow that asks the questions once would fix it properly.

## Final Thoughts

Plenty of budgeting apps exist. What keeps me building on this one is that the understanding turns out to be worth more than any single feature in it. Knowing your marginal rate changes what an extra shift is worth. Knowing the inflation floor changes what you say in February. Knowing that 13 521 of your 18 166 mortgage payment is interest changes how you feel about paying a bit extra.

None of that requires my app. It requires the numbers being in front of you often enough that you stop guessing, and it should not cost anyone a subscription to get there.

If you want the version that speaks Norwegian tax fluently, it is one `docker run` away, the code is in [headroom](https://github.com/mortennordbye/headroom), and the manifests are in the [Homelab repo](https://github.com/mortennordbye/Homelab). Everything else you can take apart.

Headroom does the tax maths. You are still on your own for Musevisa.
