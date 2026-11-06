terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.0"
    }
  }

  # Stage 1: Use local backend to bootstrap Azure storage resources
  #backend "local" {
  #  path = "terraform.tfstate"
  #}

  # Stage 2: After the storage resources exist, comment out the 'local' backend above.
  # Uncomment this block, then run: terraform init -migrate-state -backend-config=backend.conf
  backend "azurerm" {}
}
