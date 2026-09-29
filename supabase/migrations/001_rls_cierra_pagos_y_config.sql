-- =============================================================================
-- CHEFSY — 001_rls_cierra_pagos_y_config.sql
-- =============================================================================
-- Cierra el acceso de LECTURA del rol `anon` sobre datos que no le
-- corresponde: cierres de caja, movimientos de stock, configuración interna,
-- turnos, consumos de personal, metadata de tienda y usuarios.
--
-- POR QUÉ ESTO ES NECESARIO
-- La anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) viaja dentro del bundle del
-- navegador: es pública por definición. Antes de esta migración, cualquiera
-- con curl podía leer 2.072 pedidos y 115 cierres de caja completos.
--
-- POR QUÉ NO SE TOCA `pedidos`
-- El panel de pedidos, el kanban, la torre de control, el cierre, el
-- breadcrumb de cadetes y el Realtime leen `pedidos` DIRECTAMENTE desde el
-- navegador con la anon key. Cerrarlo exige antes mover esas lecturas a
-- route handlers con service_role. Ver README de esta carpeta.
-- `pedidos` sigue con su política abierta: es deuda conocida, no descuido.
--
-- QUÉ NO AFECTA ESTA MIGRACIÓN
-- - Las escrituras: ya estaban bloqueadas por RLS (verificado).
-- - Toda la lógica de negocio: el servidor usa service_role, que saltea RLS.
-- - El menú público: categorias/productos/modificadores/catalogo siguen
--   legibles por anon, que es lo que necesita la tienda.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Eliminar TODAS las políticas existentes de la tabla.
--    Escribir DROP POLICY por nombre sería frágil: si alguien creó una
--    política con otro nombre, quedaría abierta y el cierre sería un falso
--    positivo de seguridad. El DO block las recorre y las borra todas.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION chefsy_borrar_politicas(p_tabla text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = p_tabla
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, p_tabla);
  END LOOP;
END;
$$;

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'cierres_diarios',   -- cierres de caja: facturación, efectivo, retiros
    'stock_movimientos', -- kardex de insumos
    'stock_categorias',
    'stock_insumos',
    'stock_recetas',
    'turnos',
    'consumos_personal',
    'tienda_metadata',
    'configuracion_operativa',
    'usuarios'           -- contiene hashes de contraseña
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    PERFORM chefsy_borrar_politicas(t);
    RAISE NOTICE 'Tabla cerrada a anon: public.%', t;
  END LOOP;
END;
$$;

DROP FUNCTION chefsy_borrar_politicas(text);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Sin políticas == acceso denegado por defecto.
--    Con RLS habilitado y cero políticas, Postgres rechaza SELECT para `anon`.
--    No se crea ninguna política de lectura a propósito: el acceso legítimo
--    pasa por service_role desde los route handlers, que ignora RLS.
-- ─────────────────────────────────────────────────────────────────────────────

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (run after applying)
-- =============================================================================
-- Debe devolver 0 filas (o HTTP 401/403):
--   curl "$URL/rest/v1/cierres_diarios?select=*" -H "apikey: $ANON"
--   curl "$URL/rest/v1/stock_movimientos?select=*" -H "apikey: $ANON"
--   curl "$URL/rest/v1/usuarios?select=*"      -H "apikey: $ANON"
--
-- Debe seguir funcionando (200):
--   curl "$URL/rest/v1/productos?select=id&limit=1" -H "apikey: $ANON"
--   curl "$URL/rest/v1/categorias?select=id&limit=1" -H "apikey: $ANON"
--
-- Verificar que el panel de cierre sigue funcionando: la comparativa semanal
-- ahora pasa por /api/admin/comparativa (service_role), no por el navegador.
-- =============================================================================
