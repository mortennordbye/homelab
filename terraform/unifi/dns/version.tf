terraform {
  required_version = ">= 1.9.0"

  required_providers {
    unifi = {
      source  = "ubiquiti-community/unifi"
      version = "~> 0.55"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-tfstate-homelab"
    storage_account_name = "sttfstatemvnhomelab"
    container_name       = "tfstate"
    key                  = "unifi/dns.tfstate"
  }
}
