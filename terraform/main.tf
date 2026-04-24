terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
  required_version = ">= 1.0"
}

provider "azurerm" {
  features {}
}

# Variables
variable "resource_group" {
  default = "coimpactob-crm-rg"
}

variable "location" {
  default = "eastus"
}

variable "cosmos_account" {
  default = "coimpactob-cosmos"
}

variable "backend_app" {
  default = "coimpactob-api"
}

variable "frontend_app" {
  default = "coimpactob-web"
}

variable "env_name" {
  default = "coimpactob-env"
}

variable "allowed_domain" {
  default = "coimpactob.com"
}

variable "google_client_id" {
  default = ""
}

variable "google_client_secret" {
  default = ""
  sensitive = true
}

variable "groq_api_key" {
  default = ""
  sensitive = true
}

variable "sendgrid_api_key" {
  default = ""
  sensitive = true
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group
  location = var.location
}

# Cosmos DB Account (MongoDB API, Free Tier)
resource "azurerm_cosmosdb_account" "main" {
  name                = var.cosmos_account
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  offer_type          = "Standard"
  kind                = "MongoDB"

  enable_free_tier = true

  capabilities {
    name = "EnableMongo"
  }

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.main.location
    failover_priority = 0
  }
}

# Container Apps Environment
resource "azurerm_container_app_environment" "main" {
  name                = var.env_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

# Backend Container App
resource "azurerm_container_app" "backend" {
  name                         = var.backend_app
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  ingress {
    external_enabled = true
    target_port      = 8000
    traffic_weight {
      percentage = 100
    }
  }

  secret {
    name  = "cosmos-connection-string"
    value = azurerm_cosmosdb_account.main.primary_mongodb_connection_string
  }

  secret {
    name  = "secret-key"
    value = random_password.backend_secret.result
  }

  dynamic "secret" {
    for_each = var.groq_api_key != "" ? [1] : []
    content {
      name  = "groq-api-key"
      value = var.groq_api_key
    }
  }

  dynamic "secret" {
    for_each = var.sendgrid_api_key != "" ? [1] : []
    content {
      name  = "sendgrid-api-key"
      value = var.sendgrid_api_key
    }
  }

  template {
    container {
      name   = "backend"
      image  = "mcr.microsoft.com/azuredocs/aci-helloworld"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name        = "COSMOS_CONNECTION_STRING"
        secret_name = "cosmos-connection-string"
      }
      env {
        name        = "SECRET_KEY"
        secret_name = "secret-key"
      }
      env {
        name  = "DEBUG"
        value = "False"
      }
      env {
        name  = "APP_NAME"
        value = "CoimpactoB CRM API"
      }
      env {
        name  = "CORS_ORIGINS"
        value = jsonencode(["https://${azurerm_container_app.frontend.ingress[0].fqdn}"])
      }
      dynamic "env" {
        for_each = var.groq_api_key != "" ? [1] : []
        content {
          name        = "GROQ_API_KEY"
          secret_name = "groq-api-key"
        }
      }
      dynamic "env" {
        for_each = var.sendgrid_api_key != "" ? [1] : []
        content {
          name        = "SENDGRID_API_KEY"
          secret_name = "sendgrid-api-key"
        }
      }
    }

    min_replicas = 1
    max_replicas = 1
  }
}

# Frontend Container App
resource "azurerm_container_app" "frontend" {
  name                         = var.frontend_app
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  ingress {
    external_enabled = true
    target_port      = 3000
    traffic_weight {
      percentage = 100
    }
  }

  template {
    container {
      name   = "frontend"
      image  = "mcr.microsoft.com/azuredocs/aci-helloworld"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NEXTAUTH_URL"
        value = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
      }
      env {
        name  = "FASTAPI_BACKEND_URL"
        value = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
      }
      env {
        name  = "NEXTAUTH_SECRET"
        value = random_password.nextauth_secret.result
      }
      env {
        name  = "ALLOWED_EMAIL_DOMAIN"
        value = var.allowed_domain
      }
      dynamic "env" {
        for_each = var.google_client_id != "" ? [1] : []
        content {
          name  = "GOOGLE_CLIENT_ID"
          value = var.google_client_id
        }
      }
      dynamic "env" {
        for_each = var.google_client_secret != "" ? [1] : []
        content {
          name  = "GOOGLE_CLIENT_SECRET"
          value = var.google_client_secret
        }
      }
    }

    min_replicas = 0
    max_replicas = 1
  }
}

# Random secrets
resource "random_password" "nextauth_secret" {
  length  = 32
  special = false
}

resource "random_password" "backend_secret" {
  length  = 32
  special = false
}

# Outputs
output "backend_url" {
  value = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
}

output "frontend_url" {
  value = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
}

output "cosmos_connection_string" {
  value     = azurerm_cosmosdb_account.main.primary_mongodb_connection_string
  sensitive = true
}
