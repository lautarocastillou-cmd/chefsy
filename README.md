# Chefsy — Sistema Interno de Pedidos

Sistema de gestión de pedidos para locales gastronómicos. Etapa 1: base funcional.

---

## Stack

- **Next.js 14** con App Router
- **TypeScript** (código 100% tipado)
- **Tailwind CSS** (estilos utilitarios)
- **React Context + useReducer** (estado en memoria, sin librerías externas)

---

## Cómo ejecutar

### 1. Instalar dependencias

```bash
npm install
```

### 2. Iniciar en modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

### 3. Build para producción

```bash
npm run build
npm run start
```

---

## Estructura del proyecto

```
chefsy/
├── app/
│   ├── layout.tsx                    # Layout raíz con providers
│   ├── page.tsx                      # Redirige a /dashboard
│   ├── globals.css                   # Estilos globales Tailwind
│   ├── (principal)/                  # Grupo de rutas con sidebar
│   │   ├── layout.tsx                # Layout con Sidebar + Header
│   │   ├── dashboard/page.tsx        # Métricas del día
│   │   ├── pedidos/page.tsx          # Lista de pedidos con filtros
│   │   └── nuevo-pedido/page.tsx     # Formulario de nuevo pedido
│   └── cadeteria/
│       └── page.tsx                  # Vista mobile del repartidor
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx               # Navegación lateral
│   │   └── Header.tsx                # Encabezado con título y fecha
│   ├── pedidos/
│   │   ├── TarjetaPedido.tsx         # Tarjeta de pedido con acciones
│   │   ├── BadgeEstado.tsx           # Badge de color por estado
│   │   └── FormularioPedido.tsx      # Formulario de creación
│   └── dashboard/
│       └── TarjetaMetrica.tsx        # Tarjeta de métrica numérica
│
├── contexto/
│   └── PedidosContexto.tsx           # Estado global + useReducer
│
├── datos/
│   └── pedidosMock.ts                # Datos de prueba
│
├── tipos/
│   └── index.ts                      # Tipos TypeScript centralizados
│
└── lib/
    └── utils.ts                      # Utilidades: cn(), formatearPrecio(), etc.
```

---

## Flujo de estados de un pedido

```
Nuevo → En Cocina → Listo → En Reparto → Entregado
                                        ↘ Cancelado (desde cualquier estado activo)
```

---

## Rutas disponibles

| Ruta             | Vista                         |
|------------------|-------------------------------|
| `/`              | Redirige a `/dashboard`       |
| `/dashboard`     | Métricas y pedidos recientes  |
| `/pedidos`       | Lista completa con filtros    |
| `/nuevo-pedido`  | Formulario de nuevo pedido    |
| `/cadeteria`     | Vista mobile del repartidor   |

---

## Cómo seguir escalando

### Etapa 2: Persistencia
- Reemplazar `datos/pedidosMock.ts` con llamadas a una API REST o Supabase
- El contexto ya tiene `agregarPedido` y `cambiarEstado` listos para conectar

### Etapa 3: Autenticación
- Agregar `next-auth` con roles: operador, cocina, cadete
- Usar middleware de Next.js para proteger rutas por rol

### Etapa 4: Tiempo real
- Integrar WebSockets o Supabase Realtime para que cocina y cadetería se actualicen solos

### Etapa 5: Menú y productos
- Crear módulo `/menu` para gestionar productos del menú
- Agregar autocompletado de productos en `FormularioPedido`

### Notas de escalado
- El contexto puede migrar a Zustand sin cambiar los componentes (solo el hook `usarPedidos`)
- Todos los tipos están centralizados en `tipos/index.ts` — fácil de extender
- Los componentes son independientes del origen de datos

---

## Decisiones de arquitectura

| Decisión | Razón |
|----------|-------|
| Route Group `(principal)` | Separa el layout con sidebar del layout simple de cadetería |
| `useReducer` en lugar de `useState` múltiple | Lógica centralizada, fácil de auditar y testear |
| Sin `useEffect` para datos | Los mock son síncronos; la migración a async es limpia |
| Componentes sin animaciones | Prioridad en funcionalidad y velocidad de carga |
| Español en todo el código | Consistencia con el equipo objetivo del proyecto |
"# chefsy" 
"# chefsy"  
