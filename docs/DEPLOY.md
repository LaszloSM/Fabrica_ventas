# Deploy a Azure — Arquitectura de Bajo Costo (MVP)

> **Costo estimado: $0–10/mes** para tráfico de MVP.

## Arquitectura

| Componente | Servicio Azure | Tier | Costo |
|------------|---------------|------|-------|
| Frontend (Next.js) | Azure Container Apps | Consumption | ~$3–7/mes |
| Backend (FastAPI) | Azure Container Apps | Consumption | ~$3–7/mes |
| Base de datos | Azure Cosmos DB for MongoDB | Free Tier | **Gratis** (1000 RU/s, 25 GB) |
| Email | SendGrid | Free Tier | **Gratis** (100 emails/día) |
| IA | Groq API | Free Tier | **Gratis** |
| CI/CD | GitHub Actions | Free Tier | **Gratis** (2000 min/mes) |
| Imágenes Docker | GitHub Container Registry | Free Tier | **Gratis** |

**Nota:** Si el tráfico es muy bajo, puedes usar una sola Container App para ambos (frontend + backend) con Nginx como reverse proxy y reducir aún más costos.

---

## Prerrequisitos

- Cuenta Azure con suscripción activa
- GitHub repo con este código
- Azure CLI instalada

---

## Opción A: Auto-Setup con Script (Recomendado — 5 minutos)

Tenemos scripts que crean TODO automáticamente. Elige según tu sistema operativo.

### Windows (PowerShell)

```powershell
# 1. Instala Azure CLI si no lo tienes: https://aka.ms/installazurecliwindows
# 2. Abre PowerShell en la carpeta del proyecto
# 3. Ejecuta:
.\scripts\setup-azure.ps1

# O con parámetros personalizados:
.\scripts\setup-azure.ps1 -ResourceGroup "mi-crm" -Location "eastus"
```

### Linux / Mac / Azure Cloud Shell

```bash
# 1. Abre Azure Cloud Shell (https://shell.azure.com) o tu terminal
# 2. Navega al proyecto
# 3. Ejecuta:
chmod +x scripts/setup-azure.sh
./scripts/setup-azure.sh

# O con variables personalizadas:
RESOURCE_GROUP=mi-crm LOCATION=eastus ./scripts/setup-azure.sh
```

El script interactivo te pedirá tus API keys y creará:
- Resource Group
- Cosmos DB for MongoDB (Free Tier)
- Container Apps Environment
- Backend Container App (siempre encendido para automatizaciones)
- Frontend Container App (escala a cero para ahorrar)

Al finalizar, generará un archivo `github-secrets.txt` con los valores que debes guardar en GitHub.

---

## Opción B: Terraform (Infraestructura como Código)

```bash
cd terraform

# Inicializar
terraform init

# Planificar
terraform plan -out=tfplan

# Aplicar (crea todo)
terraform apply tfplan

# Ver URLs creadas
terraform output
```

Para pasar variables sensibles:
```bash
terraform apply -var="google_client_id=TU_ID" -var="google_client_secret=TU_SECRET" -var="groq_api_key=TU_KEY"
```

---

## Opción C: Manual paso a paso

Si prefieres crear los recursos uno por uno, sigue los pasos a continuación.

---

## 1. Configurar Azure Cosmos DB (MongoDB API)

```bash
# Variables
export RESOURCE_GROUP="coimpactob-crm-rg"
export LOCATION="eastus"
export COSMOS_ACCOUNT="coimpactob-cosmos"

# Login
az login

# Crear resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Crear cuenta Cosmos DB con API MongoDB y free tier
az cosmosdb create \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --locations regionName=$LOCATION failoverPriority=0 \
  --kind MongoDB \
  --server-version 4.2 \
  --enable-free-tier true

# Obtener connection string
az cosmosdb keys list \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv
```

Guarda esa connection string para el paso 3.

---

## 2. Crear Container Apps Environment

```bash
export ENV_NAME="coimpactob-env"
export BACKEND_APP="coimpactob-api"
export FRONTEND_APP="coimpactob-web"

# Crear entorno de Container Apps
az containerapp env create \
  --name $ENV_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Crear backend (primera vez, luego lo maneja GitHub Actions)
az containerapp create \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --environment $ENV_NAME \
  --image mcr.microsoft.com/azuredocs/aci-helloworld \
  --target-port 8000 \
  --ingress external \
  --query properties.configuration.ingress.fqdn

# Crear frontend
az containerapp create \
  --name $FRONTEND_APP \
  --resource-group $RESOURCE_GROUP \
  --environment $ENV_NAME \
  --image mcr.microsoft.com/azuredocs/aci-helloworld \
  --target-port 3000 \
  --ingress external \
  --query properties.configuration.ingress.fqdn
```

Anota las URLs (FQDN) de ambas apps.

---

## 3. Configurar Secretos en GitHub

Ve a tu repo en GitHub → **Settings → Secrets and variables → Actions → New repository secret**.

### Generar AZURE_CREDENTIALS

```bash
# Obtén tu subscription ID
az account show --query id -o tsv

# Crea el service principal (guarda el JSON output completo)
az ad sp create-for-rbac \
  --name "github-actions-coimpactob" \
  --role Contributor \
  --scopes /subscriptions/<TU_SUBSCRIPTION_ID>/resourceGroups/coimpactob-crm-rg \
  --sdk-auth
```

Copia el JSON completo que devuelve ese comando y guárdalo como el secreto `AZURE_CREDENTIALS`.

### Todos los secretos necesarios

| Secreto | Valor |
|---------|-------|
| `AZURE_CREDENTIALS` | JSON completo del comando anterior |
| `AZURE_RESOURCE_GROUP` | `coimpactob-crm-rg` (o el nombre que elegiste) |
| `AZURE_BACKEND_APP_NAME` | `coimpactob-api` |
| `AZURE_FRONTEND_APP_NAME` | `coimpactob-web` |

### Configurar variables de entorno en cada Container App

**Backend (coimpactob-api):**
```bash
az containerapp secret set \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --secrets \
    cosmos-connection-string="<TU_COSMOS_CONNECTION_STRING>" \
    groq-api-key="<TU_GROQ_API_KEY>" \
    sendgrid-api-key="<TU_SENDGRID_API_KEY>" \
    secret-key="< genera con: openssl rand -hex 32 >"

az containerapp env var set \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --environment-variables \
    COSMOS_CONNECTION_STRING=secretref:cosmos-connection-string \
    GROQ_API_KEY=secretref:groq-api-key \
    SENDGRID_API_KEY=secretref:sendgrid-api-key \
    SECRET_KEY=secretref:secret-key \
    DEBUG=False \
    CORS_ORIGINS='["https://<FRONTEND_FQDN>"]'
```

**Frontend (coimpactob-web):**
```bash
az containerapp env var set \
  --name $FRONTEND_APP \
  --resource-group $RESOURCE_GROUP \
  --environment-variables \
    NEXTAUTH_URL="https://<FRONTEND_FQDN>" \
    FASTAPI_BACKEND_URL="https://<BACKEND_FQDN>" \
    NEXTAUTH_SECRET="< genera con: openssl rand -base64 32 >" \
    GOOGLE_CLIENT_ID="<TU_GOOGLE_CLIENT_ID>" \
    GOOGLE_CLIENT_SECRET="<TU_GOOGLE_CLIENT_SECRET>" \
    ALLOWED_EMAIL_DOMAIN="coimpactob.com"
```

> **Importante:** En Google Cloud Console, agrega la URI de redirección:
> `https://<FRONTEND_FQDN>/api/auth/callback/google`

---

## 4. Primer Deploy

Haz push a `main`:

```bash
git add .
git commit -m "chore: configurar CI/CD para Azure"
git push origin main
```

GitHub Actions automáticamente:
1. Construye las imágenes Docker de frontend y backend
2. Las publica en GitHub Container Registry
3. Despliega el backend a Azure Container Apps
4. Despliega el frontend a Azure Container Apps

Monitorea en GitHub → **Actions**.

---

## 5. Verificar Deploy

```bash
# Health check backend
curl https://<BACKEND_FQDN>/health
# → {"status":"ok","app":"CoimpactoB CRM API"}

# Health check IA
curl https://<BACKEND_FQDN>/api/v1/ai/health
# → {"status":"ok","provider":"Groq",...}
```

Abre `https://<FRONTEND_FQDN>` en tu navegador.

---

## 6. Mantenimiento y Costos

### Escalar a cero (ahorro máximo)
```bash
az containerapp update \
  --name $FRONTEND_APP \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 0 \
  --max-replicas 1
```
Con `min-replicas 0`, si no hay tráfico no pagas computación. El cold start es de ~2-5 segundos.

> **⚠️ Importante:** El backend ejecuta un scheduler con 4 jobs automatizados (alertas de deals, análisis IA, reportes semanales, limpieza de datos). Si configuras `min-replicas 0`, el scheduler no se ejecutará cuando no haya tráfico. Para mantener la automatización activa, el backend debe tener al menos 1 réplica siempre encendida:
>
> ```bash
> az containerapp update \
>   --name $BACKEND_APP \
>   --resource-group $RESOURCE_GROUP \
>   --min-replicas 1 \
>   --max-replicas 1
> ```
> Esto aumenta el costo del backend a aproximadamente **$7–10/mes** (vs $0 si escala a cero), pero es necesario para que las automatizaciones corran 24/7.

### Backup de Cosmos DB
Habilita backup continuo:
```bash
az cosmosdb update \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --backup-policy-type Continuous
```

### Monitoreo de costos
```bash
az consumption usage list \
  --query "[?resourceGroup=='coimpactob-crm-rg'].{Name:instanceName, Cost:pretaxCost}" \
  -o table
```

---

## Opción Alternativa: Todo en una sola Container App

Si quieres reducir costos al mínimo absoluto, puedes correr frontend y backend en una sola Container App usando un `docker-compose` local o un reverse proxy (Nginx). Esto reduce a ~$3-5/mes. Para MVP separados es más limpio y escalable.

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| `401 Unauthorized` en frontend | Verifica `NEXTAUTH_SECRET` y `NEXTAUTH_URL` |
| `CORS error` | Verifica que `CORS_ORIGINS` incluya el dominio del frontend |
| Scheduler no arranca | Verifica que `GROQ_API_KEY` está configurado y no es el placeholder |
| Base de datos vacía | Ejecuta importación desde Google Sheets o el endpoint de seed |
| Emails no llegan | Verifica SendGrid sender identity y API key |

---

## Checklist Post-Deploy

- [ ] Health check responde OK
- [ ] Login con Google funciona
- [ ] Importación desde Google Sheets funciona
- [ ] Pipeline Kanban carga y persiste movimientos
- [ ] Reportes Excel/PDF descargan correctamente
- [ ] IA analiza deals sin error
- [ ] Scheduler jobs corren (revisa logs en Azure Portal)
- [ ] Dominio custom configurado (opcional)
