# Operaciones — Gestión del Catálogo y Menú

## 1. Estructura del Catálogo

El menú comercial de Chefsy se organiza en tres niveles principales:
1. **Categorías**: Agrupadores visuales del menú (Hamburguesas, Lomitos, Pizzas, Bebidas, Promos).
2. **Productos**: Artículos individuales con precio base, descripción y estado (activo, pausado, agotado).
3. **Modificadores y Opciones**: Personalizaciones configurables por el cliente (puntos de cocción de carne, aderezos, agregados con costo adicional). *(Las opciones de cocción específicas para empanadas —horno/fritas— y su modal dedicado fueron eliminados del catálogo activo y de la lógica del pedido).*

---

## 2. Administración Interna (`/productos`)

Desde el panel administrativo de productos el personal puede:
- Dar de alta o editar artículos y precios en pesos argentinos (ARS).
- Activar o pausar temporalmente la disponibilidad de productos por falta de insumos.
- Configurar grupos de modificadores requeridos u opcionales (con mínimos y máximos de selección).
- Asignar imágenes de producto y descripciones específicas para la tienda pública.

---

## 3. Respaldo Estático Offline (`datos/productos.ts`)

Para asegurar la alta disponibilidad de la tienda pública frente a caídas temporales de conectividad o demoras en el backend:
- El proyecto mantiene una instantánea del catálogo en [`datos/productos.ts`](file:///c:/Users/lauta/Desktop/chefsy/datos/productos.ts).
- Si la llamada a Supabase no responde en el tiempo previsto, la tienda utiliza estos datos para continuar permitiendo la navegación y el armado de pedidos.

> [!CAUTION]
> **Compatibilidad de Esquema**: Al renombrar o eliminar propiedades en los tipos de producto ([`tipos/catalogo.ts`](file:///c:/Users/lauta/Desktop/chefsy/tipos/catalogo.ts)), debe actualizarse en sincronía el archivo `datos/productos.ts` para no provocar discrepancias de tipado ni errores de ejecución en la tienda pública.

---

## 4. Gestión y Optimización de Imágenes

- **Almacenamiento**: Las fotos de productos se alojan en Supabase Storage o Cloudinary.
- **Validación de Imagen**: La tienda utiliza la función [`esImagenValida(url)`](file:///c:/Users/lauta/Desktop/chefsy/lib/tienda-helpers.ts) para discriminar entre productos con fotografía real cargada y aquellos que deben mostrar el contenedor placeholder estilizado (*squircle* con icono de cubiertos).
- **Formatos y CDN**: Las imágenes se procesan a través de `next/image` con compresión moderna (WebP y AVIF) y caching en borde.

---

## 5. Estado del Módulo de Stock e Insumos

> [!NOTE]
> **Módulo de stock dormido (oculto de la interfaz)**:  
> El módulo visual de stock (`/configuracion/stock`) se encuentra temporalmente deshabilitado en los menús de navegación para simplificar la operatoria diaria. Los motores de kardex (`lib/stock-motor.ts`, `registrarVentaKardex`, `restituirVentaKardex`, `descontarStockProducto`) permanecen preservados e inactivos en el backend para permitir su reactivación futura sin rehacer la integración con pedidos.
> 
> Asimismo, los ítems y flujos específicos de cocción de empanadas han sido retirados de forma definitiva del catálogo activo.
