# Sequential upgrade: ctrl-1 → ctrl-2 → ctrl-3 → worker-1 → worker-2 → worker-3
#
# Each node is its own resource so a failure part way through is resumable. Terraform records
# which nodes completed and a re-apply picks up from the failed one rather than re-upgrading
# nodes that already succeeded.

locals {
  talos_upgrade_endpoints = join(",", [for n in local.control_plane_nodes : n.ip])
  talos_installer_image   = "factory.talos.dev/installer/${talos_image_factory_schematic.this.id}:${var.talos_version}"

  # Health gate run between nodes. Addresses the VIP rather than a fixed node so it keeps working
  # while the node that previously held the VIP is rebooting. Replaces a blind `sleep`, which
  # returned 0 unconditionally and so masked a failed upgrade from Terraform.
  talos_health_gate = <<-EOT
    talosctl --talosconfig=./talosconfig health \
      --endpoints ${local.kubernetes_endpoint} \
      --nodes ${local.kubernetes_endpoint} \
      --wait-timeout 15m
  EOT
}

resource "null_resource" "upgrade_ctrl_1" {
  count = var.enable_talos_upgrade ? 1 : 0

  triggers = {
    talos_version = var.talos_version
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      echo "Upgrading control plane 1 to Talos ${var.talos_version}..."
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig

      talosctl --talosconfig=./talosconfig upgrade \
        --endpoints ${local.talos_upgrade_endpoints} \
        --nodes ${values(local.control_plane_nodes)[0].ip} \
        --image ${local.talos_installer_image} \
        --preserve --wait

      echo "Control plane 1 upgraded, waiting for cluster health..."
      ${local.talos_health_gate}
    EOT
  }

  depends_on = [talos_cluster_kubeconfig.cluster]
}

resource "null_resource" "upgrade_ctrl_2" {
  count = var.enable_talos_upgrade ? 1 : 0

  triggers = {
    talos_version = var.talos_version
    prev_complete = null_resource.upgrade_ctrl_1[0].id
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      echo "Upgrading control plane 2 to Talos ${var.talos_version}..."
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig

      talosctl --talosconfig=./talosconfig upgrade \
        --endpoints ${local.talos_upgrade_endpoints} \
        --nodes ${values(local.control_plane_nodes)[1].ip} \
        --image ${local.talos_installer_image} \
        --preserve --wait

      echo "Control plane 2 upgraded, waiting for cluster health..."
      ${local.talos_health_gate}
    EOT
  }

  depends_on = [null_resource.upgrade_ctrl_1]
}

resource "null_resource" "upgrade_ctrl_3" {
  count = var.enable_talos_upgrade ? 1 : 0

  triggers = {
    talos_version = var.talos_version
    prev_complete = null_resource.upgrade_ctrl_2[0].id
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      echo "Upgrading control plane 3 to Talos ${var.talos_version}..."
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig

      talosctl --talosconfig=./talosconfig upgrade \
        --endpoints ${local.talos_upgrade_endpoints} \
        --nodes ${values(local.control_plane_nodes)[2].ip} \
        --image ${local.talos_installer_image} \
        --preserve --wait

      echo "Control plane 3 upgraded, waiting for cluster health..."
      ${local.talos_health_gate}
    EOT
  }

  depends_on = [null_resource.upgrade_ctrl_2]
}

resource "null_resource" "upgrade_worker_1" {
  count = var.enable_talos_upgrade ? 1 : 0

  triggers = {
    talos_version = var.talos_version
    prev_complete = null_resource.upgrade_ctrl_3[0].id
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      echo "Upgrading worker 1 to Talos ${var.talos_version}..."
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig

      talosctl --talosconfig=./talosconfig upgrade \
        --endpoints ${local.talos_upgrade_endpoints} \
        --nodes ${values(local.worker_nodes)[0].ip} \
        --image ${local.talos_installer_image} \
        --preserve --wait

      echo "Worker 1 upgraded, waiting for cluster health..."
      ${local.talos_health_gate}
    EOT
  }

  depends_on = [null_resource.upgrade_ctrl_3]
}

resource "null_resource" "upgrade_worker_2" {
  count = var.enable_talos_upgrade ? 1 : 0

  triggers = {
    talos_version = var.talos_version
    prev_complete = null_resource.upgrade_worker_1[0].id
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      echo "Upgrading worker 2 to Talos ${var.talos_version}..."
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig

      talosctl --talosconfig=./talosconfig upgrade \
        --endpoints ${local.talos_upgrade_endpoints} \
        --nodes ${values(local.worker_nodes)[1].ip} \
        --image ${local.talos_installer_image} \
        --preserve --wait

      echo "Worker 2 upgraded, waiting for cluster health..."
      ${local.talos_health_gate}
    EOT
  }

  depends_on = [null_resource.upgrade_worker_1]
}

resource "null_resource" "upgrade_worker_3" {
  count = var.enable_talos_upgrade ? 1 : 0

  triggers = {
    talos_version = var.talos_version
    prev_complete = null_resource.upgrade_worker_2[0].id
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      echo "Upgrading worker 3 to Talos ${var.talos_version}..."
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig

      talosctl --talosconfig=./talosconfig upgrade \
        --endpoints ${local.talos_upgrade_endpoints} \
        --nodes ${values(local.worker_nodes)[2].ip} \
        --image ${local.talos_installer_image} \
        --preserve --wait

      echo "Worker 3 upgraded, waiting for cluster health..."
      ${local.talos_health_gate}
    EOT
  }

  depends_on = [null_resource.upgrade_worker_2]
}
