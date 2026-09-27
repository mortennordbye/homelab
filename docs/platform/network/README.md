# Network

Cilium is the CNI and announces the LoadBalancer VIPs on L2: `10.3.10.101` public
Traefik gateway, `10.3.10.102` private Traefik gateway, `10.3.10.103` Plex. Public
hostnames are in Cloudflare (`terraform/cloudflare/*`, external-dns); internal
`local.bigd.no` names are aliases to the private gateway in
`terraform/unifi/dns/records.tf`, so a new internal app needs an entry there.

- [`remote-access.md`](remote-access.md): Tailscale, with UniFi WireGuard as break-glass.
