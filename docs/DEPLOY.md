# Deploy a Azure

## Prerequisitos

- Cuenta Azure (con subscription activa)
- GitHub account
- Docker instalado
- Azure CLI instalado

## 1. Crear recursos en Azure

### Opción A: Usando Azure CLI (recomendado)

```bash
# Variables
export RESOURCE_GROUP="coimpactob-crm-prod"
export LOCATION="eastus"
export APP_NAME="coimpactob-crm-api"

# Login
az login

# Crear resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Crear App Service Plan
az appservice plan create \
  --name "$APP_NAME-plan" \
  --resource-group $RESOURCE_GROUP \
  --sku B2 \
  --is-linux

# Crear Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan "$APP_NAME-plan" \
  --name $APP_NAME \
  --runtime "PYTHON|3.11"
```

## 2. Configurar GitHub Actions

Crear archivo: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy
        uses: azure/webapps-deploy@v2
        with:
          app-name: coimpactob-crm-api
          images: YOUR_REGISTRY/coimpactob-crm:${{ github.sha }}
```

## 3. Configurar secretos en GitHub

En GitHub Settings > Secrets:

- `AZURE_CREDENTIALS` - Output de: `az ad sp create-for-rbac`
- `COSMOS_CONNECTION_STRING` - Connection string de Cosmos DB
- `GROQ_API_KEY` - Tu API key de Groq
- `SENDGRID_API_KEY` - Tu API key de SendGrid (opcional)

## 4. Deploy

```bash
git push origin main
```

GitHub Actions automáticamente:
1. Ejecuta tests
2. Build Docker image
3. Deploy a Azure
