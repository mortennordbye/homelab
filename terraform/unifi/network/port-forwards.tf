locals {
  # Cilium LB-IPAM VIPs, see k8s/talos/infra/cilium and terraform/unifi/dns.
  traefik_public = "10.3.10.101"
}

resource "unifi_port_forward" "http" {
  name     = "trefik-http"
  protocol = "tcp_udp"

  wan = {
    interface  = "wan"
    ip_address = "any"
    port       = "80"
  }

  forward = {
    ip   = local.traefik_public
    port = "80"
  }
}

# UDP for HTTP/3 on the websecure entrypoint.
resource "unifi_port_forward" "https" {
  name     = "trefik-https"
  protocol = "tcp_udp"

  wan = {
    interface  = "wan"
    ip_address = "any"
    port       = "443"
  }

  forward = {
    ip   = local.traefik_public
    port = "443"
  }
}

resource "unifi_port_forward" "plex" {
  name     = "plex"
  protocol = "tcp_udp"

  wan = {
    interface  = "wan"
    ip_address = "any"
    port       = "32400"
  }

  forward = {
    ip   = local.plex
    port = "32400"
  }
}
