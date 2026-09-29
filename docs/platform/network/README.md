# Network

Cilium is the CNI and announces the LoadBalancer VIPs on L2 from the pool
`10.3.10.100/29`: `10.3.10.100` Argo CD, `10.3.10.101` public Traefik gateway,
`10.3.10.102` private Traefik gateway, `10.3.10.103` Plex, `10.3.10.104` innestemme. Public
hostnames are in Cloudflare (`terraform/cloudflare/*`, external-dns); internal
`local.bigd.no` names are aliases to the private gateway in
`terraform/unifi/dns/records.tf`, so a new internal app needs an entry there.

Every app namespace except `home-assistant` has CiliumNetworkPolicies, enforced: a flow
no rule allows is dropped and counted in Hubble and Prometheus. The gluetun pod sends its DNS through the VPN,
so it reaches `local.bigd.no` apps through `hostAliases` on `10.3.10.102`.

- [`traefik.md`](traefik.md): the public and private gateways, HTTP/3, middlewares, the Cloudflare range copies, and how to expose an app.
- [`cilium.md`](cilium.md): CNI settings tied to Talos, L2 announcements, Hubble, and writing a CiliumNetworkPolicy.
- [`certificates.md`](certificates.md): the Let's Encrypt issuer, the wildcard certificates per gateway listener, and renewal.
- [`remote-access.md`](remote-access.md): Tailscale, with UniFi WireGuard as break-glass.
- [`unifi.md`](unifi.md): the UniFi site in `terraform/unifi/network`: VLANs, Wi-Fi, reservations, firewall holes, port forwards.
- [`dns.md`](dns.md): internal `local.bigd.no` split-horizon records on the UniFi gateway (`terraform/unifi/dns`).
- [`cloudflare.md`](cloudflare.md): the public zones nordbye.it, logeverylift.com and bigd.no, origin records, caching, and the watchdog Worker.
