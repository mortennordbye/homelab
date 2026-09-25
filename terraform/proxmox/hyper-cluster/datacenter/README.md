# Proxmox: datacenter

Proxmox itself for hyper-cluster: the Datacenter level (notifications, backup
jobs, storage, permissions) and the node level (hyper1-3: DNS, time, hosts,
network, apt), which sit under Datacenter in the console tree. Never guests:
each VM lives in the stack that owns it (`../k8s/talos`, `../tailscale`).

Today this is notifications: a webhook target `alertmanager` and a matcher
`alertmanager-errors` that sends every error-severity notification (failed
backups first) to Alertmanager, which routes `namespace="proxmox"` to Discord.
The built-in `mail-to-root` target and `default-matcher` stay as they are.

## Use

```bash
cp terraform.tfvars.example terraform.tfvars   # same token as ../k8s/talos
terraform init
terraform plan
terraform apply
```

The token needs `Mapping.Modify` on `/mapping/notification` to write the
notification config.
