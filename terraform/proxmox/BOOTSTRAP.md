# Proxmox bootstrap

The one manual step for the Proxmox side of the homelab: create the API tokens
Terraform logs in with. Everything else, on both Proxmox VE and Proxmox Backup
Server, is Terraform from here on.

Run each block once, as root, then put the printed secret in the listed
`terraform.tfvars` (gitignored). Recreating a token means re-running only its
block.

| Stack | Manages | Logs in as |
|---|---|---|
| `hyper-cluster/datacenter` | Proxmox VE itself: Datacenter and node level | `terraform-prov@pve!token` |
| `hyper-cluster/k8s/talos`, `hyper-cluster/tailscale` | their VMs | `terraform-prov@pve!token` |
| `pbs` | Proxmox Backup Server | `terraform@pbs!terraform` |

## 1. Proxmox VE

In the shell of any node (Datacenter → hyper1 → Shell):

```bash
pveum role add TerraformProv --privs "Datastore.Allocate,Datastore.AllocateSpace,Datastore.AllocateTemplate,Datastore.Audit,Group.Allocate,Mapping.Audit,Mapping.Modify,Mapping.Use,Permissions.Modify,Pool.Allocate,Pool.Audit,Realm.Allocate,Realm.AllocateUser,SDN.Allocate,SDN.Audit,SDN.Use,Sys.AccessNetwork,Sys.Audit,Sys.Console,Sys.Incoming,Sys.Modify,Sys.PowerMgmt,Sys.Syslog,User.Modify,VM.Allocate,VM.Audit,VM.Backup,VM.Clone,VM.Config.CDROM,VM.Config.CPU,VM.Config.Cloudinit,VM.Config.Disk,VM.Config.HWType,VM.Config.Memory,VM.Config.Network,VM.Config.Options,VM.Console,VM.GuestAgent.Audit,VM.GuestAgent.FileRead,VM.GuestAgent.FileSystemMgmt,VM.GuestAgent.FileWrite,VM.GuestAgent.Unrestricted,VM.Migrate,VM.PowerMgmt,VM.Replicate,VM.Snapshot,VM.Snapshot.Rollback"
pveum user add terraform-prov@pve --comment "Terraform (terraform/proxmox)"
pveum acl modify / --users terraform-prov@pve --roles TerraformProv
pveum user token add terraform-prov@pve token --privsep 0
```

The last command prints the secret once. In `hyper-cluster/datacenter`,
`hyper-cluster/k8s/talos` and `hyper-cluster/tailscale`:

```hcl
proxmox_api_token = "terraform-prov@pve!token=<secret>"
```

`terraform-prov@pve` stays out of Terraform on purpose: a bad apply could
remove the access every stack runs with.

## 2. Proxmox Backup Server

In the PBS shell (pbs → Shell):

```bash
proxmox-backup-manager user create terraform@pbs --comment "Terraform (terraform/proxmox/pbs)"
proxmox-backup-manager acl update / Admin --auth-id terraform@pbs
proxmox-backup-manager user generate-token terraform@pbs terraform
proxmox-backup-manager acl update / Admin --auth-id 'terraform@pbs!terraform'
```

A PBS token only gets what both it and its user are granted, hence the two
ACLs. `generate-token` prints the secret once. In `pbs/terraform.tfvars`:

```hcl
pbs_api_token = "terraform@pbs!terraform:<secret>"
```

PBS separates user and secret with `:`, Proxmox VE with `=`.

## 3. Apply order

1. `pbs`: creates `pve@pbs!hyper-cluster`, the identity Proxmox VE backs up
   as, and publishes its secret in this stack's state.
2. Only when adopting an existing datastore: hand the backup groups over to
   that identity (below). PBS refuses a backup into a group owned by anyone
   else, so skipping this breaks every backup of an existing VM.
3. `hyper-cluster/datacenter`: points the `pbs` storage at that identity,
   reading the secret from the `pbs` state.

### One-time owner handover

In the PBS shell, with the token secret from step 2 and the VM IDs that are
still backed up:

```bash
TOKEN='terraform@pbs!terraform:<secret>'
for id in 131 132 133 134 135 136 140; do
  curl -sk -X POST "https://localhost:8007/api2/json/admin/datastore/Synology/change-owner" \
    -H "Authorization: PBSAPIToken=$TOKEN" \
    -d backup-type=vm -d backup-id=$id --data-urlencode 'new-owner=pve@pbs!hyper-cluster' \
    && echo " vm/$id"
done
```

A fresh datastore has no groups, so a rebuild from scratch skips this.
