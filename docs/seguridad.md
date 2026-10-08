# Directrices de Seguridad — Chefsy

## 1. Modelo de Amenazas y Postura General

Chefsy maneja datos sensibles de clientes (nombres, números de teléfono, direcciones y geolocalizaciones en vivo) y de negocio (facturación, arqueo de caja y márgenes de stock).

Para resguardar estos datos, el sistema implementa una política de **defensa en profundidad** compuesta por:
1. Políticas de Seguridad a Nivel de Fila (RLS) en PostgreSQL.
2. Interceptor de rutas en Edge Runtime ([`proxy.ts`](file:///c:/Users/lauta/Desktop/chefsy/proxy.ts)).
3. Tokens criptográficamente firmados con namespaces separados para personal y clientes.
4. Sanitización estricta de mensajes de error de base de datos en respuestas API.

---

## 2. Acceso a la Base de Datos y Políticas RLS

### Regla Fundamental: Ningún dato de negocio se consulta con la Clave Anónima
La clave pública de Supabase (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) se distribuye en el bundle del navegador. En consecuencia:
- **Tablas Bloqueadas a `anon`**:
  - `pedidos` (Contiene PII de clientes y detalle de compras).
  - `cadetes` (Contiene ubicación GPS en vivo y teléfonos de repartidores; confirmar en producción que `004_rls_cadetes.sql` ya haya sido aplicada).
  - `cierres_diarios`, `turnos` (Contiene balance contable y arqueos).
  - `stock_movimientos`, `stock_ingredientes`, `stock_recetas`.
  - `usuarios`, `clientes`, `consumos_personal`, `push_subscriptions`.
  - `tienda_metadata`, `configuracion_operativa`.
- **Tablas Accesibles a `anon` (Lectura Pública Exclusiva)**:
  - `categorias`, `productos`, `modificadores`, `catalogo`, `configuracion_tienda`.

### Patrón Seguro en Servidor
Toda consulta o mutación sobre tablas protegidas debe ejecutarse exclusivamente desde un Route Handler o Server Component autenticado mediante [`obtenerSupabaseAdmin()`](file:///c:/Users/lauta/Desktop/chefsy/lib/supabase-admin.ts):

```ts
// ❌ INCORRECTO: Petición directa con cliente anónimo desde el navegador
const { data } = await supabaseAnon.from('pedidos').select('*')

// ✅ CORRECTO: Route handler con verificación previa de sesión y cliente admin
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerSesion } from '@/lib/auth-server'

export async function GET() {
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { data, error } = await obtenerSupabaseAdmin().from('pedidos').select('id, cliente, total')
  // ...
}
```

---

## 3. Autenticación y Control de Acceso

### A. Personal y Panel de Control (Staff / Admin / Cadetes)
- **Token JWT**: Generado y verificado con la biblioteca `jose` usando la variable `CHEFSY_JWT_SECRET`.
- **Almacenamiento**: Cookie `HttpOnly` `chefsy-token`.
- **Interceptor Edge**: [`proxy.ts`](file:///c:/Users/lauta/Desktop/chefsy/proxy.ts) intercepta las rutas protegidas (`/dashboard`, `/pedidos`, `/cierre`, `/dev-tools`, `/cadeteria`, `/api/admin/*`) antes de llegar a la lógica de negocio, validando la firma del token y verificando que el rol coincida con las `REGLAS_ACCESO`.
- **Plan de Contingencia (Fallback de credenciales)**:
  En caso de que la tabla `usuarios` no cuente con registros configurados, la autenticación valida contra variables de entorno (`CHEFSY_ADMIN_PASS` y `CHEFSY_CADETE_PASS`). Las contraseñas en base de datos emplean `bcryptjs` (cost 12).

### B. Sesiones de Clientes Finales
- Para evitar ataques de *confused-deputy*, los tokens emitidos para clientes en la tienda utilizan un secreto derivado con namespace propio (`secreto + ':clientes'`) implementado en `lib/auth-cliente-server.ts`. Un token emitido para un cliente jamás tiene validez ante los endpoints administrativos.

---

## 4. Sanitización de Errores (Anti-Data Leaks)

Los objetos de error arrojados por PostgreSQL (`error.message`) contienen nombres de esquemas, tablas, columnas y restricciones internas. Bajo ninguna circunstancia deben retornarse al cliente web.

Se debe utilizar el helper unificado [`responderError`](file:///c:/Users/lauta/Desktop/chefsy/lib/api-error.ts):

```ts
import { responderError, ErrorApi } from '@/lib/api-error'

try {
  // Lógica de operación
} catch (error) {
  // Registra el error real en los logs del servidor y responde al cliente con un mensaje genérico y seguro
  return responderError(error, { contexto: '[API Pedidos]' })
}
```

---

## 5. Notificaciones Push y Rastreo Público

- **Suscripción WebPush**: El endpoint `/api/webpush/suscribir-cliente` exige validación de propiedad del pedido asociado para impedir el secuestro de notificaciones push de terceros.
- **Rastreo de Pedidos (`/cadete-en-vivo/[id]`)**:
  - Los IDs de pedido utilizan identificadores con entropía suficiente (`ped-<timestamp>-<hash>`).
  - La visualización pública expone exclusivamente el estado actual y la última posición del repartidor asignado, sin exponer el historial completo de viajes ni listados globales de cadetes.

---

## 6. Comprobación de Seguridad

Para auditar que el bloqueo RLS de tablas críticas se mantiene efectivo:

```bash
# Debe devolver 0 filas o HTTP 401/403
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/pedidos?select=*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/cadetes?select=*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/cierres_diarios?select=*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

---

## 7. Puntos Pendientes de Verificación

- [ ] **Rate Limiting tras Proxy CDN**: Verificar que el proveedor de hosting o CDN reescriba de manera confiable la cabecera `x-forwarded-for` para evitar la suplantación de IPs en `lib/rate-limit.ts`.
- [ ] **Cuotas de APIs Externas**: Validar límites de tasa o autenticación en el proxy de Streetview / Google Maps (`/api/streetview`).
