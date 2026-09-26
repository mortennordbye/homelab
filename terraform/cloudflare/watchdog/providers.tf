provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Reads BW_ACCESS_TOKEN and BW_ORGANIZATION_ID from the environment, see README.md.
provider "bitwarden-secrets" {}
