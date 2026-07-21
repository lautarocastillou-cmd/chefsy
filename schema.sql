-- ==============================================================================
-- 🏛️ ESQUEMA DE BASE DE DATOS — CHEFSY (Respaldo de Seguridad Git)
-- ==============================================================================
-- Este archivo representa la fuente de verdad (Source of Truth) de la estructura
-- de base de datos en PostgreSQL / Supabase para Chefsy Web & Admin.
--
-- Uso:
-- Si necesitas restaurar la base de datos o levantar un entorno de pruebas,
-- ejecuta este script en la consola SQL de Supabase Studio o mediante psql.
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. USUARIOS Y PERSONAL (Staff del local y cadetes)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'cajero', 'cocina', 'cadete')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla especializada para seguimiento GPS de cadetes activos
CREATE TABLE IF NOT EXISTS cadetes (
    username TEXT PRIMARY KEY REFERENCES usuarios(username) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    telefono TEXT,
    activo BOOLEAN DEFAULT TRUE,
    lat NUMERIC,
    lng NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. CONFIGURACIÓN OPERATIVA DEL NEGOCIO
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion_operativa (
    id INTEGER PRIMARY KEY DEFAULT 1,
    limites JSONB NOT NULL DEFAULT '{"nuevo": 1, "en_cocina": 45, "listo": 10}'::jsonb,
    prioridades JSONB NOT NULL DEFAULT '[]'::jsonb,
    horario_atencion TEXT DEFAULT '20:30 hs a 01:00 hs',
    estado_local TEXT DEFAULT 'abierto' CHECK (estado_local IN ('abierto', 'cerrado', 'programado')),
    puntos_activados BOOLEAN DEFAULT TRUE,
    monto_por_punto NUMERIC DEFAULT 1000,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. CATÁLOGO DE PRODUCTOS NORMALIZADO (Menú de la Tienda)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
    id TEXT PRIMARY KEY,
    categoria_id TEXT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio NUMERIC NOT NULL DEFAULT 0,
    precio_puntos INTEGER,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0,
    es_combo BOOLEAN DEFAULT FALSE,
    stock INTEGER,
    modificadores_ids TEXT[] DEFAULT '{}',
    stock_ilimitado BOOLEAN DEFAULT TRUE,
    stock_actual INTEGER DEFAULT 0,
    requiere_edad BOOLEAN DEFAULT FALSE,
    es_novedad BOOLEAN DEFAULT FALSE,
    es_promocion BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modificadores (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio_extra NUMERIC DEFAULT 0,
    obligatorio BOOLEAN DEFAULT FALSE,
    max_opciones INTEGER DEFAULT 1,
    opciones JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. CLIENTES Y PROGRAMA DE FIDELIDAD (Puntos y Cuentas)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes_cuentas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    puntos_actuales INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. PEDIDOS Y TRACKING EN TIEMPO REAL
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    estado TEXT NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'en_cocina', 'listo', 'en_camino', 'entregado', 'cancelado')),
    tipoEntrega TEXT NOT NULL CHECK (tipoEntrega IN ('delivery', 'retiro', 'local')),
    cliente TEXT NOT NULL,
    telefono TEXT NOT NULL,
    direccion TEXT,
    referencia TEXT,
    metodoPago TEXT DEFAULT 'efectivo',
    montoTotal NUMERIC NOT NULL DEFAULT 0,
    montoEnvio NUMERIC DEFAULT 0,
    subtotal NUMERIC DEFAULT 0,
    pagoConfirmado BOOLEAN DEFAULT FALSE,
    observaciones TEXT,
    productos JSONB NOT NULL DEFAULT '[]'::jsonb,
    cadete_id TEXT REFERENCES cadetes(username) ON DELETE SET NULL,
    cadete_nombre TEXT,
    cocina_at TIMESTAMPTZ,
    listo_at TIMESTAMPTZ,
    en_camino_at TIMESTAMPTZ,
    entregado_at TIMESTAMPTZ,
    cancelado_at TIMESTAMPTZ,
    fecha TEXT,
    hora TEXT,
    archivado BOOLEAN DEFAULT FALSE,
    push_subscription JSONB,
    es_programado BOOLEAN DEFAULT FALSE,
    programado_para TEXT,
    calificacion INTEGER,
    comentario_calificacion TEXT,
    pago_solicitado_at TIMESTAMPTZ,
    tiempo_estimado_entrega INTEGER,
    cliente_auth_id TEXT REFERENCES clientes_cuentas(id) ON DELETE SET NULL,
    lat NUMERIC,
    lng NUMERIC
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. CIERRES DIARIOS DE CAJA (Histórico financiero protegido)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cierres_diarios (
    fecha TEXT PRIMARY KEY,
    facturacion_neta NUMERIC DEFAULT 0,
    efectivo_ventas NUMERIC DEFAULT 0,
    caja_inicial NUMERIC DEFAULT 0,
    efectivo_rendir NUMERIC DEFAULT 0,
    tarjeta_total NUMERIC DEFAULT 0,
    transferencia_total NUMERIC DEFAULT 0,
    total_pedidos INTEGER DEFAULT 0,
    total_envios_delivery INTEGER DEFAULT 0,
    costo_envios_cadetes NUMERIC DEFAULT 0,
    total_retiros INTEGER DEFAULT 0,
    total_consumo_local INTEGER DEFAULT 0,
    ticket_promedio NUMERIC DEFAULT 0,
    pedidos_cancelados INTEGER DEFAULT 0,
    monto_cancelados NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. TABLA LEGACY DE CATÁLOGO (Deprecada / Respaldo de Emergencia)
-- ──────────────────────────────────────────────────────────────────────────────
-- Nota: Esta tabla conservaba todo el menú en una sola fila JSONB (id='principal').
-- Se mantiene en el esquema únicamente por retrocompatibilidad histórica.
CREATE TABLE IF NOT EXISTS catalogo (
    id TEXT PRIMARY KEY DEFAULT 'principal',
    categorias JSONB DEFAULT '[]'::jsonb,
    productos JSONB DEFAULT '[]'::jsonb,
    modificadores JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- ÍNDICES RECOMENDADOS PARA RENDIMIENTO
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado) WHERE archivado = FALSE;
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes_cuentas(telefono);
