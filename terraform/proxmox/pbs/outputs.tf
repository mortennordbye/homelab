output "pve_backup_username" {
  description = "Auth ID the Proxmox VE pbs storage logs in with. Its secret comes from ../BOOTSTRAP.md."
  value       = "pve@pbs!hyper-cluster"
}
