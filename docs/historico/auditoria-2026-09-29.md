# Chefsy — Inventario de Hallazgos de Auditoría (Histórico)

> [!NOTE]
> **DOCUMENTO HISTÓRICO — SNAPSHOT DE AUDITORÍA (29–30 de septiembre de 2026)**
>
> Este documento preserva el registro original de la auditoría técnica realizada entre el 29 y el 30 de septiembre de 2026.
> **No representa el estado operativo actual de la plataforma.**
> 
> Muchos puntos reportados aquí como abiertos o de severidad crítica fueron posteriormente abordados o mitigados mediante refactorizaciones y migraciones. Este archivo no certifica qué migraciones están aplicadas hoy: el estado vigente debe comprobarse en `supabase/migrations/README.md` y contra la base real. En particular, no asumir que `004_rls_cadetes.sql` está aplicada solo por existir en el repositorio.
>
> Para consultar la arquitectura, seguridad y estado vigentes, remitirse a:
> - [docs/arquitectura.md](../arquitectura.md)
> - [docs/seguridad.md](../seguridad.md)
> - [docs/base-de-datos.md](../base-de-datos.md)
> - [supabase/migrations/README.md](../../supabase/migrations/README.md)
> - [datos/esquema-verificado.md](../../datos/esquema-verificado.md)

---

## Propósito original

Pasar este inventario a un asistente con más contexto del proyecto y confirmar cuáles hallazgos son reales, cuáles están ya resueltos y cuáles fueron falsos positivos.

**Fecha del análisis original:** 29/09/2026 (con adenda el 30/09/2026)  
**Repositorio:** Next.js 16.3.3 · React 18 · Supabase (Postgres)

---

## Cómo leer la columna "Evidencia"

El análisis original se realizó con una mezcla de verificación directa y subagentes de exploración.

| Nivel | Significado |
|---|---|
| `VERIFICADO` | Comprobado directamente en la sesión de auditoría. El dato fue reproducible. |
| `MEDIDO` | Verificado con un comando (conteo de líneas, `grep`, `git ls-files`, `tsc`). |
| `SUBAGENTE` | Reportado por un subagente de exploración. No necesariamente verificado; líneas y cifras pueden estar desfasadas. |
| `CORREGIDO` | Se detectó algo que en realidad no era un problema o se sobreestimó. |

---

## 1. Seguridad — P0

### S-1 · La anon key lee datos de negocio sin autenticación
- **Evidencia:** `VERIFICADO` empíricamente, contra la base real (29/09/2026).
- **Qué:** Con `NEXT_PUBLIC_SUPABASE_ANON_KEY` se pudo leer sin credenciales:
  - `pedidos` → 2072 filas
  - `cierres_diarios` → 115 filas
  - `stock_movimientos` → 750 filas
  - `tienda_metadata` → 102 filas
  - `configuracion_operativa` → 1 fila
- **Impacto:** Exposición de PII de clientes y datos de facturación.
- **Estado posterior:** Mitigado vía migraciones `001_rls_cierra_pagos_y_config.sql`, `002_rls_pedidos.sql` y `004_rls_cadetes.sql`.

### S-2 · Las escrituras ya estaban protegidas
- **Evidencia:** `VERIFICADO`. Un `INSERT` de prueba en `productos` devolvió `42501: new row violates row-level security policy for table "productos"`.
- **Conclusión:** RLS siempre estuvo activo; el problema residía en políticas permisivas de `SELECT`.

### S-3 · Hijack de notificaciones push
- **Evidencia:** `VERIFICADO` (`app/api/webpush/suscribir-cliente/route.ts`).
- **Qué:** Endpoint no validaba titularidad de pedido antes de actualizar la suscripción con `service_role`.
- **Estado:** `RESUELTO`. Se implementó validación de sesión de cliente / claim-once y rate limiting.

### S-4 · `schema.sql` no documenta ninguna política de seguridad
- **Evidencia:** `MEDIDO`. Cero `ENABLE ROW LEVEL SECURITY` y cero `CREATE POLICY`.
- **Estado:** Políticas migradas formalmente a `supabase/migrations/`.

### S-5 · Rate limit suplantable vía `x-forwarded-for`
- **Evidencia:** `VERIFICADO` (`lib/rate-limit.ts`).
- **Qué:** Toma del primer valor de `x-forwarded-for`. Dependiente de si el reverse proxy sobreescribe la cabecera.

### S-6 · `/api/streetview` sin auth ni rate limit
- **Evidencia:** `SUBAGENTE` (`app/api/streetview/route.ts`).
- **Qué:** Proxyea `GOOGLE_MAPS_API_KEY`.
- **Estado:** Pendiente de verificación.

### S-7 · Fuga de mensajes de error internos
- **Evidencia:** `SUBAGENTE`. Devolución de `error.message` crudo de Supabase en endpoints de error.
- **Estado:** Parcialmente abordado con `lib/api-error.ts` (`responderError`).

### S-8 · Secretos o rutas absolutas de desarrollo
- **Evidencia:** `SUBAGENTE` (`scripts/auditar-web-vitals.mjs`).

---

## 2. Datos y arquitectura

### D-1 · `lib/comparativa.ts` leía cierres de caja desde el navegador
- **Evidencia:** `VERIFICADO`.
- **Qué:** Consulta directa client-side a `cierres_diarios`.
- **Estado:** `RESUELTO`. Movido a endpoint autenticado `/api/admin/comparativa`.

### D-2 · Se escribe el catálogo completo en cada descuento de stock
- **Evidencia:** `VERIFICADO` en cadena de contextos.
- **Qué:** Consumo descuenta stock sincronizando todo el catálogo por POST.
- **Estado:** Propuesto endpoint dedicado puntual `PATCH /api/admin/catalogo/:id/stock`.

### D-3 · Escaneo total de tabla con filtro en JavaScript
- **Evidencia:** `SUBAGENTE` (`app/api/admin/metricas-avanzadas/route.ts`).

### D-4 · Bucles N+1 de escritura
- **Evidencia:** `SUBAGENTE` (ej. updates repetitivos en breadcrumbs de ubicación).

### D-5 · Índices en columnas calientes
- **Evidencia:** `MEDIDO`. Sugeridos índices en `pedidos.cadete_id`, `telefono`, estados compuestos. Abordado en migración `003`.

### D-6 · Tablas vacías en base de datos
- **Evidencia:** `VERIFICADO`. `usuarios`, `clientes` con 0 filas en consulta de auditoría inicial; login operando mediante credenciales de entorno de fallback.

### D-7 · Discrepancia en variables de entorno de fallback
- **Evidencia:** `VERIFICADO`. Desfase de nombres en `.env.example` vs `lib/auth-server.ts`.

### D-8 · `select('*')` con hashes de contraseñas
- **Evidencia:** `SUBAGENTE`. Peticiones que traían columnas innecesarias.

---

## 3. Repositorio e higiene

### R-1 · Submódulos fantasma
- **Evidencia:** `VERIFICADO`. Directorios de app flutter en índice git.
- **Estado:** `RESUELTO` (`git rm --cached`).

### R-2 · Scripts de prueba con service_role
- **Evidencia:** `VERIFICADO`. Scripts `test*.js` en raíz.
- **Estado:** Agregados a `.gitignore`, pendientes de depuración de tracking.

### R-3 · Tooling y suites de prueba
- **Evidencia:** `MEDIDO`. Cero tests unitarios o e2e; dependencia del compilador estricto de TypeScript (`npm run typecheck`) y del validador de esquema.

### R-4 · Presencia de tipos `any`
- **Evidencia:** `SUBAGENTE`. Aproximadamente 274 usos de `any` en codebase.

### R-5 · Documentación desfasada
- **Evidencia:** Desfases entre README antiguo y versiones reales de Next.js y rutas.

### R-6 · Discrepancia entre `schema.sql` y el código real
- **Evidencia:** `VERIFICADO`. Diferencias en nombres de campos (`usuario` vs `username`, `clave_hash` vs `password_hash`).

---

## 4. Frontend y rendimiento

### F-1 · Análisis de bundles
- Chunks pesados de `maplibre-gl` y librerías de procesamiento de imágenes. Aclaración: ML corre bajo `import()` dinámico.
### F-2 · Catálogo estático en el bundle
- `datos/productos.ts` empaquetado para soporte offline / fallback.
### F-3 · Modales globales en Root Layout
- `ModalHerramientasTesteo` montado en layout principal.
### F-4 · Providers de alta jerarquía
- `ProveedorPedidos` cubriendo vistas públicas.
### F-5 · Memoización en Contextos
- Re-renders derivados de objetos de contexto recreados sin `useMemo`.
### F-6 · Frecuencias de polling
- Múltiples `setInterval` en componentes de seguimiento y mapas en vivo.
### F-7 · Estandarización de componentes UI
- Proliferación de `<button>` e `<input>` nativos por fuera de primitivas unificadas.
### F-8 · Protección de `/dev-tools`
- Advertencia inicial sobre visibilidad de `/dev-tools`; posteriormente protegido en `proxy.ts`.
### F-9 · Coexistencia de múltiples librerías de toasts
### F-10 · Coexistencia de versiones de tienda (`/tienda` vs `/tienda-v2`)

---

## 4-bis. Adenda de arreglos (30/09/2026)

- Verificación de políticas RLS aplicadas: `pedidos`, `cierres_diarios`, `stock_movimientos`, `tienda_metadata` cerradas a `anon` (0 filas retornadas).
- Instalación y corrección de errores reales detectados por ESLint (refs mutados en render, imports y variables sin uso).
- Creación de migración `004_rls_cadetes.sql`.
