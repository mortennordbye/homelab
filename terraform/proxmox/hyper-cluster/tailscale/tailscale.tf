# Owns the ENTIRE tailnet policy file. Edits made in the admin console will be
# overwritten on the next apply; change policy here instead.
resource "tailscale_acl" "tailnet" {
  acl = jsonencode({
    tagOwners = {
      "tag:subnet-router" = ["autogroup:admin"]
    }

    # Routes the subnet router advertises come up approved, no console click.
    autoApprovers = {
      routes = {
        for route in var.advertised_routes : route => ["tag:subnet-router"]
      }
    }

    # Tailscale's default open policy: every tailnet member reaches everything.
    # Tighten when non-admin users join (family devices scoped to Home Assistant).
    grants = [
      {
        src = ["*"]
        dst = ["*"]
        ip  = ["*"]
      }
    ]

    # Default Tailscale SSH rule: members may SSH to their own devices,
    # with a re-auth check each session.
    ssh = [
      {
        action = "check"
        src    = ["autogroup:member"]
        dst    = ["autogroup:self"]
        users  = ["autogroup:nonroot", "root"]
      }
    ]
  })
}

resource "tailscale_tailnet_key" "router" {
  description   = "tailscale-router cloud-init join key"
  reusable      = false
  ephemeral     = false
  preauthorized = true
  expiry        = 7776000 # 90 days; only consumed once at first boot

  tags = ["tag:subnet-router"]

  # The tag must exist in the policy before a key can carry it.
  depends_on = [tailscale_acl.tailnet]
}

resource "tailscale_dns_split_nameservers" "internal" {
  domain      = var.internal_domain
  nameservers = [var.internal_dns_server]
}
