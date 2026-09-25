terraform {
  required_version = ">= 1.9.0"

  required_providers {
    restapi = {
      source  = "Mastercard/restapi"
      version = "3.0.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-tfstate-homelab"
    storage_account_name = "sttfstatemvnhomelab"
    container_name       = "tfstate"
    key                  = "proxmox/hyper-cluster/datacenter.tfstate"
  }
}
