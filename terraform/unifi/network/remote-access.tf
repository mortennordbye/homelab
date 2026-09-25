# Break-glass VPN. Day-to-day remote access is the Tailscale subnet router,
# see docs/remote-access.md.
resource "unifi_vpn_server" "wireguard" {
  name    = "WireGuard"
  enabled = true
  subnet  = "192.168.3.1/24"

  wan = {
    interface = "wan"
    ip        = "any"
  }

  wireguard = {
    port = 51820
  }
}

# Keeps the WAN address behind these names current; Telia assigns it by DHCP.
resource "unifi_dynamic_dns" "cloudflare" {
  for_each = toset(["bigd.no", "nordbye.it"])

  service   = "cloudflare"
  interface = "wan"
  host_name = "ddns.${each.key}"
  login     = each.key
  password  = var.ddns_cloudflare_tokens[each.key]
}
