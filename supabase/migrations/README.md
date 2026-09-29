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

| Archivo | Qué hace |
|---|---|
| `001_rls_cierra_pagos_y_config.sql` | Cierra la lectura de `anon` sobre cierres de caja, stock, turnos, consumos, metadata, configuración interna y usuarios. |

## Por qué `pedidos` sigue abierto

La anon key es pública por diseño: viaja en el bundle del navegador. Antes de
`001`, cualquiera podía leer los 2.072 pedidos (con nombre, teléfono, dirección
y detalle de compra) y los 115 cierres de caja.

`001` cierra todo lo que el navegador no necesita, pero **no puede cerrar
`pedidos`** sin romper la app, porque estas lecturas ocurren directo desde el
cliente con la anon key:

- `contexto/PedidosContexto.tsx` (histórico y activos)
- `hooks/usePedidosRealtime.ts` (SWR + Realtime)
- `hooks/useAgendaClientes.ts`
- `components/cadeteria/ModalBreadcrumbTrail.tsx` (`ruta_historial`)
- `app/cadete-en-vivo/[id]/layout.tsx`
- Realtime: `servicios/supabase/pedidos.ts` (`suscribirAPedidos`)

El bloqueo real de `pedidos` es un refactor, no una migración: hay que crear
`GET /api/admin/pedidos` (hoy solo tiene `POST`) y `GET /api/public/pedidos/:id`
con un token de tracking, y apuntar esas lecturas a los route handlers. El
Realtime es la parte difícil: `postgres_changes` no pasa por route handler, así
que requiere o un JWT de Supabase Auth de verdad, o cambiar a un canal
`broadcast` que el servidor empuje.

Mientras tanto, `pedidos` es **deuda de seguridad conocida y documentada**, no
un descuido. Como mitigación parcial se puede reducir el `SELECT` de `anon` a un
subconjunto de columnas sin PII (los teléfonos y direcciones pasarían a leerse
solo por route handler), pero eso requiere el mismo refactor.

Nota: para reducir el riesgo ya mismo, la superficie del menú público
(`categorias`, `productos`, `modificadores`, `catalogo`) es lo único que
`anon` debería poder leer. Todo lo demás debería ir por service_role.

## Verificación

Después de aplicar, `anon` debe recibir 401/403 en las tablas cerradas y 200 en
`productos` / `categorias`. Al final de cada migración hay comandos concretos.
