# Chefsy — Sistema de pedidos y operación gastronómica

Chefsy es una aplicación web para la operación de un local gastronómico o dark kitchen. Incluye tienda pública, gestión de pedidos, catálogo, cadetería con seguimiento GPS, clientes, cierre de caja e impresión de comandas.

## Stack

- **Next.js 16.3.3** con App Router y `proxy.ts`.
- **React 18** y TypeScript 5 con `strict: true`.
- **Supabase**: PostgreSQL, Realtime, Storage y clientes de servidor/navegador.
- **Tailwind CSS 3**, Radix UI, Lucide React.
- **SWR** y Context API para datos remotos y estado compartido.
- **Leaflet** para mapas operativos y **MapLibre GL** en vistas experimentales.
- **Vercel** como destino de despliegue previsto.

## Inicio rápido

### Requisitos

Node.js 20 o superior, npm y acceso a un proyecto Supabase.

```bash
npm install
cp .env.example .env.local
npm run dev
```

En Windows también está disponible:

```bash
npm run dev:limpio
```

La aplicación queda disponible en `http://localhost:3000`.

### Variables de entorno

Completar `.env.local` a partir de [`.env.example`](.env.example). En producción son especialmente importantes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — solo servidor; nunca debe exponerse al navegador.
- `CHEFSY_JWT_SECRET`
- `CHEFSY_ADMIN_PASS` y `CHEFSY_CADETE_PASS` si se utiliza el fallback de autenticación.

Las integraciones opcionales de Web Push, mapas y WhatsApp requieren las variables correspondientes. No commitear `.env.local` ni secretos.

## Comandos

| Comando | Función |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run dev:limpio` | Elimina `.next` y reinicia el desarrollo en Windows. |
| `npm run typecheck` | Ejecuta TypeScript sin emitir archivos. |
| `npm run lint` | Ejecuta ESLint. |
| `npm run verificar:esquema` | Contrasta referencias de columnas con `datos/esquema-verificado.json`. |
| `npm run build` | Ejecuta el verificador de esquema y luego compila Next.js. |
| `npm run start` | Ejecuta el build de producción. |

Actualmente no hay una suite de tests automatizados ni workflows de CI versionados. Antes de enviar cambios, ejecutar al menos `typecheck`, `lint` y `verificar:esquema`; para validar el despliegue, ejecutar `build`.

## Estructura principal

```text
app/
├── page.tsx                    # Entrada de la tienda pública
├── tienda/                     # Tienda pública alternativa/enlace
├── (principal)/                # Panel protegido: pedidos, dashboard, productos, etc.
├── cadete-en-vivo/[id]/        # Tracking público de un pedido
├── ubicacion/[id]/             # Vista pública de ubicación
├── imprimir/[id]/              # Comanda/ticket para iframe de impresión
├── maptest/                    # Vistas experimentales de mapas
└── api/                        # Route Handlers de auth, pedidos, catálogo y operaciones

components/                     # UI organizada por dominio
contexto/                       # Providers de pedidos, catálogo, carrito y sesiones
hooks/                          # Hooks de datos y sincronización
servicios/supabase/             # Acceso de dominio a Supabase
tipos/                          # Tipos compartidos
datos/productos.ts              # Respaldo estático del catálogo
lib/                            # Auth, Supabase, cachés y utilidades
proxy.ts                        # Control de acceso por ruta y rol
supabase/migrations/            # Migraciones SQL versionadas
```

La documentación detallada está en [`docs/`](docs/):

- [Arquitectura](docs/arquitectura.md)
- [Seguridad](docs/seguridad.md)
- [Base de datos](docs/base-de-datos.md)
- [Despliegue](docs/despliegue.md)
- [Guía de contribución](CONTRIBUTING.md)
- [Desarrollo y mantenimiento](docs/mantenimiento/desarrollo.md)
- [Operaciones](docs/operaciones/)

## Módulos y rutas

### Panel interno

El grupo `app/(principal)` contiene las rutas protegidas por `proxy.ts`:

- `/dashboard`: métricas y resumen operativo.
- `/pedidos`: gestión de pedidos (vista de cuadrícula predeterminada o lista vertical).
- `/nuevo-pedido`: carga manual.
- `/cadeteria`: despacho y operación de repartidores.
- `/torre-control`: mapa global de cadetes.
- `/cierre`: cierre y arqueo de caja.
- `/clientes`: gestión de clientes.
- `/productos`: catálogo interno.
- `/configuracion`: configuración general (módulo de stock dormido y retirado de la navegación principal).

`/dev-tools` es una herramienta de diagnóstico administrativa. `/maptest` contiene vistas experimentales y no forma parte del flujo operativo principal.

### Tienda y tracking

- `/` y `/tienda`: tienda pública.
- `/cadete-en-vivo/[id]`: tracking público del pedido.
- `/ubicacion/[id]`: vista pública de ubicación.
- `/imprimir/[id]`: render del ticket/comanda.

## Pedido y sincronización

El flujo operativo principal es:

```text
nuevo → en_cocina → listo → en_camino → entregado
  └──────────────────────────────────────→ cancelado
```

`entregado` y `cancelado` son estados terminales. `archivado` es una bandera independiente para ocultar pedidos antiguos sin eliminar su historial.

Los datos administrativos se consultan mediante Route Handlers autenticados. Para actualizar la interfaz, Supabase Realtime se utiliza como señal `broadcast` mínima y el cliente vuelve a pedir los datos mediante la API autenticada; el broadcast no debe transportar PII.

Los pings GPS actualizan la ubicación del cadete, no la fila de `pedidos`. La estructura de `pedido.productos` debe mantenerse compatible con [`app/imprimir/[id]/page.tsx`](app/imprimir/[id]/page.tsx).

## Seguridad y base de datos

- La `anon key` es pública y solo debe usarse para operaciones expresamente públicas.
- Los datos de negocio deben pasar por Route Handlers con sesión validada y `obtenerSupabaseAdmin()`.
- Los errores internos no deben devolverse sin sanitizar; usar `responderError`.
- Las migraciones en [`supabase/migrations/`](supabase/migrations/) son la referencia para cambios SQL y políticas RLS.
- [`datos/esquema-verificado.md`](datos/esquema-verificado.md) explica la snapshot usada por el verificador.
- `schema.sql` es un archivo legacy y no debe utilizarse para reconstruir producción sin revisarlo.

Consulta [docs/seguridad.md](docs/seguridad.md) y [supabase/migrations/README.md](supabase/migrations/README.md) antes de modificar acceso a datos.

## Limitaciones conocidas

- No hay tests automatizados ni CI versionado.
- La snapshot del esquema debe regenerarse después de cambios en Supabase.
- El catálogo tiene una ruta estática de respaldo en `datos/productos.ts`; confirmar la fuente de verdad antes de modificar productos.
- Los endpoints de tracking público tienen requisitos de privacidad propios; revisar su flujo antes de endurecerlos.

## Documentación histórica

La auditoría técnica de septiembre de 2026 se conserva en [`docs/historico/auditoria-2026-09-29.md`](docs/historico/auditoria-2026-09-29.md). Es un registro histórico, no una descripción automática del estado actual.
