# Base de Datos y Modelos — Chefsy

## 1. Fuente de Verdad del Esquema

La fuente oficial del esquema de base de datos y de las políticas de seguridad son los archivos versionados en [`supabase/migrations/`](file:///c:/Users/lauta/Desktop/chefsy/supabase/migrations/):

- `001_rls_cierra_pagos_y_config.sql`: Bloquea lectura `anon` sobre cierres de caja, stock, turnos, consumos y configuración.
- `002_rls_pedidos.sql`: Bloquea lectura `anon` sobre la tabla `pedidos`.
- `003_indice_pedidos_telefono.sql`: Añade el índice `idx_pedidos_telefono` para consultas sobre `pedidos.telefono`; verificar su aplicación en producción.
- `004_rls_cadetes.sql`: Preparada para bloquear lectura `anon` sobre la tabla `cadetes`; confirmar su aplicación en el proyecto Supabase antes de afirmar que el bloqueo está activo.

> [!WARNING]
> **El archivo `schema.sql` en la raíz está desactualizado.**  
> Contiene discrepancias de nombres (`usuarios.username` vs `usuario`, `clientes_cuentas` vs `clientes`, `password_hash` vs `clave_hash`) y omite tablas creadas recientemente. No debe emplearse para reconstruir una base desde cero.

---

## 2. Modelos de Datos Críticos

### A. Tabla `pedidos`
Es el núcleo transaccional del sistema.
- **Campos principales**:
  - `id`: Cadena única alfanumérica (ej. `ped-172761-abcde`).
  - `cliente`: Nombre del cliente final.
  - `telefono`: Teléfono de contacto / WhatsApp.
  - `tipoEntrega`: `'delivery'` | `'retiro'`.
  - `direccion`: Dirección física o aclaraciones de entrega.
  - `coordenadas`: Objeto JSON con `{ lat: number, lng: number }`.
  - `productos`: Array JSON con los ítems pedidos, cantidades, precios unitarios y modificadores elegidos.
  - `total`: Monto total a abonar (ARS).
  - `costoEnvio`: Monto imputado por el servicio de cadetería.
  - `estado`: Máquina de estados: `'nuevo'` | `'en_cocina'` | `'listo'` | `'en_camino'` | `'entregado'` | `'cancelado'`.
  - `archivado`: Booleano para ocultar pedidos de turnos pasados sin borrarlos.
  - `metodoPago`: `'efectivo'` | `'tarjeta'` | `'transferencia'`.
  - `cadete_id`: Identificador foráneo opcional hacia la tabla `cadetes`.
  - `created_at`: Marca temporal ISO.

### B. Tabla `cadetes`
Maneja el estado y posicionamiento del equipo de reparto.
- **Campos principales**:
  - `id`: Identificador del cadete.
  - `nombre`, `telefono`, `activo`: Datos del repartidor.
  - `lat`, `lng`, `accuracy`, `heading`, `speed`: Telemetría en tiempo real.
  - `gps_activo`, `bateria`: Estado del dispositivo móvil.
  - `updated_at`: Marca temporal del último ping recibido.

> [!IMPORTANT]
> **Regla de rendimiento en tiempo real**: Los pings periódicos de GPS (enviados cada pocos segundos desde la app móvil o el navegador) actualizan exclusivamente la tabla `cadetes`. **Nunca deben mutar la tabla `pedidos`**, evitando así detonar re-renders masivos e innecesarios en el panel general de pedidos.

### C. Tabla `cierres_diarios` y `turnos`
- Gestiona el arqueo de caja por turnos (mediodía/noche), saldo inicial, ventas por canal de cobro (efectivo, tarjeta, transferencias), gastos operativos y rendiciones de cadetes.

### D. Tablas de Catálogo y Menú
- `categorias`: Clasificación del menú (Burgers, Lomitos, Bebidas, etc.).
- `productos`: Ítems con precios base, descripción y estado activo.
- `modificadores`: Opciones de personalización (puntos de cocción, agregados, aderezos).
- `tienda_metadata`: Enriquecimiento visual para la tienda pública (URLs de imágenes optimizadas y textos comerciales).

### E. Tabla `clientes`
- CRM de clientes, historial de visitas y acumulación de beneficios.
- **Nota sobre el campo de puntos**: El campo verificado en base de datos es `puntos_actuales` (no utilizar la denominación legacy `puntos`).

---

## 3. Verificación Automática de Esquema (`scripts/verificar-esquema.mjs`)

Para prevenir que regresiones de código pasen desapercibidas en compilación (dado que TypeScript no valida nombres de columnas en tiempo de ejecución), el proyecto cuenta con un verificador estricto:

```bash
npm run verificar:esquema
```

- **Mecanismo**: El script escanea el código en busca de consultas a Supabase (`.select(...)`, `.update(...)`, `.order(...)`) y las contrasta contra el inventario verificado en [`datos/esquema-verificado.json`](file:///c:/Users/lauta/Desktop/chefsy/datos/esquema-verificado.json).
- **Control en Build**: Está integrado en la fase previa de construcción (`npm run build`). Si se solicita una columna inexistente, el proceso se interrumpe y aborta el despliegue a producción.

---

## 4. Aplicación de Migraciones

Para ejecutar cambios de base de datos en Supabase:
1. Crear un script numerado en `supabase/migrations/` (ej. `005_nueva_tabla.sql`).
2. Diseñar el script de forma **idempotente** (`IF NOT EXISTS`, comprobaciones previas).
3. Aplicar mediante Supabase CLI (`supabase db push`) o en el Editor SQL de Supabase Studio.
4. Actualizar el inventario en [`datos/esquema-verificado.json`](file:///c:/Users/lauta/Desktop/chefsy/datos/esquema-verificado.json) y verificar con `npm run verificar:esquema`.
