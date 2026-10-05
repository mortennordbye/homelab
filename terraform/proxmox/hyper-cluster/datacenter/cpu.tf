locals {
  # Proxmox boots on the performance governor, which holds the T-series CPUs at
  # turbo under light load and keeps the fans loud. EPP needs powersave first.
  cpu_powersave_unit = <<-EOT
    [Unit]
    Description=CPU powersave governor with balance_power EPP

    [Service]
    Type=oneshot
    ExecStart=/bin/sh -c 'for c in /sys/devices/system/cpu/cpu[0-9]*/cpufreq; do echo powersave > $c/scaling_governor; echo balance_power > $c/energy_performance_preference; done'

    [Install]
    WantedBy=multi-user.target
  EOT
}

resource "terraform_data" "cpu_powersave" {
  for_each = local.nodes

  triggers_replace = [sha256(local.cpu_powersave_unit)]

  connection {
    type     = "ssh"
    host     = "${each.key}.local.bigd.no"
    user     = var.ssh_user
    password = var.ssh_password
  }

  provisioner "file" {
    content     = local.cpu_powersave_unit
    destination = "/etc/systemd/system/cpu-powersave.service"
  }

  provisioner "remote-exec" {
    inline = [
      "systemctl daemon-reload",
      "systemctl enable cpu-powersave.service",
      "systemctl restart cpu-powersave.service",
    ]
  }
}
