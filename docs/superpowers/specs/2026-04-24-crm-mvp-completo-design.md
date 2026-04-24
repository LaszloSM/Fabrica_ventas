# CoimpactoB CRM — MVP Completo: Diseño Técnico
**Fecha:** 2026-04-24  
**Autor:** Claude Code + LaszloSM  
**Estado:** Aprobado v2

---

## Contexto

CRM en Next.js 16 + FastAPI (Python). El backend está 95% completo con 40+ endpoints. El frontend tiene todos los componentes UI construidos. El problema principal es que el frontend no está conectado al backend (URL mismatch) y faltan rutas proxy. Se ejecutará en 4 fases secuenciales.

---

## Fase 1: Conexión Frontend ↔ Backend

### Problema raíz
`lib/backend-api.ts` llama a `http://127.0.0.1:8000/deals` pero FastAPI expone `/api/v1/deals`. Un cambio de prefijo en `proxyToBackend` conecta todos los endpoints existentes.

### Cambio en `lib/backend-api.ts`
```typescript
const API_PREFIX = '/api/v1'
// Línea 16 actual: fetch(`${BACKEND_URL}${path}${query}`, ...)
// Cambia a:        fetch(`${BACKEND_URL}${API_PREFIX}${path}${query}`, ...)
```

### Rutas proxy faltantes (`app/api/`)

| Archivo | Métodos |
|---|---|
| `deals/[id]/route.ts` | Añadir GET, PUT, DELETE (solo existía PATCH) |
| `deals/[id]/move-stage/route.ts` | POST → `/deals/${id}/move-stage` |
| `deals/[id]/mark-won/route.ts` | POST → `/deals/${id}/mark-won` |
| `deals/[id]/mark-lost/route.ts` | POST → `/deals/${id}/mark-lost` |
| `ai/[...path]/route.ts` | GET + POST catch-all → `/ai/${path.join('/')}` |
| `import/route.ts` | POST + DELETE → `/import` |
| `reports/pipeline/route.ts` | GET → `/reports/pipeline.xlsx` (binario — ver nota Fase 4) |
| `reports/quarterly/route.ts` | GET → `/reports/quarterly.pdf` (binario — ver nota Fase 4) |

### Resultado esperado
- KanbanBoard carga deals reales desde MongoDB
- Dashboard muestra métricas reales
- ProspectList muestra prospectos reales
- DealDrawer puede actualizar, cerrar, mover stages con acciones reales

---

## Fase 2: Importación Google Sheets

### Estado actual
El endpoint `POST /api/v1/import` ya está **completamente implementado** en `backend/app/api/v1/endpoints/import_data.py`. Lee el CSV, crea Prospects, Contacts, Deals y Activities. Tiene un `DELETE /api/v1/import` para limpiar y reintentar.

### GID del sheet
El script actual usa `gid=2107831142`. El usuario proporcionó `gid=456943491` (tab diferente). Se actualizará la constante `SHEET_URL` en `import_data.py` para usar `gid=456943491` (el que el usuario confirmó como fuente de verdad).

### Trabajo restante en Fase 2
1. Actualizar `SHEET_URL` en `import_data.py` → usar `gid=456943491`
2. Agregar ruta proxy `app/api/import/route.ts` (POST + DELETE)
3. Agregar botón "Importar desde Google Sheets" en `/prospects` page
4. Modal de confirmación con botón ejecutar + muestra resultados (`prospects_created`, `contacts_created`, `deals_created`)

### Idempotencia
El endpoint bloquea re-importación si ya existen prospects (HTTP 409). Para re-importar: llamar `DELETE /import` primero.

---

## Fase 3: Google OAuth Completo

### Auth flow
1. Usuario visita cualquier ruta → middleware redirige a `/login`
2. Login page muestra botón "Entrar con Google"
3. NextAuth maneja OAuth con Google
4. Sesión incluye `user.id` y `user.email`
5. Backend recibe `x-user-id` y `x-user-email` en cada request (ya implementado en `lib/backend-api.ts`)

### Configuración `.env.local`
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...  # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

### `auth.ts` — cambios necesarios
- Añadir provider `Google` con scopes `email profile`
- Callback `signIn`: restringir a emails `@coimpactob.com` (retorna `false` si no cumple)
- Callback `session`: incluir `user.id` en el objeto de sesión

### Roles de usuario — implementación MVP
- Añadir colección `users` en MongoDB
- En callback `signIn`: buscar usuario por email; si no existe, crearlo
- Si es el primer usuario en la BD → rol `ADMIN`; siguientes → `SALES`
- Callback `session` devuelve `session.user.role`
- Backend: header `x-user-role` añadido en `proxyToBackend`

### Backend
- No necesita middleware adicional para MVP
- Endpoints de deals ya filtran por `owner` cuando se pasa `x-user-id`

---

## Fase 4: Reportes Excel + PDF

### Excel — Pipeline Report
`GET /api/v1/reports/pipeline.xlsx`
- Librería: `openpyxl==3.1.2` (agregar a `requirements.txt`)
- Hoja 1: Todos los deals activos (Prospect, Etapa, Valor, Responsable, Próxima acción, Fecha cierre)
- Hoja 2: Resumen por etapa con totales
- Hoja 3: Resumen por servicio vs metas
- Respuesta: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### PDF — Reporte Trimestral
`GET /api/v1/reports/quarterly.pdf?quarter=2&year=2026`
- Librería: `reportlab==4.2.2` (agregar a `requirements.txt`)
- Contenido: portada, sección por línea de negocio, tabla de deals ganados, avance vs meta
- Respuesta: `Content-Type: application/pdf`

### Nuevo endpoint FastAPI
`backend/app/api/v1/endpoints/reports.py` con router prefix `/reports`

### Rutas proxy Next.js (sin extensión en el path)
- `app/api/reports/pipeline/route.ts` → `GET /reports/pipeline.xlsx`
- `app/api/reports/quarterly/route.ts` → `GET /reports/quarterly.pdf`

### Manejo de respuestas binarias
`proxyToBackend` usa `.text()` que corrompe binarios. Las rutas de reportes **no usan `proxyToBackend`**. Implementan su propia función `proxyBinary` que:
1. Llama `fetch()` al backend
2. Lee como `ArrayBuffer`
3. Devuelve `new NextResponse(buffer, { headers: { 'Content-Type': '...', 'Content-Disposition': '...' } })`

### Frontend
- Sección "Exportar" en Dashboard con 2 botones
- `<a href="/api/reports/pipeline" download>` y `<a href="/api/reports/quarterly?quarter=2&year=2026" download>`

---

## Dependencias nuevas

### Backend (agregar a `requirements.txt`)
```
openpyxl==3.1.2
reportlab==4.2.2
```
*(httpx ya está en requirements.txt — no agregar de nuevo)*

### Frontend
Sin dependencias nuevas.

---

## Orden de ejecución

1. **Fase 1** (~45 min) → CRM funcional con datos reales de BD
2. **Fase 2** (~30 min) → 90 contactos importados, pipeline listo
3. **Fase 3** (~45 min) → Login con Google, roles básicos
4. **Fase 4** (~2 h) → Exportación Excel/PDF

**Total estimado: ~4 horas de implementación**
