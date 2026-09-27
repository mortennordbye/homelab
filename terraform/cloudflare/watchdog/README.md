# Cloudflare: watchdog

A Worker on `watchdog.bigd.no` that watches the homelab from outside: it alerts
Discord when Alertmanager's heartbeat stops and when a public site fails from the
internet. Terraform writes the heartbeat URL to Bitwarden as
`alertmanager-heartbeat-url`.

## Use

State is in the shared azurerm backend under `cloudflare/watchdog.tfstate`.

```bash
cp terraform.tfvars.example terraform.tfvars   # token and account id
export BW_ACCESS_TOKEN=$(security find-generic-password -s bws-homelab -w)
export BW_ORGANIZATION_ID=$(BWS_ACCESS_TOKEN=$BW_ACCESS_TOKEN bws project get 1ea61322-5f4a-44a4-b4d0-b29b00ba1134 --output json | jq -r .organizationId)
terraform init
terraform plan
terraform apply
```

`terraform.tfvars` needs `account_id` and `cloudflare_api_token` with
account-level Workers Scripts:Edit and Workers KV Storage:Edit, plus Zone:Read
and Workers Routes:Edit on bigd.no. The Worker code is `worker.js`; the checked
sites are `var.sites`.

`terraform output heartbeat_secret_id` is the id the Alertmanager ExternalSecret
reads (`k8s/talos/infra/kube-prometheus-stack/alertmanager-heartbeat-secret.yaml`).

Docs: [`docs/platform/observability/README.md`](../../../docs/platform/observability/README.md#alert-path)
for what it alerts on,
[`docs/platform/network/cloudflare.md`](../../../docs/platform/network/cloudflare.md#watchdog-worker)
for operating notes.
