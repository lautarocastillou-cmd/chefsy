# Mantenimiento y Flujo de Desarrollo — Chefsy

## 1. Configuración del Entorno Local

### Requisitos Previos
- **Node.js**: Versión 20 o superior.
- **NPM**: Versión 10 o superior.
- **Git** y terminal PowerShell (en entornos Windows) o Bash.

### Pasos Iniciales
1. Clonar el repositorio y acceder a la carpeta:
   ```bash
   git clone <repo-url> chefsy
   cd chefsy
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno:
   ```bash
   cp .env.example .env.local
   ```
   Completar las variables correspondientes a Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), secretos JWT y contraseñas de acceso local.

---

## 2. Scripts Disponibles en `package.json`

| Comando | Función |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo de Next.js en `http://localhost:3000`. |
| `npm run dev:limpio` | Script de PowerShell que elimina la caché `.next` y relanza el entorno de desarrollo limpio. |
| `npm run typecheck` | Ejecuta `tsc --noEmit`. Debe finalizar con **0 errores** bajo tipado estricto. |
| `npm run lint` | Ejecuta ESLint sobre el proyecto. |
| `npm run verificar:esquema` | Contrasta las consultas SQL del código contra el esquema validado en `datos/esquema-verificado.json`. |
| `npm run build` | Ejecuta la verificación de esquema y procede con la compilación de producción de Next.js. |
| `npm run start` | Arranca la aplicación compilada en modo producción. |

---

## 3. Herramientas de Diagnóstico (`/dev-tools`)

- **Ruta**: `/dev-tools`
- **Seguridad**: La ruta está incluida en el matcher de [`proxy.ts`](file:///c:/Users/lauta/Desktop/chefsy/proxy.ts) y requiere una sesión con rol `admin`.
- **Funcionalidad**: Proporciona utilidades para simular pedidos, monitorear el estado de telemetría de cadetes, inspeccionar cachés locales con TTL y verificar la conectividad de red con los servicios de Supabase.

---

## 4. Navegación y Menú Esperado en el Panel Operativo

La barra de navegación principal ([`Sidebar.tsx`](file:///c:/Users/lauta/Desktop/chefsy/components/layout/Sidebar.tsx) y [`BottomNavMobile.tsx`](file:///c:/Users/lauta/Desktop/chefsy/components/layout/BottomNavMobile.tsx)) expone las siguientes rutas activas:
- **Dashboard**: `/dashboard` (métricas y actividad en tiempo real)
- **Pedidos**: `/pedidos` (gestión operativa en cuadrícula / lista vertical; modo kanban retirado)
- **Nuevo Pedido**: `/nuevo-pedido` (alta manual de comandas)
- **Cadetería**: `/cadeteria` (despacho y asignación a repartidores)
- **Torre de Control**: `/torre-control` (mapa general de flota y pedidos)
- **Cierre de Caja**: `/cierre` (arqueo de caja y conciliación de turnos)
- **Clientes**: `/clientes` (CRM y agenda telefónica)
- **Productos**: `/productos` (catálogo gastronómico)
- **Configuración**: `/configuracion` (ajustes del local)

> [!NOTE]
> La entrada `/configuracion/stock` fue retirada deliberadamente de los menús de navegación. El motor de stock se encuentra dormido y no accesible desde la UI regular, preservando la integración de datos para reactivación futura.

---

## 5. Regla de oro para la UI

Antes de crear controles visuales nuevos, revisar `components/ui/` y reutilizar los componentes compatibles con shadcn/ui que ya existan. Si falta una pieza, consultar durante el desarrollo la biblioteca local disponible en `C:\\Users\\lauta\\Desktop\\flota-web\\components\\ui`; no importar directamente desde ese proyecto, sino copiar/adaptar el componente necesario y sus dependencias dentro de Chefsy. Solo usar una implementación propia cuando no exista una pieza compatible o cuando el comportamiento sea específico del dominio.

## 6. Buenas Prácticas y Resolución de Problemas Frecuentes

1. **Errores de Parámetros Dinámicos en Next.js 16**:
   - En Next 16, `params` y `searchParams` en componentes de servidor son asíncronos. Siempre resolver con `const { id } = await params`.
2. **Componentes con Leaflet y Mapas**:
   - La librería Leaflet requiere acceso inmediato a `window`. Nunca importar directamente en Server Components; utilizar `dynamic(() => import('...'), { ssr: false })`.
3. **Diferencias de Hidratación en Clientes Móviles**:
   - Si un componente depende del tamaño de ventana (`window.innerWidth`), verificar que el estado se aplique tras el montaje (`useEffect` con bandera `montado = true`) o renderizar la versión adecuada en el cliente.
4. **Rebotes de Estado en SWR**:
   - Al realizar mutaciones de pedidos o cadetes, aplicar mutación optimista local (`mutate(..., false)`) para actualizar la UI inmediatamente mientras la API procesa la solicitud en segundo plano.
