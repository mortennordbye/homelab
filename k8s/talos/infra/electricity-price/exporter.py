# Exposes the current Nord Pool spot price for one Norwegian price area, from
# hvakosterstrommen.no's daily files. Prices exclude VAT.
import datetime as dt
import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

AREA = os.environ["PRICE_AREA"]
URL = "https://www.hvakosterstrommen.no/api/v1/prices/{day:%Y/%m-%d}_{area}.json"
cache = {}


def day_prices(day):
    if day not in cache:
        # The API answers 403 to urllib's default User-Agent.
        req = urllib.request.Request(URL.format(day=day, area=AREA), headers={"User-Agent": "homelab-electricity-price/1"})
        with urllib.request.urlopen(req, timeout=10) as r:
            cache[day] = json.load(r)
        for old in [d for d in cache if d < day - dt.timedelta(days=1)]:
            del cache[old]
    return cache[day]


def current_price():
    now = dt.datetime.now(dt.timezone.utc)
    # Files are per Norwegian calendar day, which straddles two UTC dates.
    for day in (now.date(), now.date() + dt.timedelta(days=1), now.date() - dt.timedelta(days=1)):
        try:
            prices = day_prices(day)
        except urllib.error.HTTPError:
            continue
        for p in prices:
            if dt.datetime.fromisoformat(p["time_start"]) <= now < dt.datetime.fromisoformat(p["time_end"]):
                return p["NOK_per_kWh"]
    raise LookupError("no price for the current hour")


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/metrics":
            self.send_response(404)
            self.end_headers()
            return
        lines = [
            "# HELP electricity_spot_price_nok_per_kwh Current spot price, NOK per kWh, excluding VAT.",
            "# TYPE electricity_spot_price_nok_per_kwh gauge",
        ]
        try:
            lines.append(f'electricity_spot_price_nok_per_kwh{{area="{AREA}"}} {current_price()}')
            ok = 1
        except Exception:
            ok = 0
        lines += [
            "# HELP electricity_spot_price_up Whether the last price lookup succeeded.",
            "# TYPE electricity_spot_price_up gauge",
            f'electricity_spot_price_up{{area="{AREA}"}} {ok}',
        ]
        body = ("\n".join(lines) + "\n").encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; version=0.0.4")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("", 8080), Handler).serve_forever()
