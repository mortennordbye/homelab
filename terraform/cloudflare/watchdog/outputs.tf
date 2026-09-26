output "heartbeat_url" {
  description = "Where Alertmanager posts the Watchdog alert. Stored in Bitwarden as alertmanager-heartbeat-url."
  value       = "https://${local.script_name}.${var.workers_subdomain}.workers.dev/heartbeat/${random_password.heartbeat_token.result}"
  sensitive   = true
}
