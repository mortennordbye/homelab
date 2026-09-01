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

      # Address a fixed control plane, never the VIP: patching the node that holds the VIP
      # re-elects it and talosctl blocks forever on the dead socket. Nothing reboots during
      # this step, so a direct node address stays reachable. The health gates in
      # upgrade-talos.tf are the opposite case and do want the VIP.
      talosctl upgrade-k8s \
        --endpoints ${values(local.control_plane_nodes)[0].ip} \
        --nodes ${values(local.control_plane_nodes)[0].ip} \
        --to ${var.kubernetes_version}

      echo "Kubernetes upgraded to ${var.kubernetes_version}, waiting for cluster health..."
      ${local.talos_health_gate}
    EOT
  }

  depends_on = [talos_cluster_kubeconfig.cluster]
}
