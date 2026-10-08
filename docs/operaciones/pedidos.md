# Operaciones — Gestión y Ciclo de Vida de Pedidos

## 1. Ciclo de Vida y Máquina de Estados

Todo pedido procesado por Chefsy transita por una máquina de estados controlada:

```
[ nuevo ] ──> [ en_cocina ] ──> [ listo ] ──> [ en_camino ] ──> [ entregado ] (Terminal)
    │               │               │               │
    └───> [ cancelado ] (Terminal, cancelable desde cualquier fase activa)
```

- **`nuevo`**: Ingresado desde la tienda web o creado manualmente desde el mostrador.
- **`en_cocina`**: Comanda aceptada y en proceso de elaboración por la cocina.
- **`listo`**: Elaboración finalizada, a la espera de retiro en local o despacho con cadete.
- **`en_camino`**: Asignado a un repartidor y en tránsito hacia la dirección del cliente.
- **`entregado`**: Completado satisfactoriamente (estado terminal).
- **`cancelado`**: Descartado por falta de stock, pedido duplicado o solicitud del cliente (estado terminal).
- **Bandera `archivado`**: Permite ocultar visualmente pedidos de turnos anteriores en el tablero principal sin eliminarlos del historial contable ni de las métricas.

---

## 2. Canales de Entrada de Pedidos

### A. Tienda Pública Online (`/tienda` / `/`)
1. El cliente selecciona productos y opciones desde el catálogo responsivo.
2. Configura dirección y ubicación en mapa interactivo (si es delivery) o retiro en local.
3. Se calcula el costo de envío automáticamente según la distancia al local.
4. Se despacha la orden hacia el endpoint de creación de pedido y opcionalmente se abre la conversación estructurada de WhatsApp para confirmar el comprobante de transferencia o pago.

### B. Carga Manual en Salón (`/nuevo-pedido`)
- Permite a cajeros y operadores cargar pedidos presenciales o telefónicos con búsqueda rápida de clientes recurrentes e insumos.

---

## 3. Tablero Operativo (Vista de Pedidos en `/pedidos`)

- **Vistas Disponibles**:
  - El panel opera con **cuadrícula** como visualización predeterminada (diseño modular con tarjetas completas y filtros de estado) y opción alternativa de **lista vertical**.
  - El modo de visualización tipo tablero / Kanban (`VistaKanban.tsx` y `TarjetaPedidoCompacta.tsx`) ha sido retirado para simplificar la interfaz operativa y optimizar el rendimiento de renderizado.
- **Sincronización en Tiempo Real**:
  - Utiliza [`PedidosContexto.tsx`](file:///c:/Users/lauta/Desktop/chefsy/contexto/PedidosContexto.tsx) con SWR.
  - Los cambios de estado realizados por otros operadores o la cocina se propagan mediante canales `broadcast` (`lib/pedidos-broadcast.ts`), provocando un refresco selectivo e inmediato.
- **Actualizaciones Optimistas**:
  - Al cambiar el estado de un pedido, la interfaz reacciona instantáneamente antes de que la API confirme la persistencia en PostgreSQL (`mutate(..., false)`).
- **Alertas de Demora**:
  - [`AlertaPedidosDemoradosFlotante.tsx`](file:///c:/Users/lauta/Desktop/chefsy/components/pedidos/AlertaPedidosDemoradosFlotante.tsx) advierte al personal sobre pedidos que exceden el tiempo límite estimado en preparación o despacho.

---

## 4. Impresión Térmica de Comandas (`/imprimir/[id]`)

- El sistema genera tickets térmicos en formato estándar (58 mm / 80 mm).
- Al confirmar un pedido en el panel, se invoca la ruta [`app/imprimir/[id]/page.tsx`](file:///c:/Users/lauta/Desktop/chefsy/app/imprimir/[id]/page.tsx) dentro de un `iframe` invisible, disparando el cuadro de diálogo de impresión local sin interrumpir la navegación del cajero.
- **Precaución**: Mantener invariable la estructura del array JSON `pedido.productos` para no romper la maquetación de los tickets de cocina.
