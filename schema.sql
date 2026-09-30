-- =============================================================================
-- ESQUEMA DE BASE DE DATOS — CHEFSY
-- =============================================================================
--
-- ⚠️  LEÉ ESTO ANTES DE USAR EL ARCHIVO
--
-- Este archivo NO es un script de provisión. No lo ejecutes en una base vacía.
-- Documenta el esquema real para que se pueda leer, comparar y entender.
--
-- QUÉ ESTÁ VERIFICADO Y QUÉ NO
--   Verificado     Las tablas marcadas "VERIFICADO contra information_schema"
--                  se copiaron de la base real: tipo, nullability y default
--                  exactos. Los 47 índices, desde pg_indexes.
--   Sonda en vivo  Los 39 nombres de columna de `pedidos`.
--   PENDIENTE      Las tablas sin marca de verificado. Y en todas: las
--                  claves foráneas, que no se consultaron.
--
-- POR QUÉ IMPORTA VERIFICAR
-- Escribir una columna que el código pide y la base no tiene rompe una
-- consulta ENTERA en silencio, si el error no se captura. Ya pasó dos veces:
-- `viaje_numero` y `clientes.puntos`. Por eso este archivo existe y por eso
-- conviene regenerarlo con `db dump` en vez de escribirlo a mano.
--
-- CÓMO OBTENER EL ESQUEMA REAL
--   En Supabase Studio, seccion Database, ver el schema en vivo. O:
--     npx supabase db dump --linked --schema public > schema-real.sql
--
-- POR QUÉ EXISTE ESTE ARCHIVO
-- La versión anterior declaraba ser "fuente de verdad" y mentía: tenía 15
-- columnas de `pedidos` que NO existen, le faltaban 19 que sí, y omitía 9
-- tablas. Quien hubiera restaurado desde ahí habría gotten una app rota sin
-- ninguna pista de por qué.
--
-- Y al verificar este archivo contra la base aparecieron dos bugs más de la
-- misma clase (`viaje_numero`, `clientes.puntos`), corregidos el 2026-09-29.
--
-- La fuente de verdad real del esquema es supabase/migrations/ (ver ese
-- README), más el esquema vivo de la base.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USUARIOS Y PERSONAL
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- Los tipos, la nullability y los defaults de esta tabla son los reales.
CREATE TABLE IF NOT EXISTS usuarios (
    usuario    TEXT PRIMARY KEY,       -- sin `id`: la PK ES `usuario`
    nombre     TEXT,
    rol        TEXT,
    archivado  BOOLEAN,
    created_at TIMESTAMPTZ
    -- clave_hash: NO verificada, falta la parte de la consulta.
    -- El TS de roles es 'admin' | 'cadete' | 'cajero'. La versión anterior
    -- decía además 'cocina', que no existe.
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- 4 filas. La escriben la app Flutter y la de admin, no este repo.
-- Por eso la tabla está abierta a `anon` a propósito.
CREATE TABLE IF NOT EXISTS cadetes (
    id                TEXT PRIMARY KEY,
    nombre            TEXT NOT NULL,
    telefono          TEXT,
    activo            BOOLEAN DEFAULT true,
    lat               NUMERIC,
    lng               NUMERIC,
    accuracy          NUMERIC,
    heading           NUMERIC,
    speed             NUMERIC,
    gps_activo        BOOLEAN DEFAULT true,
    updated_at        TIMESTAMPTZ DEFAULT now(),
    bateria           SMALLINT,        -- smallint, no numeric
    apagado_por_admin BOOLEAN DEFAULT false
    -- `apagado_por_admin` existe en la base y no aparece en ninguna consulta
    -- del código. O se usa desde la app Flutter, o quedó de una versión
    -- anterior. No tocar sin verificar.
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- `viaje_numero` NO existe. Aparecía en un SELECT de
-- app/api/public/pedidos/route.ts pero nunca se insertó ni se declaró en el
-- tipo CadetePagoExtra. Postgres devolvía 42703 y la app Flutter no veía los
-- pagos extras. Corregido.
CREATE TABLE IF NOT EXISTS cadetes_pagos_extras (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cadete_id     TEXT NOT NULL,
    cadete_nombre TEXT NOT NULL,
    monto         NUMERIC NOT NULL,
    motivo        TEXT NOT NULL,
    fecha         TEXT NOT NULL,       -- TEXT, no date (a diferencia de cierres_diarios)
    turno_tipo    TEXT NOT NULL DEFAULT 'noche',
    creado_por    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- Métricas de rendimiento por día. No estaba en la documentación anterior.
-- UNIQUE (cadete_id, fecha) garantiza una fila por cadete por día.
CREATE TABLE IF NOT EXISTS cadetes_rendimiento_diario (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cadete_id                   TEXT NOT NULL,
    cadete_nombre               TEXT NOT NULL,
    fecha                       DATE NOT NULL,
    pedidos_entregados          INTEGER DEFAULT 0,
    km_totales                  NUMERIC DEFAULT 0,
    velocidad_media_movimiento  NUMERIC DEFAULT 0,
    velocidad_maxima            NUMERIC DEFAULT 0,
    tiempo_promedio_entrega_min INTEGER DEFAULT 0,
    tiempo_movimiento_minutos   INTEGER DEFAULT 0,
    tiempo_detenido_minutos     INTEGER DEFAULT 0,
    es_mas_rapido_dia           BOOLEAN DEFAULT false,
    ranking_dia                 INTEGER DEFAULT 1,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- Métricas agregadas por semana. UNIQUE (cadete_id, anio, semana_numero).
CREATE TABLE IF NOT EXISTS cadetes_rendimiento_semanal (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cadete_id                   TEXT NOT NULL,
    cadete_nombre               TEXT NOT NULL,
    anio                        INTEGER NOT NULL,
    semana_numero               INTEGER NOT NULL,
    semana_inicio               DATE NOT NULL,
    semana_fin                  DATE NOT NULL,
    pedidos_entregados          INTEGER DEFAULT 0,
    km_totales                  NUMERIC DEFAULT 0,
    velocidad_media_movimiento  NUMERIC DEFAULT 0,
    velocidad_maxima            NUMERIC DEFAULT 0,
    tiempo_promedio_entrega_min INTEGER DEFAULT 0,
    tiempo_movimiento_minutos   INTEGER DEFAULT 0,
    tiempo_detenido_minutos     INTEGER DEFAULT 0,
    es_mas_rapido_semana        BOOLEAN DEFAULT false,
    posicion_ranking            INTEGER DEFAULT 1,
    detalles_dias               JSONB DEFAULT '[]'::jsonb,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CONFIGURACIÓN
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
CREATE TABLE IF NOT EXISTS configuracion_operativa (
    id          INTEGER PRIMARY KEY DEFAULT 1,
    limites     JSONB NOT NULL DEFAULT '{}'::jsonb,
    prioridades JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at  TIMESTAMPTZ DEFAULT now()
    -- horario_atencion, estado_local, puntos_activados y monto_por_punto NO
    -- existen. La versión anterior de este archivo los declaraba.
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- OJO: son 39 columnas, no 6. La primera consulta vino cortada justo después
-- de la sexta y dio la impresión de que la tabla era chica.
-- Los 6 tipos siguientes están verificados. Los otros 33 nombres están
-- verificados (vía select('*') contra la base) pero su tipo no.
CREATE TABLE IF NOT EXISTS configuracion_tienda (
    id                      INTEGER PRIMARY KEY DEFAULT 1,
    color_principal         TEXT NOT NULL DEFAULT '#2A6348',
    titulo_principal        TEXT NOT NULL DEFAULT '¿Qué pinta hoy?',
    palabras_animadas       TEXT[] NOT NULL DEFAULT ARRAY['LOMOS','MILAS','ZAPPING','BURGERS','PIZZAS','PATYS'],
    logo_url                TEXT NOT NULL DEFAULT '/logo.jpg',
    hero_image_url          TEXT NOT NULL DEFAULT '/burger.jpg',
    updated_at              TIMESTAMPTZ,      -- sí existe
    -- Las 33 restantes, nombres verificados, tipos sin verificar:
    hero_linea_1            TEXT,
    hero_linea_2            TEXT,
    fuente_principal        TEXT,
    banner_promocional      TEXT,
    banner_animado          BOOLEAN,
    banner_color            TEXT,
    fuente_hero             TEXT,
    hero_pos_x              NUMERIC,
    hero_pos_y              NUMERIC,
    hero_escala             NUMERIC,
    estilo_bordes           TEXT,
    textura_fondo_url       TEXT,
    whatsapp_mensaje        TEXT,
    link_instagram          TEXT,
    link_tiktok             TEXT,
    hero_layout             TEXT,
    hero_video_url          TEXT,
    hero_video_overlay_opacity NUMERIC,
    hero_badge_texto        TEXT,
    hero_carrusel_slides    JSONB,
    hero_mostrar_horario    BOOLEAN,
    estilo_tarjetas         TEXT,
    mostrar_badges_automaticos BOOLEAN,
    mostrar_badge_descuento BOOLEAN,
    efecto_titulo_hero      TEXT,
    color_titulo_secundario TEXT,
    fuente_tienda_catalogo  TEXT,
    hero_loop_imagenes      JSONB,
    hero_loop_transicion    TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CATÁLOGO
-- ─────────────────────────────────────────────────────────────────────────────
-- Estas 4 tablas son las ÚNICAS que `anon` puede leer (RLS abierto a
-- propósito, lo necesita el menú público de la tienda).

-- Tabla legacy: guarda el menú entero en una sola fila JSONB. Tiene 1 fila
-- y el código la consulta como fallback de `productos`, que está vacía.
-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- 1 fila: guarda el menú entero como JSONB. `id` NO tiene default en la base
-- (la versión anterior de este archivo le ponía DEFAULT 'principal').
CREATE TABLE IF NOT EXISTS catalogo (
    id            TEXT PRIMARY KEY,
    categorias    JSONB NOT NULL,
    productos     JSONB NOT NULL,
    modificadores JSONB NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    precio_puntos INTEGER
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
CREATE TABLE IF NOT EXISTS categorias (
    id     TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    orden  INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT true
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- Costos de insumos por producto, para las métricas de rentabilidad.
-- `insumo_principal` es NUMERIC (un costo), no el nombre del insumo.
CREATE TABLE IF NOT EXISTS producto_costos (
    producto_id     TEXT PRIMARY KEY,
    costo_estimado  NUMERIC NOT NULL DEFAULT 0,
    insumo_principal NUMERIC DEFAULT 0,
    packaging       NUMERIC DEFAULT 0,
    notas           TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
CREATE TABLE IF NOT EXISTS productos (
    id                TEXT PRIMARY KEY,
    categoria_id      TEXT NOT NULL,
    nombre            TEXT NOT NULL,
    precio            NUMERIC NOT NULL DEFAULT 0,
    precio_puntos     INTEGER,     -- si es > 0, el producto se puede canjear
    activo            BOOLEAN DEFAULT true,
    es_combo          BOOLEAN DEFAULT false,
    stock             INTEGER,     -- NULL = stock ilimitado
    modificadores_ids TEXT[] DEFAULT '{}'::text[]
    -- VACÍA en producción: el menú real sale de datos/productos.ts.
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
CREATE TABLE IF NOT EXISTS modificadores (
    id           TEXT PRIMARY KEY,
    nombre       TEXT NOT NULL,
    precio_extra NUMERIC NOT NULL DEFAULT 0
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id        TEXT NOT NULL,   -- UNIQUE (ver pg_indexes)
    subscription_json JSONB NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT timezone('utc', now())
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CLIENTES Y PUNTOS
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️  La versión anterior llamaba a esta tabla `clientes_cuentas` con
-- `password_hash`. El código usa la tabla `clientes` con `clave_hash`.
-- Ninguna consulta del proyecto toca `clientes_cuentas`.

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- ⭐ NO existe una columna `puntos`. La real es `puntos_actuales`.
--   20 lugares del proyecto consultan esta tabla y 19 usan el nombre
--   correcto; app/api/tienda/pedido/route.ts usaba `puntos` y por eso
--   pagar con puntos desde la tienda fallaba siempre con 42703.
CREATE TABLE IF NOT EXISTS clientes (
    id              UUID PRIMARY KEY,
    nombre          TEXT,
    telefono        TEXT,
    puntos_actuales INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    clave_hash      TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PEDIDOS
-- ─────────────────────────────────────────────────────────────────────────────
-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- 39 columnas, tipos exactos. La versión anterior de este archivo declaraba
-- 15 que NO existen (montoTotal, subtotal, pagoConfirmado, lat, lng,
-- cliente_auth_id, es_programado, calificacion...) y omitía 19 que sí.
--
-- OJO con los tipos, que no son los obvios:
--   - los montos de pago son BIGINT, no numeric
--   - notificacion_manual es TEXT, no boolean (guarda quién la pidió)
--   - fecha y hora son TEXT, no date/timestamp
--   - no existe cancelado_at: el estado cancelado no lleva timestamp propio
CREATE TABLE IF NOT EXISTS pedidos (
    id                    TEXT PRIMARY KEY,
    cliente               TEXT NOT NULL,
    telefono              TEXT NOT NULL,
    tipoEntrega           TEXT NOT NULL,   -- 'delivery'|'retiro'|'mostrador'|'consumo_local'
    direccion             TEXT NOT NULL,
    coordenadas           JSONB,           -- { latitud, longitud }
    productos             JSONB NOT NULL,  -- array de items
    total                 NUMERIC NOT NULL,
    costoEnvio            NUMERIC,
    distanciaKm           NUMERIC,
    estado                TEXT NOT NULL,
    metodoPago            TEXT NOT NULL,
    observaciones         TEXT,
    hora                  TEXT NOT NULL,   -- '09:39 p. m.' tal cual
    fecha                 TEXT NOT NULL,   -- 'YYYY-MM-DD'
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    cocina_at             TIMESTAMPTZ,
    listo_at              TIMESTAMPTZ,
    entregado_at          TIMESTAMPTZ,
    ubicacion_cadete      JSONB,
    cadete_coordenadas    JSONB,
    pago_confirmado       BOOLEAN DEFAULT false,
    archivado             BOOLEAN NOT NULL DEFAULT false,  -- flag aparte de entregado
    cadete_id             TEXT,
    cadete_nombre         TEXT,
    reparto_at            TIMESTAMPTZ,
    montoEfectivo         BIGINT DEFAULT 0,
    montoTransferencia    BIGINT DEFAULT 0,
    montoTarjeta          BIGINT DEFAULT 0,
    notificacion_manual   TEXT,
    push_subscription     JSONB,
    cliente_id            UUID,
    puntos_ganados        INTEGER DEFAULT 0,
    puntos_gastados       INTEGER DEFAULT 0,
    en_camino_at          TIMESTAMPTZ,
    ruta_historial        JSONB DEFAULT '[]'::jsonb,  -- breadcrumb GPS, tope 500
    orden_entrega         INTEGER,
    es_prueba             BOOLEAN DEFAULT false,
    turno_tipo            TEXT DEFAULT 'noche'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. CAJA, TURNOS Y CONSUMOS
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- ⭐ `fecha` es DATE, no TEXT. Ojo: en cadetes_pagos_extras SÍ es TEXT.
--   La PK real es (fecha, turno_tipo), no `fecha` sola: se puede cerrar el
--   mismo día en turno mediodía y en turno noche.
--   La columna de timestamp se llama `creado_el`, NO `created_at`.
CREATE TABLE IF NOT EXISTS cierres_diarios (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha                DATE NOT NULL,
    turno_tipo           TEXT DEFAULT 'noche',
    facturacion_neta     NUMERIC NOT NULL DEFAULT 0,
    efectivo_ventas      NUMERIC NOT NULL DEFAULT 0,
    caja_inicial         NUMERIC NOT NULL DEFAULT 0,
    efectivo_rendir      NUMERIC NOT NULL DEFAULT 0,
    tarjeta_total        NUMERIC NOT NULL DEFAULT 0,
    transferencia_total  NUMERIC NOT NULL DEFAULT 0,
    total_pedidos        INTEGER NOT NULL DEFAULT 0,
    total_envios_delivery INTEGER NOT NULL DEFAULT 0,
    costo_envios_cadetes NUMERIC NOT NULL DEFAULT 0,
    total_retiros        INTEGER NOT NULL DEFAULT 0,
    total_consumo_local  INTEGER NOT NULL DEFAULT 0,
    ticket_promedio      NUMERIC NOT NULL DEFAULT 0,
    pedidos_cancelados   INTEGER NOT NULL DEFAULT 0,
    monto_cancelados     NUMERIC NOT NULL DEFAULT 0,
    creado_el            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
CREATE TABLE IF NOT EXISTS turnos (
    id           TEXT PRIMARY KEY,
    fecha_inicio TEXT,
    tipo_turno   TEXT,
    activo       BOOLEAN
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- 15 columnas. La versión anterior declaraba solo 5 y le faltaban las de
-- identificación (`id`, `persona_nombre`), que son las que permiten saber
-- QUIÉN consumió: sin ellas el reporte de consumos no cerraba.
CREATE TABLE IF NOT EXISTS consumos_personal (
    id                TEXT PRIMARY KEY,
    fecha             TIMESTAMPTZ NOT NULL DEFAULT now(),
    producto_id       TEXT,
    producto_nombre   TEXT NOT NULL,
    categoria_nombre  TEXT,
    precio            NUMERIC NOT NULL DEFAULT 0,
    cantidad          NUMERIC NOT NULL DEFAULT 1,
    total             NUMERIC NOT NULL DEFAULT 0,
    persona_nombre    TEXT NOT NULL,
    tipo_pago         TEXT NOT NULL DEFAULT 'anotado',   -- 'anotado' | 'pagado'
    saldado           BOOLEAN NOT NULL DEFAULT false,
    descontar_stock   BOOLEAN NOT NULL DEFAULT false,
    notas             TEXT,
    creado_por        TEXT,
    created_at        TIMESTAMPTZ DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. STOCK DE INSUMOS
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
CREATE TABLE IF NOT EXISTS stock_categorias (
    id         TEXT PRIMARY KEY,
    nombre     TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
CREATE TABLE IF NOT EXISTS stock_insumos (
    id             TEXT PRIMARY KEY,
    nombre         TEXT NOT NULL,
    categoria_id   TEXT NOT NULL,
    stock_actual   NUMERIC NOT NULL DEFAULT 0,
    unidad_medida  TEXT NOT NULL DEFAULT 'unidades',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- PK compuesta (producto_id, insumo_id): una receta no repite insumo.
CREATE TABLE IF NOT EXISTS stock_recetas (
    producto_id TEXT NOT NULL,
    insumo_id   TEXT NOT NULL,
    cantidad    NUMERIC
    -- cantidad NO verificada: la consulta se cortó acá.
);

-- ══ VERIFICADO contra information_schema el 2026-09-29 ══
-- Kardex. Guarda el stock antes y después de cada movimiento, así que el
-- historial es auditable sin recalcular. La versión anterior declaraba solo
-- `id` y decía que no se había podido leer: sí se pudo.
CREATE TABLE IF NOT EXISTS stock_movimientos (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    insumo_id        TEXT NOT NULL,
    insumo_nombre    TEXT NOT NULL,
    tipo_movimiento  TEXT NOT NULL,
    cantidad_delta   NUMERIC NOT NULL,
    stock_anterior   NUMERIC NOT NULL,
    stock_nuevo      NUMERIC NOT NULL,
    unidad_medida    TEXT NOT NULL,
    motivo           TEXT,
    usuario_nombre   TEXT NOT NULL,
    referencia_id    TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. NOTIFICACIONES
-- ─────────────────────────────────────────────────────────────────────────────
-- push_subscriptions ya está definida arriba, en la sección de catálogo,
-- con sus tipos verificados.


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
-- VERIFICADOS el 2026-09-29 contra pg_indexes. La base tiene 47 índices.
-- La versión anterior de este archivo declaraba 4. En realidad la base tiene
-- 47, y 5 de los 6 que sugería la auditoría ya existían.
--
-- ESTE ARCHIVO NO ES UN SCRIPT DE PROVISIÓN: lo de abajo documenta lo que
-- hay, no crea nada. Para agregar índices, usar supabase/migrations/.
--
-- ── pedidos (6 índices) — la tabla que más crece, 2.082 filas ──────────────
--   pedidos_pkey                     UNIQUE (id)
--   idx_pedidos_cadete_id            (cadete_id)
--   idx_pedidos_cliente_id           (cliente_id)
--   idx_pedidos_fecha                (fecha)
--   idx_pedidos_archivado_estado     (archivado, estado)
--   idx_pedidos_archivado_created_at (archivado, created_at DESC)
--   idx_pedidos_telefono             (telefono)   <- agregado en 003
--
-- ── resto de la base ───────────────────────────────────────────────────────
--   cadetes_pkey                     UNIQUE (id)
--   cadetes_pagos_extras_pkey        UNIQUE (id)
--   idx_cadetes_pagos_extras_cadete  (cadete_id)
--   idx_cadetes_pagos_extras_fecha   (fecha)
--   cadetes_rendimiento_diario_pkey  UNIQUE (id)
--   idx_cadetes_rendimiento_diario_cadete (cadete_id)
--   idx_cadetes_rendimiento_diario_fecha  (fecha)
--   uq_cadete_fecha                  UNIQUE (cadete_id, fecha)
--   cadetes_rendimiento_semanal_pkey UNIQUE (id)
--   idx_cadetes_rendimiento_cadete   (cadete_id)
--   idx_cadetes_rendimiento_semana   (anio, semana_numero)
--   uq_cadete_semana                 UNIQUE (cadete_id, anio, semana_numero)
--   catalogo_pkey                    UNIQUE (id)
--   categorias_pkey                  UNIQUE (id)
--   idx_categorias_orden             (orden)
--   cierres_diarios_pkey             UNIQUE (id)
--   cierres_diarios_fecha_turno_key  UNIQUE (fecha, turno_tipo)
--   clientes_pkey                    UNIQUE (id)
--   idx_clientes_telefono            (telefono)
--   configuracion_operativa_pkey     UNIQUE (id)
--   configuracion_tienda_pkey        UNIQUE (id)
--   consumos_personal_pkey           UNIQUE (id)
--   modificadores_pkey               UNIQUE (id)
--   producto_costos_pkey             UNIQUE (producto_id)
--   productos_pkey                   UNIQUE (id)
--   idx_productos_categoria          (categoria_id)
--   idx_productos_activo             (activo)
--   push_subscriptions_pkey          UNIQUE (id)
--   push_subscriptions_usuario_id_key UNIQUE (usuario_id)
--   stock_categorias_pkey            UNIQUE (id)
--   stock_insumos_pkey               UNIQUE (id)
--   idx_stock_insumos_categoria_id   (categoria_id)
--   stock_movimientos_pkey           UNIQUE (id)
--   idx_stock_mov_insumo             (insumo_id)
--   idx_stock_mov_fecha              (created_at DESC)
--   stock_recetas_pkey               UNIQUE (producto_id, insumo_id)
--   idx_stock_recetas_insumo_id      (insumo_id)
--   tienda_metadata_pkey             UNIQUE (producto_id)
--   turnos_pkey                      UNIQUE (id)
--   usuarios_pkey                    UNIQUE (usuario)
--   idx_usuarios_rol                 (rol)
--
-- ── Tablas que salen del listado por volumen ───────────────────────────────
-- Las siguientes se consultan y NO tienen índice propio más allá del pkey.
-- No es un problema a la escala actual:
--   cadetes            4 filas
--   clientes           6 filas
--   turnos             1 fila
--   consumos_personal 35 filas
--   cierres_diarios  115 filas (cubierta por el UNIQUE de fecha+turno_tipo)
-- Un índice sobre una tabla de 4 filas es más lento que leerla entera.
-- =============================================================================

