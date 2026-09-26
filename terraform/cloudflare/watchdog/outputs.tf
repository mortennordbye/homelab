output "heartbeat_secret_id" {
  description = "Bitwarden id of alertmanager-heartbeat-url, for the ExternalSecret's remoteRef.key"
  value       = bitwarden-secrets_secret.heartbeat_url.id
}
