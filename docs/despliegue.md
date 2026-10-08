# Guía de Despliegue — Chefsy

## 1. Plataforma de Alojamiento y Servicios

El entorno de producción de Chefsy se compone de dos proveedores principales:
1. **Vercel**: Hospeda la aplicación Next.js 16 (páginas estáticas, Server Components, Route Handlers y el interceptor Edge [`proxy.ts`](file:///c:/Users/lauta/Desktop/chefsy/proxy.ts)).
2. **Supabase**: Provee la base de datos PostgreSQL, canal Realtime para eventos de cambio, autenticación auxiliar y almacenamiento de medios (Storage).

---

## 2. Proceso de Construcción (Build Pipeline)

El script de construcción oficial configurado en [`package.json`](file:///c:/Users/lauta/Desktop/chefsy/package.json) es:

```bash
npm run build
```

Internamente ejecuta:
```bash
npm run verificar:esquema && next build
```

### Barrera de Protección Automática
Antes de generar los paquetes compilados de Next.js, se ejecuta [`scripts/verificar-esquema.mjs`](file:///c:/Users/lauta/Desktop/chefsy/scripts/verificar-esquema.mjs). Si el código hace referencia a una columna que no existe en el esquema validado de producción, el proceso arroja código de error `1` y **Vercel aborta el despliegue**, evitando caídas en producción por errores `42703 column does not exist`.

---

## 3. Variables de Entorno Requeridas

Asegurarse de tener configuradas las siguientes variables en el panel de Vercel para cada entorno que se vaya a ejecutar (Production y, si corresponde, Preview). La lista se basa en el código actual; `.env.example` no incluye todas las variables privadas de producción, por lo que debe revisarse antes de configurar Vercel:

### Supabase
| Variable | Ámbito | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Público (Browser & Server) | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público (Browser & Server) | Clave pública anónima (restringida por RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | Privado (Solo Servidor) | Clave de administración para Route Handlers. |

### Autenticación y Seguridad
| Variable | Ámbito | Descripción |
|---|---|---|
| `CHEFSY_JWT_SECRET` | Privado (Solo Servidor/Edge) | Secreto criptográfico para firma de tokens JWT. |
| `CHEFSY_ADMIN_PASS` | Privado (Solo Servidor) | Contraseña de acceso de respaldo para administrador. |
| `CHEFSY_CADETE_PASS` | Privado (Solo Servidor) | Contraseña de acceso de respaldo para repartidores. |

### Integraciones y Notificaciones
| Variable | Ámbito | Descripción |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Público | Clave pública VAPID para notificaciones WebPush. |
| `VAPID_PRIVATE_KEY` | Privado | Clave privada VAPID para envío de pushes. |
| `GOOGLE_MAPS_API_KEY` | Privado | Clave usada por el proxy de Street View; revisar autenticación y rate limit de `/api/streetview` antes de exponerlo públicamente. |

---

## 4. Secuencia Segura de Despliegue con Migraciones

Al coordinar cambios de código que involucren cambios en la base de datos:

### Caso A: Agregar nuevas tablas o columnas
1. **Paso 1**: Aplicar el archivo SQL en Supabase Studio (`supabase/migrations/00X_...sql`).
2. **Paso 2**: Actualizar [`datos/esquema-verificado.json`](file:///c:/Users/lauta/Desktop/chefsy/datos/esquema-verificado.json).
3. **Paso 3**: Realizar el push a la rama principal para que Vercel construya y despliegue el código que consume esas columnas.

### Caso B: Bloquear tablas mediante políticas RLS (ej. migración 002 y 004)
1. **Paso 1**: Desplegar el código que migra las lecturas directas del cliente a Route Handlers con sesión autenticada.
2. **Paso 2**: Verificar que el cliente ya no realiza consultas anónimas a esa tabla.
3. **Paso 3**: Aplicar la migración RLS en Supabase para cerrar el acceso `anon`.

---

## 5. Lista de Verificación Post-Despliegue

- [ ] Comprobar `/api/health` o respuesta HTTP 200 en la raíz.
- [ ] Iniciar sesión en `/dashboard` con las credenciales correspondientes.
- [ ] Confirmar que el panel `/pedidos` carga datos y sincroniza en tiempo real.
- [ ] Abrir `/tienda` en dispositivo móvil y comprobar la navegación entre categorías y el carrito.
- [ ] Ejecutar prueba de comanda en `/imprimir/[id]` verificando el renderizado de la comanda térmica.
