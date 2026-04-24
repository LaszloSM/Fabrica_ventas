# CoimpactoB CRM - Azure Auto-Setup Script (PowerShell)
# =====================================================
# Este script crea TODA la infraestructura en Azure de forma automatica.
# Solo necesitas tener Azure CLI instalado y ejecutar este script.
#
# Uso:
#   .\setup-azure.ps1 -ResourceGroup "mi-grupo" -Location "eastus"
#
# O interactivo (sin parametros):
#   .\setup-azure.ps1
#
# Prerrequisitos:
#   - Azure CLI: https://aka.ms/installazurecliwindows
#   - GitHub repo ya creado con el codigo

param(
    [string]$ResourceGroup = "coimpactob-crm-rg",
    [string]$Location = "eastus",
    [string]$CosmosAccount = "coimpactob-cosmos",
    [string]$BackendApp = "coimpactob-api",
    [string]$FrontendApp = "coimpactob-web",
    [string]$EnvName = "coimpactob-env",
    [string]$AllowedDomain = "coimpactob.com"
)

function Test-AzCli {
    try {
        $version = az --version 2>$null | Select-String "azure-cli" | Select-Object -First 1
        if ($version) {
            Write-Host "Azure CLI encontrado: $version" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "" -NoNewline
    }
    Write-Host "Azure CLI no encontrado. Instala desde: https://aka.ms/installazurecliwindows" -ForegroundColor Red
    return $false
}

function Show-Header {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  CoimpactoB CRM - Azure Auto-Setup" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Este script creara automaticamente:"
    Write-Host "  - Resource Group"
    Write-Host "  - Cosmos DB for MongoDB (Free Tier)"
    Write-Host "  - Container Apps Environment"
    Write-Host "  - Backend Container App (FastAPI)"
    Write-Host "  - Frontend Container App (Next.js)"
    Write-Host ""
    Write-Host "Costo estimado: ~$10-15/mes (backend siempre encendido para automatizaciones)" -ForegroundColor Yellow
    Write-Host ""
}

function Get-SecureInput {
    param([string]$Prompt)
    $secure = Read-Host -Prompt $Prompt -AsSecureString
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

# =====================================================
# INICIO DEL SCRIPT
# =====================================================

Show-Header

if (-not (Test-AzCli)) {
    exit 1
}

Write-Host "Paso 1/8: Login en Azure..." -ForegroundColor Blue
$account = az account show --query "name" -o tsv 2>$null
if (-not $account) {
    az login
} else {
    Write-Host "Ya estas logueado como: $account" -ForegroundColor Green
}

Write-Host ""
Write-Host "Paso 2/8: Configuracion de variables sensibles" -ForegroundColor Blue
Write-Host "Necesitaras los siguientes valores. Si aun no los tienes, deja en blanco y configuralos despues en el Azure Portal." -ForegroundColor Yellow
Write-Host ""

$googleClientId     = Read-Host "GOOGLE_CLIENT_ID"
$googleClientSecret = Get-SecureInput "GOOGLE_CLIENT_SECRET"
$groqApiKey         = Get-SecureInput "GROQ_API_KEY (deja en blanco si aun no lo tienes)"
$sendgridApiKey     = Get-SecureInput "SENDGRID_API_KEY (deja en blanco si aun no lo tienes)"

$nextauthSecret = -join ((48..57) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$backendSecret  = -join ((48..57) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

Write-Host ""
Write-Host "Paso 3/8: Creando Resource Group '$ResourceGroup' en '$Location'..." -ForegroundColor Blue
az group create --name $ResourceGroup --location $Location --query "properties.provisioningState" -o tsv | Out-Null
Write-Host "Resource Group creado." -ForegroundColor Green

Write-Host ""
Write-Host "Paso 4/8: Creando Cosmos DB for MongoDB (Free Tier)..." -ForegroundColor Blue
Write-Host "  Esto puede tomar 3-5 minutos..." -ForegroundColor Gray

az cosmosdb create `
    --name $CosmosAccount `
    --resource-group $ResourceGroup `
    --locations regionName=$Location failoverPriority=0 `
    --kind MongoDB `
    --server-version 4.2 `
    --enable-free-tier true `
    --default-consistency-level Session `
    --query "provisioningState" -o tsv | Out-Null

$cosmosConnectionString = az cosmosdb keys list `
    --name $CosmosAccount `
    --resource-group $ResourceGroup `
    --type connection-strings `
    --query "connectionStrings[0].connectionString" -o tsv

Write-Host "Cosmos DB creado." -ForegroundColor Green

Write-Host ""
Write-Host "Paso 5/8: Creando Container Apps Environment..." -ForegroundColor Blue
az containerapp env create `
    --name $EnvName `
    --resource-group $ResourceGroup `
    --location $Location `
    --query "properties.provisioningState" -o tsv | Out-Null
Write-Host "Container Apps Environment creado." -ForegroundColor Green

Write-Host ""
Write-Host "Paso 6/8: Creando Backend Container App..." -ForegroundColor Blue

$backendCors = '["https://' + $FrontendApp + '.' + $Location + '.azurecontainerapps.io"]'

az containerapp create `
    --name $BackendApp `
    --resource-group $ResourceGroup `
    --environment $EnvName `
    --image mcr.microsoft.com/azuredocs/aci-helloworld `
    --target-port 8000 `
    --ingress external `
    --min-replicas 1 `
    --max-replicas 1 `
    --query "properties.configuration.ingress.fqdn" -o tsv | Out-Null

# Configurar secretos del backend
$backendSecrets = @()
if ($cosmosConnectionString) { $backendSecrets += "cosmos-connection-string=$cosmosConnectionString" }
if ($groqApiKey) { $backendSecrets += "groq-api-key=$groqApiKey" }
if ($sendgridApiKey) { $backendSecrets += "sendgrid-api-key=$sendgridApiKey" }
$backendSecrets += "secret-key=$backendSecret"

if ($backendSecrets.Count -gt 0) {
    $secretArgs = $backendSecrets -join " "
    $secretArray = @($secretArgs.Split(" "))
    az containerapp secret set `
        --name $BackendApp `
        --resource-group $ResourceGroup `
        --secrets @secretArray
}

# Configurar variables de entorno del backend
$backendEnvVars = @(
    "COSMOS_CONNECTION_STRING=secretref:cosmos-connection-string"
    "SECRET_KEY=secretref:secret-key"
    "DEBUG=False"
    "APP_NAME=CoimpactoB CRM API"
    "CORS_ORIGINS=$backendCors"
)
if ($groqApiKey) { $backendEnvVars += "GROQ_API_KEY=secretref:groq-api-key" }
if ($sendgridApiKey) { $backendEnvVars += "SENDGRID_API_KEY=secretref:sendgrid-api-key" }

$envArgs = $backendEnvVars -join " "
$envArray = @($envArgs.Split(" "))
az containerapp env var set `
    --name $BackendApp `
    --resource-group $ResourceGroup `
    --environment-variables @envArray

$backendFqdn = az containerapp show `
    --name $BackendApp `
    --resource-group $ResourceGroup `
    --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "Backend creado: https://$backendFqdn" -ForegroundColor Green

Write-Host ""
Write-Host "Paso 7/8: Creando Frontend Container App..." -ForegroundColor Blue

az containerapp create `
    --name $FrontendApp `
    --resource-group $ResourceGroup `
    --environment $EnvName `
    --image mcr.microsoft.com/azuredocs/aci-helloworld `
    --target-port 3000 `
    --ingress external `
    --min-replicas 0 `
    --max-replicas 1 `
    --query "properties.configuration.ingress.fqdn" -o tsv | Out-Null

# Configurar variables del frontend
$frontendEnvVars = @(
    "NEXTAUTH_URL=https://$FrontendApp.$Location.azurecontainerapps.io"
    "FASTAPI_BACKEND_URL=https://$backendFqdn"
    "NEXTAUTH_SECRET=$nextauthSecret"
    "ALLOWED_EMAIL_DOMAIN=$AllowedDomain"
)
if ($googleClientId) { $frontendEnvVars += "GOOGLE_CLIENT_ID=$googleClientId" }
if ($googleClientSecret) { $frontendEnvVars += "GOOGLE_CLIENT_SECRET=$googleClientSecret" }

$feEnvArgs = $frontendEnvVars -join " "
$feEnvArray = @($feEnvArgs.Split(" "))
az containerapp env var set `
    --name $FrontendApp `
    --resource-group $ResourceGroup `
    --environment-variables @feEnvArray

$frontendFqdn = az containerapp show `
    --name $FrontendApp `
    --resource-group $ResourceGroup `
    --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "Frontend creado: https://$frontendFqdn" -ForegroundColor Green

Write-Host ""
Write-Host "Paso 8/8: Generando archivo de configuracion para GitHub Actions..." -ForegroundColor Blue

$subId = az account show --query "id" -o tsv

$lines = @(
    "# Guarda estos secretos en tu repo de GitHub:"
    "# Settings -> Secrets and variables -> Actions -> New repository secret"
    ""
    "AZURE_CREDENTIALS          = (Ejecuta: az ad sp create-for-rbac --role Contributor --scopes /subscriptions/$subId/resourceGroups/$ResourceGroup)"
    "AZURE_RESOURCE_GROUP       = $ResourceGroup"
    "AZURE_BACKEND_APP_NAME     = $BackendApp"
    "AZURE_FRONTEND_APP_NAME    = $FrontendApp"
)

$lines | Out-File -FilePath "github-secrets.txt" -Encoding UTF8

Write-Host "Archivo 'github-secrets.txt' generado." -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs de tu infraestructura:" -ForegroundColor White
Write-Host "  Backend API:  https://$backendFqdn" -ForegroundColor Green
Write-Host "  Frontend Web: https://$frontendFqdn" -ForegroundColor Green
Write-Host "  Cosmos DB:    $CosmosAccount" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Configura los secretos de GitHub Actions (ver github-secrets.txt)"
Write-Host "  2. Actualiza la URI de redireccion de Google OAuth:"
Write-Host "     https://$frontendFqdn/api/auth/callback/google"
Write-Host "  3. Haz push a main: git push origin main"
Write-Host "  4. GitHub Actions desplegara automaticamente tu codigo"
Write-Host ""
Write-Host "Para ver logs: az containerapp logs show --name $BackendApp --resource-group $ResourceGroup"
Write-Host "Para eliminar todo: az group delete --name $ResourceGroup --yes" -ForegroundColor Red
Write-Host ""
