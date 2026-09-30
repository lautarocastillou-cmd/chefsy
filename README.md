# Chefsy — Sistema de pedidos

Aplicación de gestión de pedidos para un local gastronómico, con tienda online
pública, panel de administración, reparto con seguimiento GPS en vivo y cierre
de caja.

---

## Stack

- **Next.js 16.3.3** con App Router y Turbopack
- **React 18** con Context API + `useReducer` (sin librería de estado externa)
- **TypeScript 5** en `strict`
- **Supabase** (Postgres + Auth + Realtime + Storage) como backend
- **Tailwind CSS 3** para estilos
- **Vercel** para despliegue

### Paquetes que mungkin no reconocés

| Paquete | Para qué lo usa Chefsy |
|---|---|
| `jose` | Firma y verifica los tokens de sesión (JWT) |
| `bcryptjs` | Hashea las contraseñas del panel |
| `swr` | Cachea datos del servidor y los refresca solos |
| `leaflet` | Los mapas de seguimiento de repartidores (5 componentes) |
| `maplibre-gl` | El mapa 3D de prueba de `/maptest` |
| `sharp` / `heic-convert` | Procesa las fotos de productos |
| `fuse.js` | Búsqueda difusa de clientes por nombre |
| `web-push` | Notificaciones push al cliente |
| `recharts` | Gráficos de métricas |
| `framer-motion` / `lenis` | Animaciones y scroll suave |

---

## Cómo ejecutarlo

### 1. Dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completar `.env.local` con los valores reales. Ver
[`.env.example`](.env.example) para el detalle de cada variable.

> **Ojo:** la tabla `usuarios` está vacía en producción, así que el login del
> panel funciona con el plan B de variables de entorno
> (`CHEFSY_ADMIN_PASS` / `CHEFSY_CADETE_PASS`). Si faltan esas dos, nadie
> puede entrar.

### 3. Desarrollo

```bash
npm run dev
```

Queda en [http://localhost:3000](http://localhost:3000).

### Scripts disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Corre el build |
| `npm run typecheck` | `tsc --noEmit`, debe dar 0 errores |
| `npm run dev:limpio` | Borra `.next` y reinicia (Windows) |

> **Todavía no hay linter, tests ni CI.** `next lint` está en el `package.json`
> pero no hay configuración de ESLint. Cuando modifiques código, corré
> `npm run typecheck` antes de pushear: hoy es lo único que detecta una
> regresión.

---

## Estructura

```
chefsy/
├── app/
│   ├── layout.tsx              # Layout raíz: envuelve todo en los providers
│   ├── (principal)/            # Panel interno, con sidebar
│   │   ├── layout.tsx
│   │   ├── dashboard/          # Métricas del día
│   │   ├── pedidos/            # Kanban de pedidos
│   │   ├── cadeteria/          # Vista del repartidor
│   │   ├── cierre/             # Cierre de caja
│   │   ├── clientes/           # CRM de clientes
│   │   ├── configuracion/      # Ajustes del local
│   │   ├── productos/          # Catálogo
│   │   └── torre-control/      # Mapa general de repartidores
│   ├── tienda/                 # Tienda pública (clientes)
│   ├── cadete-en-vivo/[id]/    # Tracking público del pedido
│   ├── ubicacion/[id]/         # Tracking del repartidor
│   ├── api/                    # 57 route handlers (ver abajo)
│   └── maptest/                # Mapa 3D de prueba
│
├── components/                 # 130 componentes
│   ├── tienda/ (28)            # Tienda pública
│   ├── pedidos/ (16)           # Kanban y tarjetas
│   ├── ui/ (13)                # Primitivas (Button, Card, Badge...)
│   ├── cierre/ (12)            # Cierre de caja
│   ├── cadeteria/ (8)          # Vista del repartidor y breadcrumbs
│   └── ...
│
├── contexto/                   # Estado global (Context API)
│   ├── PedidosContexto.tsx     # El principal: pedidos, cadetes, turnos
│   ├── CatalogoContexto.tsx    # Productos, categorías, modificadores
│   ├── CarritoContexto.tsx     # Carrito de la tienda
│   ├── AuthContexto.tsx        # Sesión del staff
│   ├── ClienteAuthContexto.tsx # Sesión del cliente
│   └── TemaNotificacionContexto.tsx
│
├── servicios/supabase/         # Única capa que habla con la base
│   ├── pedidos.ts
│   ├── catalogo.ts
│   ├── configuracion.ts
│   └── stock.ts
│
├── hooks/                      # 12 hooks
│   ├── usePedidosRealtime.ts   # Carga de pedidos + señal de cambios
│   ├── useCadetes.ts
│   ├── useAgendaClientes.ts
│   └── useSincronizacionOffline.ts
│
├── lib/                        # Utilidades y lógica de negocio
│   ├── auth-server.ts          # Validación de credenciales del staff
│   ├── auth-cliente-server.ts  # Tokens de clientes (namespaceados)
│   ├── supabase-admin.ts       # Cliente service_role (solo servidor)
│   ├── rate-limit.ts           # Rate limiting por IP
│   ├── api-error.ts            # Respuestas de error seguras
│   ├── pedidos-broadcast.ts    # Señal de "cambió algo" en pedidos
│   ├── motor-clientes.ts       # Detección de clientes duplicados
│   ├── stock-motor.ts          # Kardex de insumos
│   └── ubicacion.ts            # Geocodificación y rutas
│
├── tipos/                      # Tipos TypeScript
├── datos/productos.ts          # Catálogo hardcodeado de respaldo
├── proxy.ts                    # Control de acceso por rol (antes "middleware")
├── supabase/migrations/        # Migraciones SQL (fuente de verdad del esquema)
└── schema.sql                  # ⚠️ DESACTUALIZADO, ver más abajo
```

### Los 57 endpoints de `app/api/`

| Grupo | Cantidad | Quién puede llamarlos |
|---|---|---|
| `/api/admin/*` | 29 | Staff, según el rol (lo define `proxy.ts`) |
| `/api/public/*` | 7 | Cualquiera |
| `/api/clientes/*` | 5 | Cliente con sesión |
| `/api/auth/*` | 4 | Login, logout, verificación |
| `/api/webpush/*` | 3 | Notificaciones push |
| `/api/tienda/*` | 2 | Tienda pública |
| `/api/cadeteria/*` | 2 | Cadete |
| Otros | 5 | `/api/health`, `/api/streetview`, etc. |

---

## Estados de un pedido

```
Nuevo → En Cocina → Listo → En Camino → Entregado
   ↓         ↓        ↓         ↓
 Cancelado (desde cualquier estado activo)
```

`cancelado` y `entregado` son terminales. `archivado` es una bandera aparte:
marca el pedido como cerrado sin borrar el historial.

---

## Rutas

### Panel interno (requiere sesión de staff)

| Ruta | Qué es |
|---|---|
| `/dashboard` | Métricas del día y pedidos recientes |
| `/pedidos` | Kanban de pedidos |
| `/nuevo-pedido` | Crear pedido |
| `/cadeteria` | Vista del repartidor |
| `/torre-control` | Mapa general de todos los repartidores |
| `/cierre` | Cierre de caja |
| `/clientes` | CRM con detección de duplicados |
| `/productos` | Catálogo |
| `/configuracion` | Ajustes del local |
| `/dev-tools` | Herramientas de diagnóstico (**solo admin**) |
| `/maptest` | Mapa 3D de prueba |

### Público (sin sesión)

| Ruta | Qué es |
|---|---|
| `/tienda` | Tienda online |
| `/cadete-en-vivo/[id]` | Seguimiento de un pedido |
| `/ubicacion/[id]` | Seguimiento del repartidor |
| `/privacidad`, `/terminos`, `/sobre-nosotros` | Legales |

---

## Seguridad

Estas son las reglas que hay que respetar al tocar el código. Están todas
aplicadas; no son sugerencias.

### La base no se lee desde el navegador

La `anon key` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) viaja dentro del bundle: es
pública por diseño. **Ninguna tabla con datos de negocio se lee con ella.**

`pedidos`, `cierres_diarios`, `stock_*`, `turnos`, `consumos_personal`,
`tienda_metadata`, `configuracion_operativa`, `usuarios`, `clientes` y
`push_subscriptions` están cerradas a `anon` por RLS. Solo el menú público
(`categorias`, `productos`, `modificadores`, `catalogo`) se lee desde el
navegador, a propósito.

Para leer datos de negocio: **route handler con `obtenerSupabaseAdmin()`**, que
valida la sesión primero. Hay dos helpers para no olvidarse:

```ts
// Mal: la key viaja al bundle
const { data } = await supabaseAnon.from('pedidos').select('*')

// Bien: pasa por el servidor, que valida la sesión
const { data } = await obtenerSupabaseAdmin().from('pedidos').select('id')
```

### Los errores no se filtran al cliente

`error.message` de Supabase trae nombres de tabla, columna y constraints. Va
al log del servidor, nunca a la respuesta. Usar el helper:

```ts
import { responderError, ErrorApi } from '@/lib/api-error'

// Error interno: el cliente ve un mensaje genérico
return responderError(error, { contexto: '[API Stock]' })

// Error que sí es para el usuario (decisión consciente)
throw new ErrorApi('El archivo supera los 5 MB.', 413)
```

Única excepción: `/api/admin/debug`, que existe justamente para mostrar qué
tablas fallan.

### Roles

`proxy.ts` (antes `middleware`) controla el acceso por prefijo de ruta. Next 16
renombró middleware a proxy; si buscás esa palabra en la documentación
vieja, es esto.

---

## Base de datos

La fuente de verdad del esquema es [`supabase/migrations/`](supabase/migrations/),
no `schema.sql`. Para ver las migraciones aplicadas y su estado de seguridad:

```bash
# Verificar que una tabla cerrada sigue cerrada
curl "$URL/rest/v1/pedidos?select=*" -H "apikey: $ANON"
# debe devolver 0 filas
```

> **⚠️ `schema.sql` está desactualizado.** Nombra columnas y tablas que no
> coinciden con el código (`usuarios.username` vs `usuario`,
> `clientes_cuentas` vs `clientes`, `password_hash` vs `clave_hash`) y le
> faltan ~10 tablas que sí existen. **No usarlo para armar una base desde
> cero**: produce una app rota. Ver el issue pendiente de regenerarlo.

---

## Cosas que faltan

- **Tests.** No hay ninguno. `npm run typecheck` es la única red de seguridad.
- **CI.** No hay `.github/workflows`. La verificación es manual.
- **Lint.** El script existe pero no hay config de ESLint.
- **Catálogo en la base.** `datos/productos.ts` (1.576 líneas) es la fuente
  real del menú; la tabla `productos` está vacía. Agregar un producto hoy
  implica editar código y redesplegar.
- **Dos tiendas.** `/tienda` y `/tienda-v2` conviven.
