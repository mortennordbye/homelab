resource "null_resource" "upgrade_kubernetes" {
  count = var.enable_kubernetes_upgrade ? 1 : 0

  triggers = {
    kubernetes_version = var.kubernetes_version
    talos_complete     = var.enable_talos_upgrade ? null_resource.upgrade_worker_3[0].id : "none"
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig
      export TALOSCONFIG=./talosconfig

      # Written as if/fi rather than `[ ... ] && sleep`, which under `set -e` exits the script
      # with status 1 whenever the condition is false.
      if [ "${var.enable_talos_upgrade}" = "true" ]; then
        echo "Letting the cluster settle after the Talos upgrade..."
        sleep 120
      fi

      talosctl upgrade-k8s \
        --endpoints ${local.kubernetes_endpoint} \
        --nodes ${local.kubernetes_endpoint} \
        --to ${var.kubernetes_version}

      echo "Kubernetes upgraded to ${var.kubernetes_version}, waiting for cluster health..."
      ${local.talos_health_gate}
    EOT
  }

  depends_on = [talos_cluster_kubeconfig.cluster]
}
