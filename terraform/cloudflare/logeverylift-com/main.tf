data "cloudflare_zone" "this" {
  filter = {
    name = var.zone_name
  }
}
