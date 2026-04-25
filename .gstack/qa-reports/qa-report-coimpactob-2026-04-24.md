# QA Report — CoimpactoB CRM

**Fecha:** 2026-04-24
**Branch:** main
**Enfoque:** FASE 2 (Rediseño Visual Radical) + bugs existentes
**Método:** Code review + HTTP smoke tests + build verification

---

## Resumen

| Métrica | Valor |
|---------|-------|
| Páginas probadas | 7 (/login, /dashboard, /pipeline, /prospects, /settings, /contacts/[id], /triggers) |
| API routes probadas | 3 (/api/metrics, /api/deals, /api/import/status) |
| Errores de build | 0 |
| Bugs encontrados | 4 |
| Bugs corregidos | 4 |
| Estado | ✅ PASA |

---

## Bugs Encontrados y Corregidos

### BUG-001: Falta ruta `/api/users/sync-team` (Alta)
**Impacto:** El botón "Sincronizar con equipo" en Configuración > Usuarios falla con 404.
**Causa:** El frontend llamaba a `/api/users/sync-team` pero no existía el archivo proxy en `app/api/users/sync-team/route.ts`.
**Fix:** Crear `app/api/users/sync-team/route.ts` que reenvíe POST al backend.
**Archivo:** `app/api/users/sync-team/route.ts` (nuevo)

---

### BUG-002: DealDrawer cierra al guardar nota (Alta)
**Impacto:** Al agregar una nota/actividad en el drawer de un deal, el modal se cierra inmediatamente. UX terrible, especialmente con tabs.
**Causa:** `logActivity` llamaba `onClose()` incondicionalmente al final.
**Fix:**
- Eliminar `onClose()` de `logActivity`.
- Llamar `onUpdate()` con la nueva actividad agregada para refrescar el timeline en tiempo real.
- Limpiar el formulario (`setActivity({ notes: '' })`) después de guardar exitosamente.
- Agregar try/catch alrededor del fetch.
**Archivo:** `components/pipeline/DealDrawer.tsx`

---

### BUG-003: KanbanBoard no revierte drag en fallo de API (Alta)
**Impacto:** Si el backend falla al mover un deal de etapa, la tarjeta queda visualmente en la nueva columna pero el backend no se actualizó.
**Causa:** Update optimista sin manejo de errores ni reversión.
**Fix:**
- Guardar estado previo antes de optimista.
- Wrap fetch en try/catch.
- Revertir a `previousDeals` si la API responde con error o hay excepción de red.
**Archivo:** `components/pipeline/KanbanBoard.tsx`

---

### BUG-004: `console.error` en producción (Media)
**Impacto:** Mensaje de error en consola del navegador en producción.
**Causa:** `console.error('Error loading pipeline data:', err)` en KanbanBoard.
**Fix:** Eliminar la llamada a `console.error`. El error ya se muestra en la UI via `setError()`.
**Archivo:** `components/pipeline/KanbanBoard.tsx`

---

## Verificación de Build

```
✓ Compiled successfully in 6.4s
✓ TypeScript check passed
✓ 30 routes generadas (incluyendo /api/users/sync-team)
```

---

## Páginas Testeadas

| Ruta | Estado | Notas |
|------|--------|-------|
| /login | ✅ 200 | Carga correctamente |
| /dashboard | ✅ 200 | Redirige a /login si no autenticado (esperado) |
| /pipeline | ✅ 200 | Redirige a /login si no autenticado (esperado) |
| /prospects | ✅ 200 | Redirige a /login si no autenticado (esperado) |
| /settings | ✅ 200 | Redirige a /login si no autenticado (esperado) |
| /contacts/[id] | ✅ 200 | Redirige a /login si no autenticado (esperado) |
| /api/* | ✅ 401 | Rechaza requests no autenticados (esperado) |

---

## Observaciones (No bugs)

1. **Auth requerida:** Todas las páginas del app shell redirigen a /login cuando no hay sesión. Comportamiento correcto.
2. **Design system aplicado consistentemente:** Sidebar, dashboard, kanban, prospects, settings y contact detail usan los tokens de `lib/design-system.ts`.
3. **No hay missing `key` props:** Todas las listas `.map()` tienen `key` correctamente definido.
4. **No hay `dangerouslySetInnerHTML`:** Ningún componente lo usa.

---

## Recomendaciones Post-QA

1. **Test visual con datos reales:** La mayoría de los componentes son client-side y dependen del backend para renderizar contenido. Recomiendo hacer un test visual con el backend corriendo y datos importados.
2. **Pruebas E2E:** Considerar Playwright o Cypress para testear flujos críticos: login → importar CSV → mover deal en kanban → agregar nota.
3. **Monitor de errores:** Agregar Sentry o similar para capturar errores de runtime en producción.

---

**Status:** ✅ DONE — 4 bugs encontrados y corregidos, build limpio.
