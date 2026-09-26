// Runs outside the homelab, so it can report what the homelab cannot: that
// Alertmanager has gone quiet, or that a public site is down from the internet.
// Posts straight to Discord and keeps one KV key per check, written only on change.

const HEARTBEAT_MAX_AGE_MS = 15 * 60 * 1000;
// A site must fail this many runs in a row before it is reported.
const FAILS_BEFORE_DOWN = 3;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === `/heartbeat/${env.HEARTBEAT_TOKEN}`) {
      await env.STATE.put("heartbeat", String(Date.now()));
      return new Response("ok\n");
    }
    return new Response("not found\n", { status: 404 });
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(Promise.all([checkHeartbeat(env), ...JSON.parse(env.SITES).map((s) => checkSite(env, s))]));
  },
};

async function checkHeartbeat(env) {
  const last = Number(await env.STATE.get("heartbeat")) || 0;
  const down = Date.now() - last > HEARTBEAT_MAX_AGE_MS;
  const since = last ? `last heartbeat ${new Date(last).toISOString()}` : "no heartbeat yet";
  await transition(env, "state:heartbeat", down ? FAILS_BEFORE_DOWN : 0, {
    down: `Alertmanager heartbeat missing, ${since}. The cluster, Prometheus, Alertmanager or the home internet is down.`,
    up: "Alertmanager heartbeat is back.",
  });
}

async function checkSite(env, site) {
  let problem = "";
  try {
    const res = await fetch(site, { redirect: "follow", signal: AbortSignal.timeout(10000) });
    if (res.status >= 400) problem = `HTTP ${res.status}`;
  } catch (e) {
    problem = e.name === "TimeoutError" ? "timed out after 10 s" : String(e);
  }
  const key = `state:${site}`;
  const fails = problem ? (Number((await env.STATE.get(key)) ?? 0) || 0) + 1 : 0;
  await transition(env, key, fails, {
    down: `${site} is down from the internet: ${problem}.`,
    up: `${site} is reachable again.`,
  });
}

// Stores the failure count and posts once when it crosses into down and once when
// it returns to zero.
async function transition(env, key, fails, text) {
  const prev = Number((await env.STATE.get(key)) ?? 0) || 0;
  const wasDown = prev >= FAILS_BEFORE_DOWN;
  const isDown = fails >= FAILS_BEFORE_DOWN;
  if (Math.min(prev, FAILS_BEFORE_DOWN) !== Math.min(fails, FAILS_BEFORE_DOWN)) {
    await env.STATE.put(key, String(Math.min(fails, FAILS_BEFORE_DOWN)));
  }
  if (isDown !== wasDown) {
    await discord(env, `[WATCHDOG] ${isDown ? "DOWN" : "UP"}: ${isDown ? text.down : text.up}`);
  }
}

async function discord(env, content) {
  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) console.log(`discord ${res.status}: ${await res.text()}`);
}
