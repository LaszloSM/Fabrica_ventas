# CoimpactoB CRM — Datos Reales, Auth y CRM Funcional: Diseño Técnico
**Fecha:** 2026-04-25
**Autor:** Claude Code + LaszloSM
**Estado:** Aprobado

---

## Contexto

El CRM tiene frontend Next.js + backend FastAPI + MongoDB (Cosmos DB Azure). Está técnicamente conectado pero operando con datos inventados porque:
1. El import nunca se ejecutó correctamente
2. El modelo de datos no refleja la realidad del negocio (tiene precios que nunca existieron)
3. La autenticación permite cualquier cuenta Gmail en lugar de solo `@coimpactob.org`

El Google Sheet real tiene ~1,300 contactos en 6 tabs con estructuras distintas. Este spec define cómo alinear el sistema completo con esa realidad.

---

## Sección 1: Modelo de Datos Realineado

### Problema
El modelo actual usa `Deal.value` (precio monetario) y stages de negociación tipo Salesforce (8 etapas). Nada de esto existe en los datos reales de CoimpactoB. El negocio maneja:
- **Temperatura** de relación: Frio → Tibio → Caliente → Ganado/Perdido
- **Línea de servicio** (oportunidad): Consultoría, Academia, Credimpacto, Programa Experiencias, CAF, Banca
- **Proyectos** (texto libre con nombres reales de proyectos)
- **Responsable** (miembro del equipo asignado)

### Cambios al modelo

#### `Deal` (Oportunidad)
- `value` → **eliminado de la UI**, queda `null` en DB. No aparece en ningún componente frontend. El schema Python lo mantiene como `Optional[float] = None`.
- `stage` → **se conserva el enum existente de 8 etapas** en el backend. El import mapea temperatura a etapas así:
  - `Frio` → `PRIMER_CONTACTO`
  - `Tibio` → `EN_SECUENCIA`
  - `Caliente` → `REUNION_AGENDADA`
  - Sin estado → `PROSPECTO_IDENTIFICADO`
- El **Kanban UI** agrupa las etapas en columnas visuales: "Frio" (PROSPECTO_IDENTIFICADO + PRIMER_CONTACTO), "Tibio" (EN_SECUENCIA + SENAL_DETECTADA), "Caliente" (REUNION_AGENDADA + PROPUESTA_ENVIADA + NEGOCIACION), "Ganado" (GANADO), "Perdido" (PERDIDO). Drag & drop mueve al primer stage de la columna destino.
- **Nuevo campo:** `proyectos` (string, texto libre con nombres reales de proyectos). Se agrega a la colección deals en MongoDB y al schema Pydantic `DealCreate`/`DealUpdate`.
- **Nuevo campo:** `sourceTab` (string). Se agrega igual que `proyectos`.

#### `Prospect` (Organización)
- `segmento` ya existe en el modelo. Se usa para: "Banca", "CAF", "Sector Público", "Social/Impacto", "Empresarial", etc.
- `industry` → se preserva y enriquece desde los datos del sheet.

#### `Contact` (Persona)
- Se preserva todo el modelo actual.
- `temperature` es propiedad del Deal, no del Contact (correcto en el modelo actual).
- Notas del contacto → se registran como Activity de tipo `NOTE` (no campo en Contact).

#### `ActivityType` enum — se conserva el existente
```typescript
EMAIL | LINKEDIN | CALL | MEETING | NOTE
```
Las columnas de actividad del sheet se mapean a estos tipos exactos.

---

## Sección 2: Import Comprehensivo — Todas las Tabs

### Fuentes de datos

| Tab | Contactos aprox. | Estructura |
|-----|-----------------|------------|
| 2026 | ~145 | Activos 2026. Estado (Frio/Tibio/Caliente), Oportunidades, Responsable + columnas de actividad |
| Base de datos 2025 | ~600 | Histórico. Relación con contacto, Oportunidades, Responsable, Resumen IA |
| Banca caliente | ~5 | Subset banca activa. Solo nombre/org/cargo/acciones |
| Banca frio | ~76 | Banca fría. LinkedIn tracking (Andrea/Daniel), correo, reunión |
| CAF | ~56 | Internacionales. País, institución, LinkedIn |
| Contactos airtable | ~462 | Export Airtable. Incluye # proyectos, proyectos, industria, Resumen IA |

### Endpoint — dos modos

**Modo A (sincronización automática desde Google Sheets):**
`POST /api/v1/import/from-sheets` — nuevo endpoint en `import_data.py`.
Descarga todas las tabs usando sus GIDs vía `httpx` (mismo mecanismo que el `import_data.py` existente que ya usa httpx para descargar el sheet). GIDs de cada tab se configuran como constantes en el archivo.

**Modo B (upload manual de CSVs):**
`POST /api/v1/import/comprehensive` — ya existe. Se reescribe `ImportService.import_from_files()` para manejar las 6 estructuras de tab por nombre de archivo.

La UI (Settings → Admin) usa el **Modo A** como botón principal. El **Modo B** queda como fallback.

Ambos modos:
1. Parsean cada tab con su función específica
2. Hacen **upsert real** por email (primario) o nombre+organización (fallback) — actualiza campos vacíos, no sobreescribe los que ya tienen valor
3. **Nunca retorna 409** — siempre procesa y retorna stats
4. Convierten columnas de actividad a registros `Activity` (solo si el campo tiene valor no vacío)
5. Para "Oportunidades" con múltiples servicios separados por coma → crea **un Deal por cada servicio**
6. Retorna: `{prospects_created, prospects_updated, contacts_created, contacts_updated, deals_created, activities_created}`

### Parsers por tab

**`parse_2026(rows)`**
- Columnas: Nombre Completo, Organización, Cargo, Sector, País, Ciudad Principal, Áreas de impacto, Correo Electrónico, Celular, LinkedIn, Responsable, Oportunidades, Estado
- Columnas de actividad → Activity records:
  - "Envio de invitacion Linkdln" → `{type: "LINKEDIN", notes: "Invitación enviada"}`
  - "Aceptacion Linkdln" → `{type: "LINKEDIN", notes: "Invitación aceptada"}`
  - "Mensaje Linkdln" → `{type: "LINKEDIN", notes: "Mensaje enviado"}`
  - "Correo 1/2/3" → `{type: "EMAIL", notes: "Correo N enviado"}`
  - "LLamada" → `{type: "CALL"}`
  - "Primera reunión" → `{type: "MEETING", notes: "Primera reunión"}`
  - "Reunión de propuesta" → `{type: "MEETING", notes: "Reunión de propuesta"}`
- Temperatura: Estado "Frio" → `FRIO`, "Tibio" → `TIBIO`, "Caliente" → `CALIENTE`

**`parse_2025(rows)`**
- Columnas: Nombre Completo, Correo, Teléfono, Organización, Cargo, LinkedIn, Relación con contacto, Oportunidades, Responsable, País, Ciudad, Organización - Industria, Resumen Inteligente de Notas, Propuesta
- Temperatura: "Relación con contacto"
- `proyectos` ← columna "Propuesta"
- `notes` ← "Resumen Inteligente de Notas"

**`parse_banca_caliente(rows)`**
- Columnas: NOMBRE, ORGANIZACION, CARGO, LINKEDIN, MAIL, TELEFONO, ACCIONES
- Todos → temperatura `CALIENTE`, segmento="Banca"
- "ACCIONES" → Activity `{type: "NOTE", notes: <valor>}`

**`parse_banca_frio(rows)`**
- Columnas: NOMBRE, INSTITUCION, CARGO, AREA, Linkedin, Mail, Segmento, Pais, INVITACIÓN LKD ANDREA, INVITACIÓN LKD DANIEL, RESPUESTA LINKED, CORREO, RESPUESTA CORREO, REUNION
- Todos → temperatura `FRIO`, segmento="Banca"
- INVITACIÓN LKD → Activity LINKEDIN
- CORREO enviado → Activity EMAIL
- REUNION → Activity MEETING si tiene valor

**`parse_caf(rows)`**
- Columnas: NOMBRE, INSTITUCION, CARGO, Linkedin, Pais, Ciudad, Mail, (segmento en col 8)
- Todos → temperatura `FRIO`, segmento="CAF"

**`parse_airtable(rows)`** (sin headers — primera fila es dato)
- Columnas por posición: [0]Nombre, [1]Correo, [2]Teléfono, [3]Organización, [4]Cargo, [5]Relación, [6]LinkedIn, [7]#proyectos, [8]Proyectos, [9]vacío, [10]País, [11]Ciudad, [12]Industria, [13]Resumen IA, [14]Clasificación potencial
- `proyectos` ← col[8]
- `notes` ← col[13] (Resumen IA)
- Temperatura ← col[5]

### Deduplicación
```
1. Si existe Contact con mismo email → upsert (actualiza campos vacíos, no sobreescribe los llenos)
2. Si no, busca Prospect con mismo nombre+organización → upsert
3. Si no existe nada → crear nuevo Prospect + Contact + Deal
```

### Mapeo de Oportunidades → ServiceType
```python
SERVICE_MAP = {
    "consultoría y proyectos": "CONSULTORIA_PROYECTO",
    "consultoría": "CONSULTORIA_PROYECTO",
    "academia": "ACADEMIA_CURSO",
    "programa experiencias": "ACADEMIA_CURSO",
    "credimpacto": "CREDIMPACTO_CREDITOS",
    "fundraising": "FUNDACION_FUNDRAISING",
    "fundrasing": "FUNDACION_FUNDRAISING",
    "convenio": "FUNDACION_CONVENIO",
    "banca": "CREDIMPACTO_FONDO_ROTATORIO",
    "caf": "CREDIMPACTO_FONDO_ROTATORIO",
}
```
Un contacto con múltiples oportunidades genera múltiples Deals (uno por línea de servicio).

### Mapeo de Responsable → Usuario
```python
RESPONSABLE_MAP = {
    "andrea": "andrea@coimpactob.org",
    "pilar": "pilar@coimpactob.org",
    "daniel": "daniel@coimpactob.org",
    "gloria": "gloria@coimpactob.org",
    "valery": "valery@coimpactob.org",
    # Se busca por nombre case-insensitive en la colección users
}
```

---

## Sección 3: Autenticación y Roles

### Fix inmediato
- `ALLOWED_EMAIL_DOMAIN` en `.env.local` → cambiar de `gmail.com` a `coimpactob.org`
- `auth.ts` ya tiene la lógica correcta: bloquea emails que no terminen en `@${ALLOWED_DOMAIN}`

### Flujo de roles
1. Usuario hace login con Google `@coimpactob.org`
2. Backend recibe `POST /api/v1/users/role?email=...` → busca usuario en DB
3. Si no existe: crea usuario. Si es el primero → `ADMIN`, siguientes → `SALES`
4. Token JWT incluye `role`
5. Session devuelve `session.user.role`

### Sincronización de perfil
En el callback `jwt` de `auth.ts`, además de obtener el rol, se sincroniza el perfil (nombre, foto) al backend via `POST /api/v1/users/sync` con body `{email, name, image}`.

### Permisos por rol
| Acción | VIEWER | SALES | ADMIN |
|--------|--------|-------|-------|
| Ver todos los contactos | ✓ | ✓ | ✓ |
| Ver solo sus asignados | — | por defecto | — |
| Crear/editar contactos | ✗ | ✓ | ✓ |
| Cambiar responsable | ✗ | ✗ | ✓ |
| Ejecutar import | ✗ | ✗ | ✓ |
| Cambiar roles | ✗ | ✗ | ✓ |

---

## Sección 4: CRM Funcional

### Kanban Rediseñado
- Columnas: `Frio | Tibio | Caliente | Reunión Agendada | Ganado | Perdido`
- Cards muestran: nombre contacto, organización, cargo, línea de servicio (badge), responsable (avatar)
- **Sin campo de precio/valor en ningún card**
- Drag & drop entre columnas → `PATCH /deals/{id}/move-stage`
- Click en card → Drawer lateral con detalle completo

### Vista de Contacto (detail page `/contacts/[id]`)
- Datos del contacto: nombre, cargo, email, teléfono, LinkedIn
- Organización vinculada
- Temperatura actual (editable inline)
- Oportunidades activas (deals)
- Proyectos (texto editable)
- Timeline de actividades (orden cronológico, con icon por tipo)
- Botón "Registrar actividad" → modal con tipos: EMAIL | LINKEDIN | CALL | MEETING | NOTE
- Notas libres (field editable)

### Vista de Prospectos (`/prospects`)
- Tabla con columnas: Nombre, Organización, Cargo, Sector, Temperatura, Responsable, Oportunidades, País
- Filtros: Responsable, Sector, Temperatura, Línea de servicio, País
- Búsqueda full-text por nombre/org/email
- Exportar a CSV (descarga directa)
- Inline editing de temperatura y responsable

### Dashboard
- KPIs reales (sin $):
  - Total contactos activos
  - Por temperatura (Frio/Tibio/Caliente) con barra de progreso
  - Por responsable (cuántos contactos tiene cada uno)
  - Por línea de servicio
- Actividad reciente del equipo (últimas actividades)
- Sin gráficos de revenue inventados

---

## Sección 5: Mejoras Adicionales

### 1. Botón "Sincronizar desde Google Sheets" (Settings → Admin)
- Solo visible para ADMIN
- Llama `POST /api/import/comprehensive`
- Muestra modal con progreso y resultado final: `{creados, actualizados, actividades}`
- Hace upsert, nunca borra datos manuales

### 2. Segmentos múltiples de oportunidad
- Un contacto puede tener deals en múltiples líneas de servicio (como en el sheet)
- El import crea un Deal por cada línea de servicio listada en "Oportunidades"

### 3. Exportación CSV
- `GET /api/prospects/export` → descarga CSV con todos los campos
- Botón en la página de Prospectos

### 4. Inline editing en lista
- Temperatura y responsable editables directamente en la tabla sin abrir modal
- `PATCH /contacts/{id}` o `PATCH /deals/{id}`

### 5. Actividades del equipo en Activities page
- Filtro por responsable, tipo, fecha
- Vista del historial completo del equipo

---

## Orden de implementación

1. **Fix auth** (5 min): cambiar `ALLOWED_EMAIL_DOMAIN=coimpactob.org` en `.env.local`
2. **Actualizar enums/tipos** (20 min): simplificar `DealStage`, quitar `value` de UI
3. **Reescribir import comprehensive** (2 h): 6 parsers + upsert + actividades
4. **Ejecutar import** (5 min): llamar el endpoint, verificar datos reales en DB
5. **Rediseñar Kanban** (1 h): nuevas columnas, cards sin precio
6. **Vista de Contacto** (1 h): timeline de actividades, proyectos, inline edit
7. **Vista de Prospectos** (1 h): filtros, búsqueda, exportar CSV
8. **Dashboard real** (1 h): KPIs sin $, actividad reciente
9. **Sincronización UI** (30 min): botón en Settings para ADMIN
10. **QA** (30 min): verificar flujo completo con datos reales

**Total estimado: ~8 horas de implementación**
