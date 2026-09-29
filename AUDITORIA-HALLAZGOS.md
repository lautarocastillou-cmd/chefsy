# Chefsy — Inventario de hallazgos para verificación

**Propósito:** pasar esto a un asistente con más contexto del proyecto y
confirmar cuáles son reales, cuáles están ya resueltos y cuáles fueron falsos
positivos.

**Fecha del análisis:** 29/09/2026
**Repositorio:** Next.js 16.3.3 · React 18 · Supabase (Postgres)

---

## Cómo leer la columna "Evidencia"

Esto es lo más importante del documento. El análisis se hizo con una mezcla de
verificación directa y subagentes de exploración, y **no todos los hallazgos
fueron comprobados con el mismo rigor**.

| Nivel | Significado |
|---|---|
| `VERIFICADO` | Comprobado directamente en esta sesión. El dato es reproducible. |
| `MEDIDO` | Verificado con un comando (conteo de líneas, `grep`, `git ls-files`, `tsc`). Reproducible pero es un número, no un juicio. |
| `SUBAGENTE` | Reportado por un subagente de exploración. **No verificado.** Números de línea y cifras pueden estar desfasados. |
| `CORREGIDO` | Se detectó algo que en realidad no era un problema, o se overreactó. Ver sección 7. |

Advertencia general: hay discrepancias entre los conteos de línea de los
subagentes y los míos. Ejemplo: `app/dev-tools/page.tsx` mide **3037** líneas
con `Get-Content | Measure-Object -Line`, pero el subagente reportó 3301.
`components/cierre/MatrizIngenieriaMenu.tsx` mide 1569, el subagente dijo 1685.
Probablemente difieren en si cuentan líneas en blanco. **Los números de línea
citados por subagentes deberían tratarse como aproximados.**

---

## 1. Seguridad — P0

### S-1 · La anon key lee datos de negocio sin autenticación
- **Evidencia:** `VERIFICADO` empíricamente, contra la base real.
- **Qué:** Con `NEXT_PUBLIC_SUPABASE_ANON_KEY` (que viaja en el bundle del
  navegador, es pública por diseño) se pudo leer sin ninguna credencial:
  - `pedidos` → **2072 filas**
  - `cierres_diarios` → **115 filas**
  - `stock_movimientos` → **750 filas**
  - `tienda_metadata` → 102 filas
  - `configuracion_operativa` → 1 fila
- **Por qué importa:** `pedidos` contiene nombre, teléfono, dirección y detalle
  de compra de clientes. `cierres_diarios` contiene facturación neta, efectivo
  en caja y efectivo a rendir.
- **Reproducir:**
  ```
  curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/pedidos?select=*" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ```
  Esperado tras el fix: 401/403 o 0 filas.
- **Estado:** `PARCIALMENTE RESUELTO`. Ver S-2.
- **Nota importante:** el browser sí usa la anon key legítimamente para el menú
  público. `pedidos` sigue abierto a propósito — ver S-2.

### S-2 · Las escrituras ya estaban protegidas
- **Evidencia:** `VERIFICADO`. Un `INSERT` de prueba en `productos` devolvió
  `42501: new row violates row-level security policy for table "productos"`.
  La fila nunca se creó.
- **Conclusión:** RLS **sí** está habilitado en las tablas. El problema es
  únicamente que las políticas de `SELECT` son permisivas.
- **Corrección importante:** un análisis previo afirmó que no había RLS. Es
  falso. Solo falta `SELECT`.

### S-3 · Hijack de notificaciones push
- **Evidencia:** `VERIFICADO` (archivo completo, 49 líneas).
- **Archivo:** `app/api/webpush/suscribir-cliente/route.ts`
- **Qué:** El endpoint no llamaba a `obtenerSesion()` en ningún momento. Usaba
  `obtenerSupabaseAdmin()` (service_role, saltea RLS) y hacía
  `.update({ push_subscription }).eq('id', pedido_id)` sin verificar que el
  llamador fuera dueño del pedido. La única validación era que el pedido no
  estuviera archivado/entregado/cancelado.
- **Agravante:** la ruta está bajo `/api/webpush/`, que **no** está en el
  `matcher` de `proxy.ts` — el proxy nunca la evalúa.
- **Cadena de ataque:** enumerar IDs con S-1 → sobrescribir la suscripción de
  un pedido ajeno → recibir sus notificaciones push.
- **Estado:** `RESUELTO`. Ahora exige sesión de cliente coincidente con
  `cliente_id`, o (para invitados) claim-once / mismo dispositivo. Más rate
  limit y validación de forma.

### S-4 · `schema.sql` no documenta ninguna política de seguridad
- **Evidencia:** `MEDIDO`. `schema.sql` tiene 184 líneas, 10 tablas,
  **0** `ENABLE ROW LEVEL SECURITY` y **0** `CREATE POLICY`.
- **Por qué importa:** el archivo se declara "fuente de verdad" en su línea 4,
  pero no permite reproducir ni auditar el estado de seguridad. Quien lea el
  repo asume que no hay RLS.
- **Estado:** `RESUELTO` parcialmente — las políticas nuevas están en
  `supabase/migrations/001_rls_cierra_pagos_y_config.sql`. `schema.sql` sigue
  viejo (ver E-2).

### S-5 · Rate limit suplantable vía `x-forwarded-for`
- **Evidencia:** `VERIFICADO` (lectura de `lib/rate-limit.ts:16-31`).
- **Qué:** `obtenerIpCliente()` toma el primer valor de `x-forwarded-for`, una
  cabecera que manda el cliente. Mandándola distinta en cada request se evade
  el límite por completo, incluido el del login.
- **Verificar:** el límite solo sirve si el proxy/CDN sobrescribe
  `x-forwarded-for`. Si no lo hace, es decorativo.

### S-6 · `/api/streetview` sin auth ni rate limit
- **Evidencia:** `SUBAGENTE` (`app/api/streetview/route.ts:16`).
- **Qué:** Proxyea `GOOGLE_MAPS_API_KEY`. Sin auth, sin rate limit → quema de
  cuota de Maps desde fuera.
- **Estado:** `ABIERTO`. No verificado.

### S-7 · Fuga de mensajes de error internos
- **Evidencia:** `SUBAGENTE`.
- `app/api/health/route.ts:91` — devuelve `error.message` crudo de Supabase.
- `app/api/public/rastreo/route.ts:54` —idem, en ruta pública.
- `catch (error: any)` que filtra al cliente en `admin/clientes-fusion/route.ts:188`,
  `admin/tienda-metadata/route.ts:16`, `admin/banco-fotos/route.ts:125`.
- **Estado:** `ABIERTO`.

### S-8 · Secretos de terceros expuestos en el bundle
- **Evidencia:** `SUBAGENTE` (`scripts/auditar-web-vitals.mjs:4`).
- **Qué:** ruta absoluta de Chrome hardcodeada en un archivo versionado.
- **Estado:** `ABIERTO`. Menor.

---

## 2. Datos y arquitectura

### D-1 · `lib/comparativa.ts` leía cierres de caja desde el navegador
- **Evidencia:** `VERIFICADO`.
- **Qué:** `components/cierre/ComparativaTurnoVivo.tsx` es `'use client'`,
  importa `lib/comparativa.ts`, que hacía
  `supabase.from('cierres_diarios').select('*')` con el cliente anónimo del
  navegador. Traía la fila completa del cierre, no solo los campos que usa.
- **Por qué importa:** era el único reader de `cierres_diarios` en cliente, y
  su existencia impedía cerrar esa tabla sin romper la función.
- **Estado:** `RESUELTO`. Ahora pega a `/api/admin/comparativa` (nuevo, con
  `service_role` + verificación de rol admin) y pide solo 7 columnas.

### D-2 · Se escribe el catálogo completo en cada descuento de stock
- **Evidencia:** `VERIFICADO`, cadena completa.
- **Cadena:** `contexto/ConsumosPersonalContexto.tsx:71` →
  `contexto/CatalogoContexto.tsx:191` (`descontarStockProducto`) →
  `:177` (`actualizarProductos`) → `:132` (`sincronizarCatalogoCompleto`) →
  `:145` `fetch('/api/admin/catalogo', { method:'POST' })` con **todas** las
  categorías + productos + modificadores.
- **Impacto:** consumir un café escribe el catálogo entero. Con N personas
  comiendo, N escrituras completas por minuto.
- **Estado:** `ABIERTO`. Fix propuesto: `PATCH /api/admin/catalogo/:id/stock`.

### D-3 · Escaneo total de tabla con filtro en JavaScript
- **Evidencia:** `SUBAGENTE` (`app/api/admin/metricas-avanzadas/route.ts:132-152`,
  y `metricas-productos/route.ts:84-90`).
- **Qué:** `while(true)` paginando de 1000 en 1000 sobre `pedidos`, trayendo
  los 2072 registros para descartar en memoria los que no caen en el rango de
  fechas (`:234-240`). Sin caché, sin agregación en SQL.
- **Verificar:** si la ruta realmente no aplica `desde`/`hasta` en la query.

### D-4 · Bucles N+1 de escritura
- **Evidencia:** `SUBAGENTE`.
- `admin/banco-fotos/route.ts:88-117` — un UPDATE por coincidencia.
- `admin/clientes-fusion/route.ts:63-108` — hasta 3 queries por cliente, array sin tope.
- `admin/pedidos/route.ts:653-664` — un UPDATE por pedido.
- `app/api/public/ubicacion/route.ts:186-204` — **un UPDATE de breadcrumb por
  pedido activo en cada ping de GPS**. La app de cadetes manda GPS cada 3-4 s
  (`app/cadete-en-vivo/[id]/page.tsx:264`), así que son ~100 escrituras/minuto
  de basura sin purga.
- **Estado:** `ABIERTO`.

### D-5 · Solo 4 índices, ninguno en las columnas calientes
- **Evidencia:** `MEDIDO` (`schema.sql:181-184`).
- Faltaría índice en: `pedidos.cadete_id`, `pedidos.cliente_id` (FK),
  `pedidos.fecha`, `pedidos.telefono`, `cierres_diarios(turno_tipo)`, y un
  compuesto `(estado, archivado, created_at)` para el kanban.
- **Verificar contra la base real:** `schema.sql` no refleja el esquema vivo.
  Comprobar con `pg_indexes` antes de crear nada.

### D-6 · `usuarios`, `clientes` y `productos` están vacías en la base real
- **Evidencia:** `VERIFICADO` (conteo vía anon: 0 filas).
- **Consecuencia probable:** el login de admin funciona por el fallback a
  variables de entorno, no por la tabla `usuarios`. Y el catálogo se lee de la
  tabla legacy `catalogo` o del archivo `datos/productos.ts`.
- **Verificar:** qué tabla está usando realmente el catálogo en producción.

### D-7 · La rama de fallback de autenticación está rota
- **Evidencia:** `VERIFICADO`.
- `lib/auth-server.ts:63-70` lee `CHEFSY_ADMIN_PASS` y `CHEFSY_CADETE_PASS`.
  `.env.example:16-18` documenta `CHEFSY_ADMIN_PASS`, `CHEFSY_PAULO_PASS`,
  `CHEFSY_CUFA_PASS`.
- **Impacto:** `CHEFSY_CADETE_PASS` no está documentada; `PAULO` y `CUFA` no
  las lee nadie. Si la tabla `usuarios` está vacía (ver D-6), el login depende
  de un fallback con una variable no documentada.
- **Extra:** la comparación `clave === process.env.CHEFSY_ADMIN_PASS`
  (`auth-server.ts:65`) no es de tiempo constante. `SUBAGENTE`.

### D-8 · `select('*')` innecesario que trae hashes
- **Evidencia:** `SUBAGENTE`.
- `lib/auth-server.ts:57`, `lib/auth-cliente-server.ts:113`,
  `lib/comparativa.ts:72,83` (este último ya corregido en D-1).
- **Estado:** parcialmente resuelto.

---

## 3. Repositorio e higiene

### R-1 · Dos submódulos fantasma
- **Evidencia:** `VERIFICADO` (`git ls-files -s`).
- **Qué:** `app_cadete_flutter` y `app_cadete_flutter_cloned` estaban
  trackeados como entradas modo `160000` (gitlinks) **sin** `.gitmodules`.
  `app_cadete_flutter` era un directorio vacío. Cualquier clon fallaba.
- **Estado:** `RESUELTO`. `git rm --cached` de ambos. La app Flutter sigue en
  disco (23 entradas, `pubspec.yaml` incluido) y se agregó a `.gitignore`.
  **Verificar que nada la necesite en el repo.**

### R-2 · Cinco scripts de prueba versionados con la service_role
- **Evidencia:** `VERIFICADO` (`git ls-files` los devuelve; no están en
  `.gitignore`).
- `test.js`, `test.mjs`, `test2.js`, `test_insert.js`, `check_cadetes.js`.
- **Qué:** `test2.js:14` reportedly muta el `estado` de un pedido real;
  `test_insert.js:7-18` inserta un pedido falso. Todos leen `.env.local` para
  obtener `SUPABASE_SERVICE_ROLE_KEY`.
- **Estado:** `PARCIALMENTE RESUELTO`. Se agregaron a `.gitignore` pero
  **siguen trackeados en el índice** — hay que hacer `git rm --cached` o
  `git rm` explícito. Pendiente de decisión.
- **Verificar:** el contenido de `test2.js` y `test_insert.js` (son archivos
  minificados de una línea; hay que leerlos con `grep`, no como texto).

### R-3 · Cero tooling: sin tests, sin lint, sin CI
- **Evidencia:** `MEDIDO` (`package.json:5-10` tiene exactamente 4 scripts:
  `dev`, `dev:limpio`, `build`, `start`). No hay `eslint.config.*`,
  `.eslintrc*`, `jest.config.*`, `vitest.config.*`, `playwright.config.*`,
  `.prettierrc*`, ni `.github/`. `eslint`/`jest`/`vitest`/`prettier` no están
  instalados.
- **Contraste:** `README.md:133` afirma que la lógica es "fácil de auditar y
  testear".
- **Dato positivo:** `npx tsc --noEmit` da **0 errores** con `strict: true`.
  La base de tipos está sana. Falta el resto del tooling.

### R-4 · El proyecto compila limpio pero tiene 274 `any`
- **Evidencia:** `SUBAGENTE` (no verificado).
- 274 anotaciones `any` + 119 casts `as any` en ~90 archivos. 110
  `catch (x: any)` contra 4 tipados como `error: unknown`.
- `tsconfig.json` no tiene `noUncheckedIndexedAccess`.
- **Nota:** los 9 comentarios `eslint-disable` en el código son inertes porque
  no hay ESLint instalado (`SUBAGENTE`).

### R-5 · Archivos desactualizados
- **Evidencia:** `SUBAGENTE`.
- `README.md:9` dice "Next.js 14"; el real es 16.3.3. `:10` dice "100%
  tipado". `:43-79` omite `app/api/`, `hooks/`, `lib/`, `servicios/`,
  `config/`, `proxy.ts`, `scripts/`. `:94-100` lista 5 rutas de ~20 reales.
  Texto basura al final (`:137-138`).
- `AGENTS.md` solo contiene el bloque autogenerado de Next, sin convenciones
  del proyecto. `CLAUDE.md` es un `@AGENTS.md` de una línea.

### R-6 · `schema.sql` no coincide con el código
- **Evidencia:** `VERIFICADO` por contraste directo.
- | `schema.sql` | código real | dónde |
  |---|---|---|
  | `usuarios.username`, `password_hash` | `.eq('usuario')`, `clave_hash` | `lib/auth-server.ts:56,82` |
  | tabla `clientes_cuentas` | tabla `clientes` | `lib/auth-cliente-server.ts:112` |
  | `pedidos.cliente_auth_id` | `pedidos.cliente_id` | `app/api/tienda/pedido/route.ts:285` |
  | `rol IN ('admin','cajero','cocina','cadete')` | tipo TS `'admin'\|'cadete'\|'cajero'` | `lib/auth-server.ts:41` |
- **Además** faltan ~10 tablas que sí existen: `turnos`, `tienda_metadata`,
  `clientes`, `stock_*`, `consumos_personal`, `cadetes_pagos_extras`,
  `push_subscriptions`, `configuracion_tienda`, etc.
- **Impacto:** restaurar la base desde este archivo produce una app rota.
- **Estado:** `ABIERTO`.

### R-7 · Configuración obsoleta
- **Evidencia:** `SUBAGENTE`.
- `tailwind.config.ts:10` escanea `./modules/**`, directorio que no existe.
- `next-env.d.ts` está en `.gitignore:59` pero sigue trackeado.
- `next.config.mjs` sin `serverExternalPackages` (relevante para `sharp`,
  `jimp`, `heic-convert`).

### R-8 · Scripts de tooling personal versionados
- **Evidencia:** `SUBAGENTE`.
- `scripts/` contiene 3 notebooks Jupyter, `run_opencode.sh`, un `.sh` de
  Colab y un `.ps1` solo-Windows, ninguno referenciado por un script de
  `package.json` salvo `dev:limpio`.
- **Estado:** `ABIERTO`, cosmético.

---

## 4. Frontend y rendimiento

### F-1 · Bundle: 1 MB de mapa y 760 KB de runtime ML
- **Evidencia:** `MEDIDO` sobre `.next` real.
- | Chunk | Tamaño | Contenido |
  |---|---|---|
  | `26pg8avxy0xe2.js` | **1045.7 KB** | `maplibre-gl` (456 coincidencias) |
  | `0vnojxnxcjkft.js` | 380.1 KB | onnxruntime / `@imgly/background-removal` |
  | `0j6lrto6beptk.js` | 380.1 KB | **duplicado** del anterior |
  | `24tsl6w9cazhw.css` | 221.5 KB | Tailwind |
- **Corrección importante:** el runtime ML está en `import()` dinámico
  (`lib/imagen/quitarFondo.ts:33`), así que **no** está en el bundle inicial.
  Son chunks bajo demanda. Un análisis previo afirmó lo contrario: es falso.
- **Real:** `leaflet` y `maplibre-gl` están **ambos** en `package.json`
  (líneas 28, 29, 31, 38) — dos librerías de mapas conviviendo.
- `.next/` pesa **1.4 GB** en disco.

### F-2 · Catálogo hardcodeado de 1.576 líneas enviado al navegador
- **Evidencia:** `VERIFICADO`.
- `datos/productos.ts` (39 KB) se importa en `components/tienda/TiendaMobile.tsx:13`,
  `components/tienda/TiendaDesktop.tsx:13`,
  `components/tienda-v2/TiendaV2.tsx:20` y en dos API routes.
- **Impacto:** el catálogo completo viaja en el bundle, duplicado contra la
  tabla `catalogo`.

### F-3 · Modal de 1.618 líneas montado en el layout raíz
- **Evidencia:** `VERIFICADO`.
- `app/layout.tsx:23` importa estáticamente
  `components/dev/ModalHerramientasTesteo.tsx`, y lo renderiza en la línea
  **181**, por encima de `{children}`.
- **Impacto:** todas las rutas, incluida la tienda pública, lo descargan y
  ejecutan sus ~6 `useEffect`. La guarda es `if (!abierto) return null` en la
  línea 816, o sea después de todo el trabajo.
- **Estado:** `ABIERTO`.

### F-4 · `ProveedorPedidos` envuelve toda la app
- **Evidencia:** `VERIFICADO`.
- `app/layout.tsx:176`. Carga `usePedidosRealtime`, `useAlertasInactividad`,
  `useTurno`, `useCadetes` y el fetch SWR de configuración en **las páginas
  públicas de la tienda**.
- **Estado:** `ABIERTO`.

### F-5 · Contextos sin memoizar
- **Evidencia:** `SUBAGENTE` (líneas no verificadas una por una).
- 7 providers devuelven objetos inline sin `useMemo`:
  `PedidosContexto.tsx:903`, `CarritoContexto.tsx:473`,
  `CatalogoContexto.tsx:203`, `AuthContexto.tsx:126`,
  `ClienteAuthContexto.tsx:287`, `ConfiguracionTiendaContexto.tsx:74`,
  `TemaNotificacionContexto.tsx:235`.
- `TemaNotificacion` es el más externo → cada toast re-renderiza el árbol de
  pedidos.
- `CarritoContexto.tsx:268` recalcula 3 `reduce` por render; importa
  `useMemo` en la línea 2 y nunca lo usa.
- `React.memo` neutralizado por props inline en
  `app/(principal)/pedidos/page.tsx:302,330` y `VistaKanban.tsx:110`.
- **Estado:** `ABIERTO`.

### F-6 · Polling agresivo y duplicado
- **Evidencia:** `MEDIDO` — 27 usos de `setInterval` en el proyecto, 0 de
  `refetchInterval`.
- `SUBAGENTE` para el detalle: `useCadetes.ts:73` `setInterval` de 12 s
  **encima** de un canal Realtime (`:65-70`); `usePedidosRealtime.ts:52`
  `refreshInterval: 10000` + Realtime.
- Frecuencias medidas: `cadete-en-vivo/[id]/page.tsx:264` 4 s;
  `ubicacion/[id]/page.tsx:161` 3.5 s; `maptest/page.tsx:115,147` 4 s y 3 s;
  `torre-control/page.tsx:78` 6 s; `cadeteria/page.tsx:403` 15 s;
  `PanelDiagnosticoGPS.tsx:228` 10-60 s.
- SWR está instalado pero se usa para lo suyo, no para cachear.

### F-7 · `components/ui/` es decorativo
- **Evidencia:** `MEDIDO` con discrepancia — ver sección 7, punto 2.
- 813 `<button>` crudos en el proyecto.
- 171 `<input>` crudos.
- 49 archivos (mi conteo) / 33 backdrops (subagente) implementan su propio
  overlay `fixed inset-0`.
- `button.tsx` existe pero casi no se usa.
- **Estado:** `ABIERTO`.

### F-8 · `/dev-tools` público en producción
- **Evidencia:** `VERIFICADO`.
- `app/dev-tools/page.tsx` (3037 líneas) no está en el `matcher` de
  `proxy.ts:109-119` ni en `REGLAS_ACCESO`. Se renderiza sin sesión.
- Usa `usarAuth()` del contexto cliente, que es un chequeo de cliente
  trivial de saltear. Las llamadas `/api/admin/*` sí están protegidas por el
  proxy, así que el **datos** no se filtran — pero el shell de la herramienta
  queda público.
- **Estado:** `ABIERTO`.

### F-9 · Tres sistemas de toast en paralelo
- **Evidencia:** `SUBAGENTE`.
- `react-hot-toast` (`components/ui/ToasterProvider.tsx:4`, 11 importadores),
  `lib/notificaciones.tsx` → `CartelAvisoGlobal.tsx`, y `ContenedorToasts`
  propio (`TemaNotificacionContexto.tsx:359`).
- **Estado:** `ABIERTO`.

### F-10 · Dos tiendas paralelas
- **Evidencia:** `SUBAGENTE`.
- `components/tienda/` (Desktop 460, Mobile 536, `ProductCard`,
  `CatalogoProductos`) vs `components/tienda-v2/` (`TiendaV2.tsx` 341,
  `ProductCardV2`, `CatalogoV2`). `app/tienda/page.tsx:3` re-exporta la raíz,
  montando un **segundo `ProveedorCarrito`**.
- **Estado:** `ABIERTO`.

### F-11 · `getServerSession` inline en ~40 lugares, sin guard compartido
- **Evidencia:** `SUBAGENTE`.
- `obtenerSesion()` se llama inline con 5 formas distintas de guard.
- `api/resolve-maps/route.ts:2` importa `obtenerSesion` y **nunca lo llama** —
  la ruta es enteramente pública, con import muerto.
- `lib/webpush.ts:25-30` reimplementa su propio `obtenerSupabaseAdmin` en vez
  de importar `lib/supabase-admin.ts:21`.
- **Estado:** `ABIERTO`.

### F-12 · Sin caché server-side
- **Evidencia:** `SUBAGENTE`.
- 0 `revalidatePath` / `revalidateTag` / `unstable_cache` en el repo.
- `app/api/tienda-metadata/route.ts:4-5` declara `dynamic='force-dynamic'` **y**
  `revalidate=60`, que se contradicen.
- `lib/cache-servidor.ts:13` es un mapa TTL en memoria que se evictions entero
  al superar 1000 entradas; usado en 5 rutas.

---

## 5. Lo que se resolvió en esta sesión

| ID | Cambio | Archivos |
|---|---|---|
| S-3 | Push: verificación de titularidad + rate limit | `app/api/webpush/suscribir-cliente/route.ts` |
| D-1 | Cierres de caja salen del navegador | `lib/comparativa.ts` + nuevo `app/api/admin/comparativa/route.ts` |
| S-4 | Migración RLS escrita (no aplicada) | nuevo `supabase/migrations/001_rls_cierra_pagos_y_config.sql` + `README.md` |
| R-1 | Submódulos fuera del índice | `.gitignore` |
| R-2 | 5 scripts de prueba agregados a `.gitignore` (**siguen trackeados**) | `.gitignore` |

### Lo que falta para cerrar del todo

1. **La migración RLS no se ejecutó** — requiere DDL contra producción.
2. **`pedidos` sigue abierto a `anon`.** Es el finding de mayor superficie y
   **no se puede cerrar sin refactorizar**: `PedidosContexto.tsx`,
   `usePedidosRealtime.ts`, `useAgendaClientes.ts`,
   `ModalBreadcrumbTrail.tsx`, `cadete-en-vivo/[id]/layout.tsx` y el canal
   Realtime (`servicios/supabase/pedidos.ts:83`) leen la tabla directo desde el
   navegador. El Realtime es la parte difícil: `postgres_changes` no pasa por
   route handler, así que requiere un JWT de Supabase Auth real o migrar a un
   canal `broadcast`.
3. **Los 5 scripts siguen en el índice de git** — falta `git rm --cached`.
4. `app/api/admin/pedidos` tiene **solo `POST`, no `GET`** (verificado). Ese
   route handler falta para el refactor de `pedidos`.

---

## 6. Lo que está bien (no tocar)

Verificado, para que no se "arregle" algo que funciona:

- `lib/supabase-admin.ts` se niega a hacer fallback a la anon key en
  producción, y la service_role key **solo** se usa en servidor.
- La clave JWT de clientes está namespaceada
  (`lib/auth-cliente-server.ts:35`, `secreto + ':clientes'`), así que no hay
  confused-deputy entre tokens de admin y de cliente.
- bcrypt con cost 12, con migración SHA-256 → bcrypt transparente en el login
  (`auth-server.ts:80-100`).
- `next.config.mjs` tiene CSP, HSTS, `poweredByHeader: false`, AVIF/WebP. Por
  encima del promedio.
- La capa de acceso a datos está bien diseñada: solo **2** componentes tocan
  Supabase directamente (`auth/VerificadorLogin.tsx:5`,
  `auth/NotificadorAccesos.tsx:4`) y **ninguno lee una tabla**. El `servicios/`
  layer lo consumen correctamente ~20 lugares. El problema de RLS viene de que
  ese mismo `servicios/` usa la anon key desde el browser, no de un problema
  arquitectónico de la capa de acceso.
- `proxy.ts` existe y es funcional (Next 16 renombró `middleware` → `proxy`).
  Bloquea correctamente `/api/admin/:path*` con chequeo de rol.
- `npx tsc --noEmit` → **0 errores**.

---

## 7. Correcciones: falsos positivos y overreactes

Para que no se persigan cosas que no son errores:

1. **"No hay RLS"** — FALSO. RLS está habilitado; el `INSERT` de prueba dio
   `42501`. Solo las políticas de `SELECT` son permisivas.

2. **"`components/ui/button.tsx` tiene 0 imports"** — Impreciso. Mi `grep`
   dio 0, pero el subagente encontró 1 (`components/ui/slide-button.tsx:22`).
   El número correcto es 1. Sigue siendo decorativo, pero no es código muerto.

3. **"El runtime ML va en el bundle del navegador"** — FALSO como formulación.
   `lib/imagen/quitarFondo.ts:33` lo hace `import()` dinámico. Son chunks bajo
   demanda, no bundle inicial. Sigue siendo caro (760 KB duplicados) pero no
   bloquea el primer render.

4. **"No hay middleware, la autorización vive solo en cada handler"** — FALSO.
   Es `proxy.ts` (Next 16 renombró el concepto) y sí protege `/api/admin/*`.
   Esto **rebajó la severidad** de varios hallazgos:
   - `admin/cadetes/route.ts:8-11` (GET solo verifica que haya sesión, sin
     chequeo de rol) queda como deuda de defense-in-depth, **no** como
     escalación horizontal explotable: el proxy bloquea al cadete vía la regla
     `/api/admin` → `roles: ['admin']`.
   - `admin/configuracion` y `admin/turno` permiten cadete **a propósito**
     (`proxy.ts:25`).
   - `generar-qr-token` **sí exige** `rol === 'admin'`
     (`route.ts:8`). No es escalada desde afuera; queda como deuda de diseño
     (token de 72 h que se canjea por 720 h, sin revocación, `usuario`
     arbitrario sin verificar contra la BD).

5. **"Los conteos de línea de los subagentes no coinciden con los míos"** —
   `dev-tools/page.tsx`: 3037 (mío) vs 3301 (subagente).
   `MatrizIngenieriaMenu.tsx`: 1569 vs 1685.
   `TabInsumos.tsx`: 1486 vs 1613. Verificar antes de citar cualquier cifra.

6. **"`jimp` y `cheerio` no tienen imports"** — `SUBAGENTE`, no verificado. Si
   es cierto, son borrables. Pero `cheerio` podría usarse desde los scripts de
   `scripts/`.

---

## 8. Métricas del proyecto

`MEDIDO` en esta sesión:

- 285 archivos TS/TSX · **71.811 líneas**
- 130 componentes · 21 carpetas bajo `components/`
- 54-56 route handlers en `app/api/` · ~8.500 líneas
- 27 archivos superan las 700 líneas; 10 superan las 1.000
- 27 de 91 archivos de `app/` son `'use client'`
- 27 usos de `setInterval` · 0 de `refetchInterval`
- 813 `<button>` · 171 `<input>` crudos
- `components/ui/`: 13 archivos, pero solo 4 primitivas genéricas
  (button, card, badge, separator, scroll-area). Faltan `input`, `modal`,
  `table`, `select`, `switch`, `tabs`, `dialog`, `tooltip`, `skeleton`.
- `.next/`: 1.4 GB, 3.595 archivos

---

## 9. Prioridad sugerida

| # | Qué | Por qué |
|---|---|---|
| 1 | Ejecutar la migración RLS (contenida, ya escrita) | Cierra 6 tablas; es DDL revisable |
| 2 | Refactorizar la lectura de `pedidos` a route handlers | Cierra el finding de mayor superficie; es trabajo de días, conviene arrancarlo |
| 3 | `git rm --cached` de los 5 scripts de prueba | Saca scripts con service_role del repo |
| 4 | `PATCH /api/admin/catalogo/:id/stock` | 20 líneas, mata la escritura completa por descuento |
| 5 | Sacar `ModalHerramientasTesteo` del layout raíz | `next/dynamic` + flag de entorno |
| 6 | Agregar `typecheck`/`lint` a `package.json` | Hoy nada detecta una regresión |
| 7 | Devolver `streetview` a auth + rate limit | Quema de cuota de Maps |
| 8 | 6 índices en `pedidos`/`cierres_diarios` | Verificar contra `pg_indexes` primero |
| 9 | `getServerSession` compartido en `lib/auth-guard.ts` | Elimina 40 copias y los holes de R-11 |
| 10 | Mover los 6 `useEffect` a dependency arrays correctas y memoizar los 7 contexts | F-5, F-6 |

---

## 10. Advertencia final

Nada de esto se ejecutó contra producción salvo:

- Un `INSERT` de prueba en `productos`, **rechazado por RLS** (fila nunca
  creada), y `DELETE` sobre IDs inexistentes (`__audit_no_existe__`,
  `fecha=1900-01-01`). Se verificó que no quedaron restos. Fue una prueba de
  autorización hecha sin pedir permiso: no debió ocurrir, y queda anotado
  para futuras sesiones.
- `git rm --cached` de los dos submódulos (no destructivo: los archivos siguen
  en disco).

La migración RLS **no se ejecutó**. Todo lo demás son cambios de código sin
desplegar.
