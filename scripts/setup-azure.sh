#!/bin/bash
# CoimpactoB CRM — Azure Auto-Setup Script (Bash)
# ================================================
# Ejecuta este script en Azure Cloud Shell o en tu terminal con Azure CLI.
#
# Uso:
#   chmod +x setup-azure.sh
#   ./setup-azure.sh
#
# Prerrequisitos:
#   - Azure CLI instalado
#   - Sesión activa (az login)

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables por defecto
RESOURCE_GROUP="${RESOURCE_GROUP:-coimpactob-crm-rg}"
LOCATION="${LOCATION:-eastus}"
COSMOS_ACCOUNT="${COSMOS_ACCOUNT:-coimpactob-cosmos}"
BACKEND_APP="${BACKEND_APP:-coimpactob-api}"
FRONTEND_APP="${FRONTEND_APP:-coimpactob-web}"
ENV_NAME="${ENV_NAME:-coimpactob-env}"
ALLOWED_DOMAIN="${ALLOWED_DOMAIN:-coimpactob.com}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CoimpactoB CRM — Azure Auto-Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Este script creará automáticamente:"
echo "  - Resource Group"
echo "  - Cosmos DB for MongoDB (Free Tier)"
echo "  - Container Apps Environment"
echo "  - Backend Container App (FastAPI)"
echo "  - Frontend Container App (Next.js)"
echo ""
echo -e "${YELLOW}Costo estimado: ~$10-15/mes${NC}"
echo ""

# Verificar Azure CLI
if ! command -v az &> /dev/null; then
    echo -e "${RED}Azure CLI no encontrado. Instálalo desde: https://aka.ms/installazurecli${NC}"
    exit 1
fi

echo -e "${BLUE}Paso 1/8: Verificando login en Azure...${NC}"
ACCOUNT=$(az account show --query "name" -o tsv 2>/dev/null || true)
if [ -z "$ACCOUNT" ]; then
    az login
else
    echo -e "${GREEN}Ya estás logueado como: $ACCOUNT${NC}"
fi

echo ""
echo -e "${BLUE}Paso 2/8: Configuración de variables sensibles${NC}"
echo -e "${YELLOW}Deja en blanco si aún no tienes alguna. Las configuras después en el portal.${NC}"
echo ""

read -p "GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
read -s -p "GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
echo ""
read -s -p "GROQ_API_KEY (opcional): " GROQ_API_KEY
echo ""
read -s -p "SENDGRID_API_KEY (opcional): " SENDGRID_API_KEY
echo ""

# Generar secretos
NEXTAUTH_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-z0-9' | head -c 32)
BACKEND_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-z0-9' | head -c 32)

echo ""
echo -e "${BLUE}Paso 3/8: Creando Resource Group '$RESOURCE_GROUP'...${NC}"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --query "properties.provisioningState" -o tsv > /dev/null
echo -e "${GREEN}Resource Group creado.${NC}"

echo ""
echo -e "${BLUE}Paso 4/8: Creando Cosmos DB for MongoDB (Free Tier)...${NC}"
echo -e "${YELLOW}  Esto puede tomar 3-5 minutos...${NC}"

az cosmosdb create \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --locations regionName="$LOCATION" failoverPriority=0 \
    --kind MongoDB \
    --server-version 4.2 \
    --enable-free-tier true \
    --default-consistency-level Session \
    --query "provisioningState" -o tsv > /dev/null

COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --type connection-strings \
    --query "connectionStrings[0].connectionString" -o tsv)

echo -e "${GREEN}Cosmos DB creado.${NC}"

echo ""
echo -e "${BLUE}Paso 5/8: Creando Container Apps Environment...${NC}"
az containerapp env create \
    --name "$ENV_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --query "properties.provisioningState" -o tsv > /dev/null
echo -e "${GREEN}Container Apps Environment creado.${NC}"

echo ""
echo -e "${BLUE}Paso 6/8: Creando Backend Container App...${NC}"

BACKEND_CORS="[\"https://$FRONTEND_APP.$LOCATION.azurecontainerapps.io\"]"

az containerapp create \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$ENV_NAME" \
    --image mcr.microsoft.com/azuredocs/aci-helloworld \
    --target-port 8000 \
    --ingress external \
    --min-replicas 1 \
    --max-replicas 1 \
    --query "properties.configuration.ingress.fqdn" -o tsv > /dev/null

# Configurar secretos del backend
BACKEND_SECRETS=("cosmos-connection-string=$COSMOS_CONNECTION_STRING" "secret-key=$BACKEND_SECRET")
[ -n "$GROQ_API_KEY" ] && BACKEND_SECRETS+=("groq-api-key=$GROQ_API_KEY")
[ -n "$SENDGRID_API_KEY" ] && BACKEND_SECRETS+=("sendgrid-api-key=$SENDGRID_API_KEY")

az containerapp secret set \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --secrets "${BACKEND_SECRETS[@]}"

# Configurar variables de entorno del backend
BACKEND_ENVS=(
    "COSMOS_CONNECTION_STRING=secretref:cosmos-connection-string"
    "SECRET_KEY=secretref:secret-key"
    "DEBUG=False"
    "APP_NAME=CoimpactoB CRM API"
    "CORS_ORIGINS=$BACKEND_CORS"
)
[ -n "$GROQ_API_KEY" ] && BACKEND_ENVS+=("GROQ_API_KEY=secretref:groq-api-key")
[ -n "$SENDGRID_API_KEY" ] && BACKEND_ENVS+=("SENDGRID_API_KEY=secretref:sendgrid-api-key")

az containerapp env var set \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --environment-variables "${BACKEND_ENVS[@]}"

BACKEND_FQDN=$(az containerapp show \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.configuration.ingress.fqdn" -o tsv)

echo -e "${GREEN}Backend creado: https://$BACKEND_FQDN${NC}"

echo ""
echo -e "${BLUE}Paso 7/8: Creando Frontend Container App...${NC}"

az containerapp create \
    --name "$FRONTEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$ENV_NAME" \
    --image mcr.microsoft.com/azuredocs/aci-helloworld \
    --target-port 3000 \
    --ingress external \
    --min-replicas 0 \
    --max-replicas 1 \
    --query "properties.configuration.ingress.fqdn" -o tsv > /dev/null

# Configurar variables del frontend
FRONTEND_ENVS=(
    "NEXTAUTH_URL=https://$FRONTEND_APP.$LOCATION.azurecontainerapps.io"
    "FASTAPI_BACKEND_URL=https://$BACKEND_FQDN"
    "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
    "ALLOWED_EMAIL_DOMAIN=$ALLOWED_DOMAIN"
)
[ -n "$GOOGLE_CLIENT_ID" ] && FRONTEND_ENVS+=("GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID")
[ -n "$GOOGLE_CLIENT_SECRET" ] && FRONTEND_ENVS+=("GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET")

az containerapp env var set \
    --name "$FRONTEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --environment-variables "${FRONTEND_ENVS[@]}"

FRONTEND_FQDN=$(az containerapp show \
    --name "$FRONTEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.configuration.ingress.fqdn" -o tsv)

echo -e "${GREEN}Frontend creado: https://$FRONTEND_FQDN${NC}"

echo ""
echo -e "${BLUE}Paso 8/8: Generando archivo de configuración...${NC}"

SUBSCRIPTION_ID=$(az account show --query id -o tsv)

cat > github-secrets.txt <<EOF
# Guarda estos secretos en tu repo de GitHub:
# Settings -> Secrets and variables -> Actions -> New repository secret

AZURE_CREDENTIALS          = <Ejecuta: az ad sp create-for-rbac --role Contributor --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP>
AZURE_RESOURCE_GROUP       = $RESOURCE_GROUP
AZURE_BACKEND_APP_NAME     = $BACKEND_APP
AZURE_FRONTEND_APP_NAME    = $FRONTEND_APP
EOF

echo -e "${GREEN}Archivo 'github-secrets.txt' generado.${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SETUP COMPLETADO${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "URLs de tu infraestructura:"
echo -e "  Backend API:  ${GREEN}https://$BACKEND_FQDN${NC}"
echo -e "  Frontend Web: ${GREEN}https://$FRONTEND_FQDN${NC}"
echo -e "  Cosmos DB:    ${GREEN}$COSMOS_ACCOUNT${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo "  1. Configura los secretos de GitHub Actions (ver github-secrets.txt)"
echo "  2. Actualiza la URI de redirección de Google OAuth:"
echo "     https://$FRONTEND_FQDN/api/auth/callback/google"
echo "  3. Haz push a main: git push origin main"
echo "  4. GitHub Actions desplegará automáticamente tu código"
echo ""
echo "Para ver logs: az containerapp logs show --name $BACKEND_APP --resource-group $RESOURCE_GROUP"
echo -e "${RED}Para eliminar todo: az group delete --name $RESOURCE_GROUP --yes${NC}"
echo ""
