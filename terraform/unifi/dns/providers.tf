provider "unifi" {
  api_key = var.unifi_api_key
  api_url = var.unifi_api_url

  # The console serves its own self-signed certificate on the LAN address.
  allow_insecure = true
}
