# Migraciones de base de datos — Chefsy

Esta carpeta es la fuente de verdad del esquema y de la seguridad de la base.
Antes no existía: los SQL estaban sueltos en la raíz (`schema.sql`,
`migracion_en_camino.sql`) y `schema.sql` estaba desactualizado respecto del
código real (leía `usuarios.username`/`password_hash` cuando el código usa
`usuario`/`clave_hash`, y leía `clientes_cuentas` cuando el código usa
`clientes`).

## Cómo aplicar

```bash
supabase db push                      # si usás Supabase CLI
```

O pegar el contenido del archivo en Supabase Studio → SQL Editor.

Las migraciones son **idempotentes**: se pueden correr más de una vez.

## Archivos

| Archivo | Qué hace | Estado |
|---|---|---|
| `001_rls_cierra_pagos_y_config.sql` | Cierra la lectura de `anon` sobre cierres de caja, stock, turnos, consumos, metadata, configuración interna y usuarios. | **Aplicada** (verificado 2026-09-29: las 10 tablas devuelven 0 filas a `anon`) |
| `002_rls_pedidos.sql` | Cierra la lectura de `anon` sobre `pedidos`, la última tabla con PII de clientes abierta. | **Pendiente de aplicar** |

## `pedidos` ya no está abierto (migración 002)

Cuando se escribió `001`, `pedidos` quedó afuera a propósito porque seis lugares
la leían directo desde el navegador. Eso ya se resolvió: ninguno lo hace más.

| Antes (con `anon`, en el bundle) | Ahora |
|---|---|
| `contexto/PedidosContexto.tsx` | `GET /api/admin/pedidos` (nuevo) |
| `hooks/usePedidosRealtime.ts` | idem + `GET /api/admin/pedidos?activos=1` |
| `hooks/useAgendaClientes.ts` | idem |
| `components/cadeteria/ModalBreadcrumbTrail.tsx` | `GET /api/admin/pedidos/[id]/ruta` (nuevo) |
| `app/cadete-en-vivo/[id]/layout.tsx` | `service_role` en el servidor |
| `suscribirAPedidos` (`postgres_changes`) | canal `broadcast` + refetch |

El Realtime era la parte difícil y quedó resuelta con el enfoque de
**señal, no datos**: el servidor emite un broadcast con `{id, tipo}` al
escribir un pedido, y el panel refetchea por el route handler autenticado. El
payload mínimo no contiene PII, así que el canal no filtra nada aunque sea
público. Ver `lib/pedidos-broadcast.ts`.

**Antes de aplicar 002**, hay que desplegar el código: si se cierra la tabla sin
desplegar los route handlers nuevos, el panel deja de cargar pedidos.

## Lo que 002 no cierra

`/api/public/rastreo` y `/api/public/maptest/activos` siguen devolviendo datos
de pedidos a quien conozca un id, porque usan `service_role` y filtran a mano.
Los ids son `ped-<timestamp>-<random>`, así que no son adivinables, pero un link
de tracking filtrado (por WhatsApp, por ejemplo) alcanza para ver el nombre y la
dirección. Arreglarlo requiere probar titularidad sin romper el flujo de
tracking que el cliente usa por diseño: es un cambio aparte, con decisión de
producto de por medio.

## Verificación

Después de aplicar, `anon` debe recibir 401/403 en las tablas cerradas y 200 en
`productos` / `categorias`. Al final de cada migración hay comandos concretos.
