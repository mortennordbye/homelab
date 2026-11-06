# Network

Cilium is the CNI. It announces the LoadBalancer VIPs on L2 from the pool
`10.3.10.100/29`: `10.3.10.100` Argo CD, `10.3.10.101` public Traefik gateway,
`10.3.10.102` private Traefik gateway, `10.3.10.103` Plex, `10.3.10.99` innestemme (the /29 spans .96 to .103). Public
hostnames are in Cloudflare (`terraform/cloudflare/*`, external-dns). Internal
`local.bigd.no` names are aliases to the private gateway in
`terraform/unifi/dns/records.tf`. A new internal app needs an entry there.

Every app namespace except `home-assistant` has CiliumNetworkPolicies, and Cilium enforces
them. Cilium drops a flow that no rule allows, and Hubble and Prometheus count the drop. The gluetun pod sends its DNS through the VPN,
so it reaches `local.bigd.no` apps through `hostAliases` on `10.3.10.102`.

- [`traefik.md`](traefik.md): the public and private gateways, HTTP/3, middlewares, the Cloudflare range copies, and how to expose an app.
- [`cilium.md`](cilium.md): CNI settings tied to Talos, L2 announcements, Hubble, and how to write a CiliumNetworkPolicy.
- [`certificates.md`](certificates.md): the Let's Encrypt issuer, the wildcard certificates per gateway listener, and renewal.
- [`remote-access.md`](remote-access.md): Tailscale, with UniFi WireGuard as the emergency fallback.
- [`unifi.md`](unifi.md): the UniFi site in `terraform/unifi/network`: VLANs, Wi-Fi, reservations, firewall holes, port forwards.
- [`dns.md`](dns.md): internal `local.bigd.no` split-horizon records on the UniFi gateway (`terraform/unifi/dns`).
- [`cloudflare.md`](cloudflare.md): the public zones nordbye.it, logeverylift.com and bigd.no, origin records, caching, and the watchdog Worker.
