locals {
  script_name = "homelab-watchdog"
}

data "cloudflare_zone" "this" {
  filter = {
    name = var.zone_name
  }
}

# The webhook Alertmanager posts to, stored with /slack appended; the Worker posts
# Discord's own format, so the suffix is removed.
data "bitwarden-secrets_secret" "discord_webhook" {
  id = "d810abf7-40ad-4b1c-9d30-b44c0108ecad"
}

resource "random_password" "heartbeat_token" {
  length  = 40
  special = false
}

resource "cloudflare_workers_kv_namespace" "state" {
  account_id = var.account_id
  title      = "homelab-watchdog"
}

resource "cloudflare_workers_script" "watchdog" {
  account_id         = var.account_id
  script_name        = local.script_name
  content            = file("${path.module}/worker.js")
  main_module        = "worker.js"
  compatibility_date = "2026-09-01"

  bindings = [
    {
      name         = "STATE"
      type         = "kv_namespace"
      namespace_id = cloudflare_workers_kv_namespace.state.id
    },
    {
      name = "SITES"
      type = "plain_text"
      text = jsonencode(var.sites)
    },
    {
      name = "HEARTBEAT_TOKEN"
      type = "secret_text"
      text = random_password.heartbeat_token.result
    },
    {
      name = "DISCORD_WEBHOOK_URL"
      type = "secret_text"
      text = trimsuffix(data.bitwarden-secrets_secret.discord_webhook.value, "/slack")
    },
  ]
}

# Cron triggers refuse to save until the account has a workers.dev subdomain, and the
# provider has no resource for it, so it is set with an idempotent PUT. Renaming it
# here re-runs the PUT; removing it from here does not release the name.
resource "terraform_data" "workers_subdomain" {
  input = var.workers_subdomain

  provisioner "local-exec" {
    command = <<-EOT
      curl -fsS --max-time 60 -X PUT \
        "https://api.cloudflare.com/client/v4/accounts/${var.account_id}/workers/subdomain" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{"subdomain":"${self.input}"}' >/dev/null
    EOT
    environment = {
      CLOUDFLARE_API_TOKEN = var.cloudflare_api_token
    }
  }
}

# Reachable only on the custom domain.
resource "cloudflare_workers_script_subdomain" "watchdog" {
  account_id       = var.account_id
  script_name      = cloudflare_workers_script.watchdog.script_name
  enabled          = false
  previews_enabled = false

  depends_on = [terraform_data.workers_subdomain]
}

resource "cloudflare_workers_cron_trigger" "watchdog" {
  depends_on = [terraform_data.workers_subdomain]

  account_id  = var.account_id
  script_name = cloudflare_workers_script.watchdog.script_name
  schedules = [
    {
      cron = "* * * * *"
    },
  ]
}

# external-dns runs upsert-only on this zone, so it leaves the Worker's record alone.
resource "cloudflare_workers_custom_domain" "watchdog" {
  account_id = var.account_id
  zone_id    = data.cloudflare_zone.this.zone_id
  hostname   = var.hostname
  service    = cloudflare_workers_script.watchdog.script_name
}

# Read by the alertmanager-heartbeat ExternalSecret in kube-prometheus-stack.
resource "bitwarden-secrets_secret" "heartbeat_url" {
  key        = "alertmanager-heartbeat-url"
  value      = "https://${cloudflare_workers_custom_domain.watchdog.hostname}/heartbeat/${random_password.heartbeat_token.result}"
  project_id = var.bitwarden_project_id
}
