# CPU temperatures and NVMe health for Prometheus: the Proxmox API has neither, so
# each host runs node-exporter (hwmon collector) on :9100, plus the collectors
# package's nvme and smartmon timers writing to its textfile directory. Scraped by
# k8s/talos/infra/pve-exporter.
# Runs once per host; bump the trigger to reinstall.
resource "terraform_data" "node_exporter" {
  for_each = local.nodes

  triggers_replace = ["prometheus-node-exporter lm-sensors prometheus-node-exporter-collectors nvme-cli"]

  connection {
    type     = "ssh"
    host     = "${each.key}.local.bigd.no"
    user     = var.ssh_user
    password = var.ssh_password
  }

  provisioner "remote-exec" {
    inline = [
      "apt-get update -q",
      "DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends prometheus-node-exporter lm-sensors prometheus-node-exporter-collectors nvme-cli smartmontools",
      "systemctl enable --now prometheus-node-exporter prometheus-node-exporter-nvme.timer prometheus-node-exporter-smartmon.timer",
    ]
  }

  depends_on = [proxmox_apt_standard_repository.no_subscription]
}
