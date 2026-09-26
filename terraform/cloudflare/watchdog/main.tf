locals {
  script_name = "homelab-watchdog"
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

resource "cloudflare_workers_cron_trigger" "watchdog" {
  account_id  = var.account_id
  script_name = cloudflare_workers_script.watchdog.script_name
  schedules = [
    {
      cron = "* * * * *"
    },
  ]
}

resource "cloudflare_workers_script_subdomain" "watchdog" {
  account_id       = var.account_id
  script_name      = cloudflare_workers_script.watchdog.script_name
  enabled          = true
  previews_enabled = false
}

# Read by the alertmanager-heartbeat ExternalSecret in kube-prometheus-stack.
resource "bitwarden-secrets_secret" "heartbeat_url" {
  key        = "alertmanager-heartbeat-url"
  value      = "https://${local.script_name}.${var.workers_subdomain}.workers.dev/heartbeat/${random_password.heartbeat_token.result}"
  project_id = var.bitwarden_project_id
}
