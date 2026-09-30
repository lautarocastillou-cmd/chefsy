-- =============================================================================
-- ESQUEMA DE BASE DE DATOS — CHEFSY
-- =============================================================================
--
-- ⚠️  LEÉ ESTO ANTES DE USAR EL ARCHIVO
--
-- Este archivo NO es un script de provisión. No lo ejecutes en una base vacía:
-- las columnas están verificadas contra el código y contra una sonda en vivo,
-- pero los TIPOS, los DEFAULT, las claves foráneas y los índices NO están
-- verificados. Ejecutar esto produce una base que no coincide con la real.
--
-- QUÉ ES Y QUÉ NO ES
--   Verificado    Nombres de tabla y de columna. Confirmado leyendo las
--                 consultas del código y, para `pedidos`, con una sonda
--                 directa a la base de producción.
--   Inferido      Tipos de datos. Deducidos de los valores observados.
--                 Probablemente correctos, no garantizados.
--   FALTA         Defaults, nullability, claves foráneas, índices y las
--                 políticas de RLS. Nada de eso se verificó.
--
-- CÓMO OBTENER EL ESQUEMA REAL
--   En Supabase Studio, seccion Database, ver el schema en vivo. O:
--     npx supabase db dump --linked --schema public > schema-real.sql
--
-- POR QUÉ EXISTE ESTE ARCHIVO
-- La versión anterior declaraba ser "fuente de verdad" y mentía: tenía 15
-- columnas de `pedidos` que NO existen en la base y le faltaban 19 que sí
-- existen, más 9 tablas completas. Quien hubiera restaurado desde ahí habría
-- gotten una app rota sin ninguna pista de por qué.
--
-- La fuente de verdad real del esquema es supabase/migrations/ (ver ese
-- README), más el esquema vivo de la base.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USUARIOS Y PERSONAL
-- ─────────────────────────────────────────────────────────────────────────────

-- VERIFICADO contra lib/auth-server.ts (líneas 56-58, 85-104).
-- La versión anterior decía `username` / `password_hash`. NO EXISTEN: el
-- código lee `usuario` y `clave_hash`. O sea que el login no habría
-- funcionando contra una base restaurada de este archivo.
CREATE TABLE IF NOT EXISTS usuarios (
    id          TEXT PRIMARY KEY,
    usuario     TEXT NOT NULL,          -- es el "username" real
    clave_hash  TEXT NOT NULL,          -- es el "password_hash" real; bcrypt o SHA-256 legacy
    nombre      TEXT NOT NULL,
    rol         TEXT NOT NULL,          -- CHECK: 'admin' | 'cajero' | 'cadete'
    archivado   BOOLEAN,
    created_at  TIMESTAMPTZ
    -- El TS de roles es 'admin' | 'cadete' | 'cajero'. La versión anterior
    -- decía además 'cocina', que no existe en el código.
);

-- Seguimiento GPS de los repartidores.
-- NOTA: NO tiene `username` como PK (la versión anterior lo declaraba así).
-- Tampoco `telefono` ni `activo` aparecen en las consultas del código.
CREATE TABLE IF NOT EXISTS cadetes (
    id             TEXT PRIMARY KEY,
    nombre         TEXT,
    lat            NUMERIC,
    lng            NUMERIC,
    speed          NUMERIC,
    heading        NUMERIC,
    accuracy       NUMERIC,
    bateria        NUMERIC,
    gps_activo     BOOLEAN,
    updated_at     TIMESTAMPTZ
    -- FALTAN: tipos exactos y defaults. Verificar.
);

CREATE TABLE IF NOT EXISTS cadetes_pagos_extras (
    id              TEXT PRIMARY KEY,
    cadete_id       TEXT,
    cadete_nombre   TEXT,
    fecha           TEXT,               -- TEXT: el código la trata como string
    monto           NUMERIC,
    motivo          TEXT,
    turno_tipo      TEXT,
    creado_por      TEXT,
    created_at      TIMESTAMPTZ
    -- `viaje_numero` NO existe. Aparecía en un SELECT de
    -- app/api/public/pedidos/route.ts pero nunca se insertó ni se declaró en
    -- el tipo CadetePagoExtra. Postgres devolvía 42703 y la app Flutter no
    -- veía los pagos extras. Corregido en el commit que acompaña a este archivo.
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CONFIGURACIÓN
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS configuracion_operativa (
    id          INTEGER PRIMARY KEY DEFAULT 1,
    limites     JSONB,
    prioridades JSONB,
    updated_at  TIMESTAMPTZ
    -- FALTAN: horario_atencion, estado_local, puntos_activados, monto_por_punto
    -- que sí declaraba la versión anterior. No están en las consultas del
    -- código, así que puede que la tabla tenga más columnas de las que se usan.
);

CREATE TABLE IF NOT EXISTS configuracion_tienda (
    id  TEXT PRIMARY KEY
    -- La versión anterior NO tenía esta tabla. /api/health la consulta.
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CATÁLOGO
-- ─────────────────────────────────────────────────────────────────────────────
-- Estas 4 tablas son las ÚNICAS que `anon` puede leer (RLS abierto a
-- propósito, lo necesita el menú público de la tienda).

CREATE TABLE IF NOT EXISTS categorias (
    id      TEXT PRIMARY KEY,
    nombre  TEXT,
    orden   INTEGER,
    activa  BOOLEAN
);

CREATE TABLE IF NOT EXISTS productos (
    id               TEXT PRIMARY KEY,
    categoria_id     TEXT,
    nombre           TEXT,
    precio           NUMERIC,
    precio_puntos    INTEGER,
    activo           BOOLEAN,
    stock            INTEGER,
    es_combo         BOOLEAN,
    modificadores_ids TEXT[]
    -- FALTAN: descripcion, imagen_url, orden, stock_ilimitado, stock_actual,
    -- requiere_edad, es_novedad, es_promocion, created_at. No verificadas.
);

CREATE TABLE IF NOT EXISTS modificadores (
    id           TEXT PRIMARY KEY,
    nombre       TEXT,
    precio_extra NUMERIC
);

-- Tabla legacy: guarda el menú entero en una sola fila JSONB.
-- VERIFICADO: existe y tiene 1 fila. El código la consulta como fallback.
CREATE TABLE IF NOT EXISTS catalogo (
    id           TEXT PRIMARY KEY DEFAULT 'principal',
    categorias   JSONB,
    productos    JSONB,
    modificadores JSONB,
    updated_at   TIMESTAMPTZ
);

-- Costos de insumos por producto, para las métricas de rentabilidad.
CREATE TABLE IF NOT EXISTS producto_costos (
    producto_id     TEXT,
    insumo_principal TEXT,
    costo_estimado  NUMERIC,
    packaging       NUMERIC,
    notas           TEXT,
    updated_at      TIMESTAMPTZ
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CLIENTES Y PUNTOS
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️  La versión anterior llamaba a esta tabla `clientes_cuentas` con
-- `password_hash`. El código usa la tabla `clientes` con `clave_hash`.
-- Ninguna consulta del proyecto toca `clientes_cuentas`.

CREATE TABLE IF NOT EXISTS clientes (
    id              TEXT PRIMARY KEY,
    nombre          TEXT,
    telefono        TEXT,
    clave_hash      TEXT,
    puntos          INTEGER,
    puntos_actuales INTEGER,
    created_at      TIMESTAMPTZ
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PEDIDOS
-- ─────────────────────────────────────────────────────────────────────────────
-- ⭐ LAS 39 COLUMNAS DE ABAJO SON LAS REALES, sacadas de una sonda directa a
--   la base de producción. La versión anterior declaraba 15 columnas que NO
--   existen (montoTotal, subtotal, pagoConfirmado, lat, lng, ...) y le
--   faltaban 19 que sí existen.
--
--   El código usa nombres en camelCase para lo que el schema anterior
--   nombraba en snake_case, y algunas columnas que no existían se reemplazaron
--   por columnas de punto flotante (lat/lng -> coordenadas como JSONB).

CREATE TABLE IF NOT EXISTS pedidos (
    id                    TEXT PRIMARY KEY,
    cliente               TEXT NOT NULL,
    telefono              TEXT,
    tipoEntrega           TEXT,        -- 'delivery' | 'retiro' | 'mostrador' | 'consumo_local'
    direccion             TEXT,
    coordenadas           JSONB,      -- { latitud, longitud }
    productos             JSONB,      -- array de items del pedido
    total                 NUMERIC,
    costoEnvio            NUMERIC,
    distanciaKm           NUMERIC,
    estado                TEXT,        -- 'nuevo'|'en_cocina'|'listo'|'en_camino'|'entregado'|'cancelado'
    metodoPago            TEXT,
    observaciones         TEXT,
    hora                  TEXT,
    fecha                 TEXT,        -- TEXT 'YYYY-MM-DD', no TIMESTAMPTZ
    created_at            TIMESTAMPTZ,
    cocina_at             TIMESTAMPTZ,
    listo_at              TIMESTAMPTZ,
    entregado_at          TIMESTAMPTZ,
    ubicacion_cadete      JSONB,
    cadete_coordenadas    JSONB,      -- { latitud, longitud }
    pago_confirmado       BOOLEAN,
    archivado             BOOLEAN,    -- flag aparte de "entregado"
    cadete_id             TEXT,
    cadete_nombre         TEXT,
    reparto_at            TIMESTAMPTZ,
    montoEfectivo         NUMERIC,
    montoTransferencia    NUMERIC,
    montoTarjeta          NUMERIC,
    notificacion_manual   BOOLEAN,
    push_subscription     JSONB,
    cliente_id            TEXT,        -- NO es cliente_auth_id como decía el schema viejo
    puntos_ganados        INTEGER,
    puntos_gastados       INTEGER,
    en_camino_at          TIMESTAMPTZ,
    ruta_historial        JSONB,      -- breadcrumb GPS, hasta 500 puntos
    orden_entrega         INTEGER,
    es_prueba             BOOLEAN,
    turno_tipo            TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. CAJA, TURNOS Y CONSUMOS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cierres_diarios (
    fecha                  TEXT PRIMARY KEY,   -- 'YYYY-MM-DD'
    facturacion_neta       NUMERIC,
    efectivo_ventas        NUMERIC,
    caja_inicial           NUMERIC,
    efectivo_rendir        NUMERIC,
    tarjeta_total          NUMERIC,
    transferencia_total    NUMERIC,
    total_pedidos          INTEGER,
    total_envios_delivery  INTEGER,
    costo_envios_cadetes   NUMERIC,
    total_retiros          INTEGER,
    total_consumo_local    INTEGER,
    ticket_promedio        NUMERIC,
    pedidos_cancelados     INTEGER,
    monto_cancelados       NUMERIC,
    turno_tipo             TEXT,               -- la migración 001 la menciona
    created_at             TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS turnos (
    id           TEXT PRIMARY KEY,
    fecha_inicio TEXT,
    tipo_turno   TEXT,
    activo       BOOLEAN
);

CREATE TABLE IF NOT EXISTS consumos_personal (
    -- Columnas en uso verificadas: cantidad, fecha, precio, tipo_pago, total.
    -- Faltan las de identificación (id, cadete_id) que el código filtrar de
    -- alguna forma. NO VERIFICADAS: revisar antes de usar.
    cantidad  NUMERIC,
    fecha     TIMESTAMPTZ,
    precio    NUMERIC,
    total     NUMERIC,
    tipo_pago TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. STOCK DE INSUMOS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_categorias (
    id     TEXT PRIMARY KEY,
    nombre TEXT
);

CREATE TABLE IF NOT EXISTS stock_insumos (
    -- Columnas en uso: 4 (no verificadas en detalle)
    id     TEXT PRIMARY KEY,
    nombre TEXT
);

CREATE TABLE IF NOT EXISTS stock_recetas (
    producto_id TEXT,
    insumo_id   TEXT,
    cantidad    NUMERIC
);

CREATE TABLE IF NOT EXISTS stock_movimientos (
    -- Kardex de movimientos. NO se pudo leer: cerrada a anon.
    id          TEXT PRIMARY KEY
    -- FALTAN TODAS LAS COLUMNAS. Verificar con acceso admin.
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. NOTIFICACIONES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
    usuario_id       TEXT,
    subscription_json JSONB
);


-- =============================================================================
-- SEGURIDAD — Row Level Security
-- =============================================================================
-- NO documentado en la versión anterior (tenía 0 políticas y 0
-- ENABLE ROW LEVEL SECURITY, mientras decía ser la fuente de verdad).
--
-- CERRADAS a `anon` (aplicado en supabase/migrations/001):
--   cierres_diarios, stock_movimientos, stock_categorias, stock_insumos,
--   stock_recetas, turnos, consumos_personal, tienda_metadata,
--   configuracion_operativa, usuarios
--
-- CERRADAS a `anon` (aplicado en supabase/migrations/002):
--   pedidos
--
-- ABIERTAS a `anon` a propósito (menú público):
--   categorias, productos, modificadores, catalogo
--
-- Sin verificar si están cerradas: clientes, cadetes, cadetes_pagos_extras,
-- producto_costos, configuracion_tienda, push_subscriptions.
-- ─────────────────────────────────────────────────────────────────────────────


-- =============================================================================
-- ÍNDICES
-- =============================================================================
-- ⚠️  NO VERIFICADOS. Esta base no se pudo inspeccionar (pg_indexes no es
-- legible con la anon key). Los 4 índices de abajo son los que DECLARA el
-- schema anterior, que puede estar equivocado.
--
-- Antes de crear cualquier índice, correr:
--   SELECT tablename, indexname, indexdef FROM pg_indexes
--   WHERE schemaname = 'public' ORDER BY tablename;
--
-- Candidatos que el analisis de queries identifica como faltantes
-- (verificar primero que no existan):
--   pedidos(cadete_id)            -- filtrar el lote de un repartidor
--   pedidos(cliente_id)           -- historial de un cliente
--   pedidos(fecha)                -- métricas y histórico por día
--   pedidos(telefono)             -- buscar cliente por teléfono
--   pedidos(estado, archivado, created_at)  -- kanban
--   cierres_diarios(turno_tipo)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_pedidos_estado     ON pedidos(estado)  WHERE archivado = FALSE;
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
-- El cuarto índice de la versión anterior apuntaba a clientes_cuentas(telefono),
-- tabla que no existe. Se corrige a clientes.
CREATE INDEX IF NOT EXISTS idx_clientes_telefono  ON clientes(telefono);
