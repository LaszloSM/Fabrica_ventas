# CoimpactoB CRM 2.0 — Plan Estratégico Completo
## De MVP a CRM Profesional que Reemplaza Airtable

> **Versión:** 2025-04-25  
> **Fase actual:** FASE 1 (Fundación Usable) — 3/5 días completados  
> **Fases pendientes:** 5

---

## Roadmap Visual

```
FASE 1          FASE 2          FASE 3          FASE 4          FASE 5          FASE 6
Fundación       Rediseño        Automatizaciones Pipeline Pro    Analytics       WhatsApp
Usable          Visual          Inteligentes     + Kanban        Ejecutivos      + Extras
[3/5 días]      [5 días]        [7 días]         [5 días]        [5 días]        [4 días]
    │               │               │               │               │               │
    ▼               ▼               ▼               ▼               ▼               ▼
Importación    UI Moderna      Email Auto       Filtros         Dashboards      WhatsApp
Usuarios       Profesional     Secuencias Auto  Búsqueda        Reportes        API
Vendedores     Modo Oscuro     Reglas Zapier    Badges          Forecast        Notificaciones
Kanban Basico  Responsive      IA Activa        Edición Inline  Ranking         App Móvil
```

---

## FASE 1: Fundación Usable ✅ (En progreso)
**Objetivo:** Base de datos funcional, usuarios, importación, kanban usable

### Entregables completados
- ✅ Importación masiva por upload HTTP (6 CSVs)
- ✅ Deduplicación por email
- ✅ Vendedores dinámicos extraídos automáticamente
- ✅ Sistema de usuarios con roles (ADMIN/SALES)
- ✅ Página /settings con tabs de Equipo y Usuarios
- ✅ Dominio coimpactob.org para auth

### Pendiente (Días 4-5)
- [ ] Kanban con filtros por responsable/sector/temperatura
- [ ] Búsqueda por nombre/empresa
- [ ] Badges de temperatura (frío/tibio/caliente)
- [ ] Contadores por columna
- [ ] Vista 360 del contacto con timeline

**Estimación total:** 5 días | **Costo Azure:** Sin cambios

---

## FASE 2: Rediseño Visual Radical 🎨
**Objetivo:** Transformar la UI de funcional a profesional y atractiva
**Duración:** 5 días | **Prioridad:** Alta

### Contexto del diseño
- **Logo:** coimpactoB (naranja `#F26522` + gris oscuro `#2D2D2D`)
- **Sector:** Ventas B2B (minería, energía, finanzas)
- **Usuarios:** Vendedores + ejecutivos (desktop principal)
- **Sensación:** Profesional, moderno, confiable, no saturado

### Paleta propuesta
| Uso | Color | Hex |
|-----|-------|-----|
| Primario (CTAs) | Naranja CoimpactoB | `#F26522` |
| Secundario | Verde éxito/pipeline | `#1A7A4A` |
| Alertas/urgentes | Rojo suave | `#DC2626` |
| Frío/inactivo | Azul grisáceo | `#64748B` |
| Fondo principal | Blanco/Gris muy claro | `#F8FAFC` |
| Tarjetas | Blanco puro | `#FFFFFF` |
| Texto principal | Gris oscuro | `#1E293B` |
| Texto secundario | Gris medio | `#64748B` |
| Borde sutil | Gris claro | `#E2E8F0` |

### Día 1: Sistema de Diseño + Layout
- Crear `design-system.ts` con tokens de color, tipografía, espaciado
- Rediseñar `Sidebar.tsx`:
  - Logo coimpactoB real (SVG)
  - Navegación con iconos más expresivos
  - Indicador de estado del pipeline
  - Collapse/expand en móvil
- Actualizar `layout.tsx` con nuevo fondo y espaciado

### Día 2: Dashboard Rediseñado
- Tarjetas KPI con iconos y tendencias (↑↓)
- Gráfico de embudo visual (funnel animado)
- Pipeline value con progress bar
- Actividad reciente (timeline compacto)
- Metas del trimestre con visualización circular
- Widget de "Próximas acciones" urgentes

### Día 3: Pipeline Kanban Visual
- Cards con sombra suave y hover elevado
- Foto/avatar del contacto (iniciales si no hay foto)
- Badges de temperatura: 🔵 Frío | 🟡 Tibio | 🔴 Caliente
- Indicador de días sin actividad (verde → amarillo → rojo)
- Valor del deal visible
- Responsable con avatar circular
- Drag & drop con animaciones suaves (Framer Motion)

### Día 4: Listas y Tablas
- Rediseñar `ProspectList` con vista toggle (tarjetas / tabla)
- Tabla tipo Airtable: columnas ordenables, filtros visuales
- Vista de tarjetas con más información visual
- Búsqueda con autocomplete y filtros rápidos
- Paginación elegante

### Día 5: Modales y Detalles
- `DealDrawer` rediseñado con tabs (Info, Timeline, Actividades, Notas)
- Timeline visual con íconos de cada tipo de actividad
- Formularios con mejor UX (floating labels, validación visual)
- Toast notifications para feedback
- Modo oscuro (toggle en settings)

### Entregables
- [ ] Sistema de diseño documentado
- [ ] Sidebar profesional con logo real
- [ ] Dashboard con KPIs y gráficos
- [ ] Kanban visualmente impactante
- [ ] Modo oscuro
- [ ] Responsive mejorado

**Estimación:** 5 días | **Riesgo:** Bajo | **Dependencias:** Ninguna

---

## FASE 3: Automatizaciones Inteligentes 🤖
**Objetivo:** Reemplazar completamente las tareas manuales repetitivas
**Duración:** 7 días | **Prioridad:** Muy Alta

### Contexto
Actualmente el scheduler existe pero solo "loguea" acciones. Necesitamos que **ejecute** acciones reales.

### Día 1-2: Email Automation (SendGrid)
**Backend:**
- Activar `EmailService` con SendGrid real
- Endpoint para enviar email individual: `POST /api/v1/emails/send`
- Endpoint para enviar email con template: `POST /api/v1/emails/send-template`
- Webhook de SendGrid para tracking (aperturas, clics, rebotes)
- Guardar estado de envío en `activities`

**Frontend:**
- Botón "Enviar Email" en contacto/deal
- Selector de template con preview
- Modal de composición con editor simple
- Indicador de estado del email (enviado → abierto → clic)

### Día 3-4: Secuencias Automáticas
**Backend:**
- Job del scheduler que procese `sequence_steps` pendientes cada hora
- Verificar si `scheduledAt <= now()` y enviar email/WhatsApp correspondiente
- Actualizar `sequence.currentStep` automáticamente
- Si el contacto responde (webhook), avanzar al siguiente paso
- Si no hay respuesta en X días, enviar siguiente paso

**Frontend:**
- `SequenceBuilder` visual (constructor drag & drop)
- Asignar secuencia a prospecto con fecha de inicio
- Ver progreso de secuencia activa con % completado
- Pausar/reanudar secuencia

### Día 5: Reglas de Automatización (Zapier-style)
**Backend:**
- Nueva colección `automation_rules`:
  - `trigger`: deal_stage_changed, deal_aging, email_opened, no_activity
  - `conditions`: sector, value, assigned_to
  - `actions`: send_email, send_whatsapp, create_task, notify_user, move_stage
- Endpoint: `POST /api/v1/automations/rules`
- Scheduler job que evalúe reglas cada hora

**Reglas predefinidas (seed):**
1. Cuando deal pasa a REUNION_AGENDADA → crear tarea "Preparar propuesta"
2. Cuando deal está 14 días sin actividad → enviar email de seguimiento
3. Cuando prospecto pasa a CALIENTE → notificar al responsable
4. Cuando email se abre 3 veces → mover a EN_SECUENCIA

**Frontend:**
- Página `/automations` para crear/editar reglas
- Toggle on/off por regla
- Log de ejecuciones

### Día 6-7: IA Activa (Groq)
**Actual:** La IA analiza pero no actúa.
**Mejoras:**
- IA sugiere **próxima acción** para cada deal (en el dashboard)
- IA genera **email personalizado** basado en historial del contacto
- IA detecta **riesgos** y crea alertas visuales
- IA clasifica automáticamente la **temperatura** del prospecto
- IA resume conversaciones/emails largos

**Endpoints:**
- `POST /api/v1/ai/generate-email` — genera draft de email
- `POST /api/v1/ai/suggest-next-action` — sugiere siguiente paso
- `GET /api/v1/ai/deal-insights/{id}` — resumen inteligente del deal

### Entregables
- [ ] Envío real de emails con SendGrid
- [ ] Secuencias ejecutándose automáticamente
- [ ] 4 reglas de automatización predefinidas
- [ ] IA sugiriendo acciones en tiempo real
- [ ] Tracking de aperturas de emails

**Estimación:** 7 días | **Riesgo:** Medio (SendGrid puede requerir verificación) | **Dependencias:** FASE 1 completa

---

## FASE 4: Pipeline & Kanban Pro 📊
**Objetivo:** Pipeline que funcione perfecto con 1000+ deals
**Duración:** 5 días | **Prioridad:** Alta

### Día 1: Filtros Avanzados
**Backend:**
- `GET /deals?assignedTo=...&stage=...&sector=...&temperature=...&minValue=...&maxValue=...`
- Filtros combinables (AND/OR)
- Búsqueda full-text en nombre de contacto y organización

**Frontend:**
- Barra de filtros flotante sobre el Kanban
- Chips de filtros activos con X para quitar
- Filtro por rango de valor (slider)
- Filtro por fecha de última actividad
- Guardar filtros como "vistas" personalizadas

### Día 2: Búsqueda Global
- Search bar en el header (tipo Spotlight)
- Busca en: contactos, organizaciones, deals, emails
- Resultados agrupados por categoría
- Atajos de teclado (`Cmd+K`)

### Día 3: Kanban Enriquecido
- Edición inline de valor, fecha, responsable
- Menú contextual (click derecho) en cards:
  - Cambiar etapa rápidamente
  - Enviar email
  - Agregar nota
  - Archivar
- Agrupación por responsable (vista alternativa)
- Vista compacta vs vista detallada

### Día 4: Vista Tabla (Airtable-style)
- Toggle Kanban ↔ Tabla
- Columnas: Contacto | Org | Etapa | Valor | Prob | Responsable | Última Act | Temperatura
- Ordenamiento por cualquier columna
- Agrupación por etapa/responsable/sector
- Selección múltiple + acciones masivas (cambiar etapa, asignar, enviar email)
- Exportar selección a CSV

### Día 5: Deal Detail 360°
- Página `/deals/[id]` dedicada
- Panel izquierdo: Info del deal + contacto
- Panel central: Timeline visual completo (todos los emails, llamadas, reuniones)
- Panel derecho: Próximas acciones + notas rápidas
- Subida de archivos/adjuntos (Azure Blob Storage)
- Historial de cambios de etapa con quién y cuándo

### Entregables
- [ ] Filtros combinables por 5+ criterios
- [ ] Búsqueda global con atajos
- [ ] Edición inline en Kanban
- [ ] Vista Tabla tipo Airtable
- [ ] Deal Detail 360° con timeline
- [ ] Acciones masivas

**Estimación:** 5 días | **Riesgo:** Bajo | **Dependencias:** FASE 2

---

## FASE 5: Analytics & Dashboards Ejecutivos 📈
**Objetivo:** Reportes que den insights reales para tomar decisiones
**Duración:** 5 días | **Prioridad:** Alta

### Día 1: Métricas Core
**Backend:**
- Endpoint `GET /metrics/dashboard` con:
  - Pipeline total (valor ponderado)
  - Deals ganados vs perdidos (mes/trimestre/año)
  - Tiempo promedio por etapa
  - Tasa de conversión por etapa (embudo)
  - Top vendedores por valor cerrado
  - Deals estancados (>14, >30 días)
  - Forecast de cierre (ponderado por probabilidad)

**Frontend:**
- Dashboard ejecutivo con gráficos Recharts
- Tarjetas con tendencia vs período anterior (↑ 15%)
- Gráfico de embudo con % de conversión entre etapas

### Día 2: Reportes por Vendedor
- Página `/reports/team`
- Cada vendedor: actividad, deals activos, ganados, valor, tasa de conversión
- Gráfico de actividad semanal (emails, llamadas, reuniones)
- Comparativa entre vendedores

### Día 3: Reportes por Sector/Servicio
- Análisis: ¿Qué sector tiene mejor tasa de conversión?
- ¿Qué servicio genera más valor?
- ¿De dónde vienen los mejores leads?
- Heatmap de actividad por mes

### Día 4: Reportes Automáticos
- Scheduler job: email semanal con resumen al equipo
- Contenido del email:
  - Pipeline value esta semana vs anterior
  - Deals que avanzaron de etapa
  - Deals estancados que necesitan atención
  - Ranking semanal de vendedores
- Template HTML profesional para el email

### Día 5: Exportaciones Avanzadas
- Mejorar Excel: más hojas, más datos, formato profesional
- Exportar selección de deals (no solo todos)
- Exportar reporte de vendedor
- Programar exportes periódicos

### Entregables
- [ ] Dashboard ejecutivo con 8+ KPIs
- [ ] Embudo de conversión con %
- [ ] Reportes por vendedor
- [ ] Email semanal automático
- [ ] Exportaciones profesionales

**Estimación:** 5 días | **Riesgo:** Medio | **Dependencias:** FASE 3, FASE 4

---

## FASE 6: WhatsApp + Extras 📱
**Objetivo:** Integración con WhatsApp y funcionalidades premium
**Duración:** 4 días | **Prioridad:** Media (dijiste que puede esperar)

### Día 1: WhatsApp Business API (Meta)
- Registrar app en Facebook Developers
- Configurar WhatsApp Business Account
- Crear templates de mensajes aprobados
- Integrar API de WhatsApp Cloud
- Endpoint: `POST /api/v1/whatsapp/send`
- Webhook para recibir respuestas

### Día 2: WhatsApp en Secuencias
- Agregar tipo de paso WHATSAPP en secuencias
- Enviar mensaje automático en día X
- Tracking de lectura/respuesta
- Si responde, detener secuencia o avanzar

### Día 3: Notificaciones Push
- Notificaciones del navegador (Web Push)
- Alertas de deals estancados
- Alertas de nuevos leads asignados
- Toast notifications en la app

### Día 4: Extras
- **App Móvil (PWA):**
  - Manifest.json para instalación
  - Service worker para offline básico
  - Diseño responsive optimizado para móvil
- **Integraciones:**
  - Google Calendar (agendar reuniones)
  - Calendly (links de reunión automáticos)
- **Seguridad:**
  - Audit log (quién hizo qué y cuándo)
  - Backup automático de Cosmos DB

### Entregables
- [ ] WhatsApp Business API integrado
- [ ] Templates aprobados
- [ ] Secuencias con WhatsApp
- [ ] Notificaciones push
- [ ] PWA instalable
- [ ] Google Calendar sync

**Estimación:** 4 días | **Riesgo:** Medio-Alto (WhatsApp requiere verificación de Meta) | **Dependencias:** FASE 3

---

## Resumen de Fases y Tiempos

| Fase | Nombre | Días | Dependencias | Estado |
|------|--------|------|--------------|--------|
| **FASE 1** | Fundación Usable | 5 | — | 🟡 3/5 días |
| **FASE 2** | Rediseño Visual Radical | 5 | FASE 1 | 🔴 Pendiente |
| **FASE 3** | Automatizaciones Inteligentes | 7 | FASE 1 | 🔴 Pendiente |
| **FASE 4** | Pipeline & Kanban Pro | 5 | FASE 2 | 🔴 Pendiente |
| **FASE 5** | Analytics & Dashboards | 5 | FASE 3, 4 | 🔴 Pendiente |
| **FASE 6** | WhatsApp + Extras | 4 | FASE 3 | 🔴 Pendiente |

**Total estimado:** 31 días laborales (~6 semanas)

---

## Costos Adicionales por Fase

| Servicio | Costo mensual estimado |
|----------|------------------------|
| **Actual (Azure)** | ~$10-15 |
| **SendGrid** (FASE 3) | Gratis (100 emails/día) → $20-50 si crece |
| **WhatsApp API** (FASE 6) | $0.005-0.08 por conversación |
| **Azure Blob** (adjuntos) | ~$0.02/GB |
| **Total con FASE 6** | ~$15-30/mes |

---

## Decisiones de Diseño Clave

### 1. ¿Modo oscuro desde el inicio o después?
**Recomendación:** Incluir en FASE 2. Es un diferenciador visual fuerte y los desarrolladores/vendedores lo aprecian.

### 2. ¿Tabla tipo Airtable o solo Kanban?
**Recomendación:** Ambos. Kanban para pipeline visual, Tabla para análisis y acciones masivas. Toggle entre ellos.

### 3. ¿Secuencias automáticas desde el inicio?
**Recomendación:** Sí, en FASE 3. Es el feature que más ahorra tiempo y justifica el CRM vs Airtable manual.

### 4. ¿WhatsApp antes o después de todo lo demás?
**Recomendación:** Después (FASE 6). Email automation da más ROI inicial. WhatsApp requiere verificación de Meta que puede tomar 1-2 semanas.

### 5. ¿App móvil nativa o PWA?
**Recomendación:** PWA. Es más rápido de desarrollar, no requiere app stores, y cubre el 90% de necesidades móviles.

---

## Próximos Pasos

1. **Completar FASE 1** (Días 4-5): Kanban con filtros + Vista 360
2. **Revisar y aprobar** este plan completo
3. **Priorizar:** ¿Quieres FASE 2 (diseño) o FASE 3 (automatizaciones) primero?
4. **Ejecutar** fase por fase

---

**¿Tienes ajustes, preguntas o quieres que empiece con alguna fase específica?**
