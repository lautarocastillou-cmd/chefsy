# Guía de Contribución — Chefsy

¡Bienvenido al repositorio de Chefsy! Para mantener la estabilidad, rendimiento y seguridad de la plataforma gastronómica, todo desarrollo debe seguir las pautas descritas en este documento.

---

## 1. Comandos de Validación Obligatorios

Antes de abrir un Pull Request o enviar cambios a la rama principal, se deben ejecutar y aprobar los siguientes comandos:

```bash
# 1. Verificación estricta de tipos de TypeScript (debe arrojar 0 errores)
npm run typecheck

# 2. Análisis estático de código
npm run lint

# 3. Validación de consistencia con el esquema real de base de datos
npm run verificar:esquema
```

---

## 2. Convenciones de Desarrollo

### Next.js 16 (App Router)
- **Parámetros de Ruta Asíncronos**: En Next.js 16, `params` y `searchParams` en componentes de servidor y route handlers son promesas. Es obligatorio usar `await params` antes de acceder a sus propiedades.
- **Interceptor Edge**: El control de rutas y roles se gestiona en [`proxy.ts`](file:///c:/Users/lauta/Desktop/chefsy/proxy.ts).

### TypeScript y Tipado Estricto
- Evitar el uso de `any`. Preferir interfaces concretas en [`tipos/`](file:///c:/Users/lauta/Desktop/chefsy/tipos/) o `unknown` con discriminadores de tipo.
- Manejar errores en bloques `catch` tipándolos como `error: unknown` y extrayendo mensajes mediante helpers seguros.

---

## 3. Reglas Estrictas para Supabase y Base de Datos

1. **Cero Lecturas Anónimas de Negocio**:
   - La clave pública anónima de Supabase (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) **nunca** debe utilizarse en componentes de cliente para consultar pedidos, cadetes, cierres de caja o stock.
   - Las operaciones sobre tablas protegidas deben delegarse a Route Handlers en `app/api/*` utilizando [`obtenerSupabaseAdmin()`](file:///c:/Users/lauta/Desktop/chefsy/lib/supabase-admin.ts) previa validación de la sesión.
2. **Sanitización de Errores**:
   - Nunca responder al cliente con `error.message` crudo de Supabase. Emplear el helper [`responderError`](file:///c:/Users/lauta/Desktop/chefsy/lib/api-error.ts) de `lib/api-error.ts`.
3. **Migraciones Idempotentes**:
   - Todo cambio de esquema debe registrarse como un archivo SQL numerado en `supabase/migrations/` e incluir directivas que permitan re-ejecuciones seguras (`IF NOT EXISTS`, comprobaciones de políticas).
   - Si se modifican columnas, actualizar la instantánea en [`datos/esquema-verificado.json`](file:///c:/Users/lauta/Desktop/chefsy/datos/esquema-verificado.json).

---

## 4. Regla de oro: componentes UI reutilizables

- **Preferir shadcn/ui siempre que sea posible**: antes de crear un botón, input, modal, diálogo, card, select, tooltip, tabla, tabs u otro control visual desde cero, revisar los componentes existentes en `components/ui/` y reutilizarlos o componerlos.
- Si falta un componente adecuado, consultar la biblioteca local de componentes shadcn/ui disponible en `C:\\Users\\lauta\\Desktop\\flota-web\\components\\ui` durante el desarrollo. No importar archivos directamente desde otro proyecto: copiar o adaptar únicamente el componente necesario a `chefsy/components/ui/`, verificando sus dependencias y estilos.
- Solo implementar una variante propia cuando shadcn/ui no cubra el comportamiento necesario o cuando el componente tenga requisitos específicos de la tienda, mapas, impresión o interacción táctil. En ese caso, mantener la API y los estilos coherentes con `components/ui/`.
- Esta regla no obliga a reemplazar componentes de dominio ya existentes de forma masiva. Aplica especialmente a código nuevo y a los componentes que se modifiquen.

### Componentes con Mapas y Leaflet

- **Cero `window` en SSR**: Cualquier componente que haga uso de Leaflet (`MapaSeguimiento`, `MapaSelector`) o MapLibre debe importarse dinámicamente:
  ```tsx
  const MapaSeguimiento = dynamic(() => import('@/components/ubicacion/MapaSeguimiento'), {
    ssr: false,
  })
  ```
- **Aislamiento de Telemetría**: Las actualizaciones frecuentes de GPS de cadetes deben realizarse sobre la tabla `cadetes`, **nunca** sobre `pedidos`.

---

## 5. Integridad de Impresión y Respaldo Offline

- **Comandas Térmicas**: La ruta [`app/imprimir/[id]/page.tsx`](file:///c:/Users/lauta/Desktop/chefsy/app/imprimir/[id]/page.tsx) depende de la estructura interna del JSON de productos de cada pedido. No alterar los campos de producto sin verificar el renderizado del ticket térmico.
- **Catálogo Offline**: El archivo [`datos/productos.ts`](file:///c:/Users/lauta/Desktop/chefsy/datos/productos.ts) es la red de contingencia de la tienda pública. Todo cambio a los tipos de catálogo debe reflejarse en este archivo estático.

---

## 6. Proceso de Revisión de Cambios

1. Confirmar que los tres comandos de validación pasen exitosamente.
2. Probar visualmente en vistas móviles y de escritorio.
3. Asegurar que las rutas nuevas que expongan datos administrativos estén declaradas en `proxy.ts`.
