terraform {
  required_version = ">= 1.9.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.23"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-tfstate-homelab"
    storage_account_name = "sttfstatemvnhomelab"
    container_name       = "tfstate"
    key                  = "cloudflare/watchdog.tfstate"
  }
}
