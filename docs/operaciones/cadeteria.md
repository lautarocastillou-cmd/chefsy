# Operaciones — Cadetería y Logística de Reparto

## 1. Visión General del Flujo de Envíos

El módulo de cadetería coordina el despacho de pedidos de delivery desde el local gastronómico hasta el cliente final, integrando:
1. **Panel de Despacho (`/cadeteria`)**: Asignación de pedidos a repartidores activos y liquidación de viajes.
2. **Torre de Control (`/torre-control`)**: Mapa en vivo con la posición geográfica de toda la flota de cadetes y los pedidos en camino.
3. **Tracking del Cliente (`/cadete-en-vivo/[id]`)**: Enlace público con mapa en tiempo real que el cliente recibe para visualizar la llegada de su pedido.
4. **Telemetría Móvil**: Envío periódico de coordenadas GPS desde la aplicación del repartidor (Flutter o navegador móvil).

---

## 2. Asignación y Operativa en Panel (`/cadeteria`)

- Cuando un pedido pasa al estado `listo`, el despachante selecciona el cadete disponible y lo transiciona a `en_camino`.
- El sistema vincula el `cadete_id` en el registro del pedido.
- En la vista de cadetería se calculan los montos base y adicionales por viaje según la configuración operativa y la distancia recorrida.

---

## 3. Telemetría GPS y Regla de Rendimiento

```
[ App Móvil del Cadete ]
         │ (Ping GPS cada 3–4 s con token)
         ▼
[ POST /api/public/ubicacion ]
         │ (Escritura mediante service_role)
         ▼
[ Tabla `cadetes` ] ───(Broadcast ligero)───> [ /torre-control y /cadeteria ]
```

> [!IMPORTANT]
> **Aislamiento de la tabla `pedidos`**:  
> Los pings de geolocalización enviados por los cadetes actualizan **únicamente** la tabla `cadetes` (`lat`, `lng`, `accuracy`, `heading`, `speed`, `gps_activo`, `bateria`, `updated_at`).  
> **Está prohibido actualizar la tabla `pedidos` en cada ping de GPS**, dado que detonaría refetches continuos en el tablero de pedidos y saturaría el consumo de base de datos.

---

## 4. Visualización Pública del Cliente (`/cadete-en-vivo/[id]`)

- El cliente accede a una URL única generada con el ID del pedido.
- El componente de mapa ([`MapaSeguimiento.tsx`](file:///c:/Users/lauta/Desktop/chefsy/components/ubicacion/MapaSeguimiento.tsx)) se inicializa en el cliente mediante `dynamic(..., { ssr: false })` para evitar errores de renderizado en servidor.
- Muestra el destino del cliente, el local de origen y la posición actualizada del cadete asignado, con estimación de tiempo de arribo.

---

## 5. Seguridad y Acceso

- **Protección RLS**: La tabla `cadetes` se encuentra protegida contra lecturas anónimas vía `004_rls_cadetes.sql`. La anon key del navegador no puede consultar los números telefónicos ni las coordenadas de los repartidores.
- **Acceso Administrativo**: El panel de cadetería lee el estado mediante `/api/admin/cadetes`, con sesión administrativa controlada por [`proxy.ts`](file:///c:/Users/lauta/Desktop/chefsy/proxy.ts). La app del cadete envía ubicación mediante `/api/public/ubicacion` con su autenticación específica.
