#!/bin/bash
# Script de configuracion CORREGIDO para Azure Container Apps
# Usa este en Cloud Shell

set -e

RG="coimpactob-crm-prod"
BACKEND="coimpactob-api-prod"
FRONTEND="coimpactob-web-prod"
FRONTEND_URL="https://coimpactob-web-prod.lemonmushroom-85e2b96f.westus2.azurecontainerapps.io"
BACKEND_URL="https://coimpactob-api-prod.lemonmushroom-85e2b96f.westus2.azurecontainerapps.io"

echo "PASO 1: Configurando variables del backend..."
az containerapp update \
  --name $BACKEND \
  --resource-group $RG \
  --set-env-vars \
    COSMOS_CONNECTION_STRING=secretref:cosmos-connection-string \
    SECRET_KEY=secretref:secret-key \
    DEBUG=False \
    APP_NAME="CoimpactoB CRM API" \
    CORS_ORIGINS="[\"$FRONTEND_URL\"]"

echo "PASO 2: Configurando variables del frontend..."
az containerapp update \
  --name $FRONTEND \
  --resource-group $RG \
  --set-env-vars \
    NEXTAUTH_URL="$FRONTEND_URL" \
    FASTAPI_BACKEND_URL="$BACKEND_URL" \
    NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
    ALLOWED_EMAIL_DOMAIN="coimpactob.com"

echo "PASO 3: Reiniciando backend..."
az containerapp revision restart \
  --name $BACKEND \
  --resource-group $RG

echo ""
echo "========================================"
echo "  CONFIGURACION COMPLETADA"
echo "========================================"
echo ""
echo "URLs:"
echo "  Frontend: $FRONTEND_URL"
echo "  Backend:  $BACKEND_URL"
