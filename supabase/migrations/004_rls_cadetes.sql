-- =============================================================================
-- CHEFSY — 004_rls_cadetes.sql
-- =============================================================================
-- Cierra el acceso de LECTURA del rol `anon` sobre la tabla `cadetes`.
--
-- POR QUÉ
-- `cadetes` contiene la ubicación en vivo de cada repartidor:
--   id, nombre, telefono, lat, lng, accuracy, heading, speed,
--   gps_activo, updated_at, bateria, apagado_por_admin
--
-- Verificado: antes de esta migración, la anon key (pública por diseño, viaja
-- en el bundle del navegador) leía las 4 filas completas, incluido el teléfono
-- y las coordenadas de cada repartidor, sin ninguna credencial.
--
-- Es la misma clase de problema que se cerró en 002 para `pedidos`.
--
-- POR QUÉ EL CÓDIGO YA NO NECESITA ANON
-- - hooks/useCadetes.ts          → lee por GET /api/admin/cadetes (service_role
--                                   + sesión admin). Antes usaba `postgres_changes`
--                                   sobre `cadetes` con el cliente anónimo.
-- - app/(principal)/cadeteria/   → el polling de estado GPS ahora también pega
--   page.tsx                       a /api/admin/cadetes, no a Supabase directo.
--
-- La señal de "cambió algo" se reemplazó por un broadcast
-- (lib/cadetes-broadcast.ts), igual que se hizo con pedidos en lib/pedidos-broadcast.ts.
-- El broadcast no consulta filas: solo avisa QUE algo cambió, y el panel vuelve
-- a pedir los datos por la API con la sesión validada. El payload es mínimo
-- ({id, tipo}) y el cliente lo ignora.
--
-- QUÉ NO AFECTA
-- - La app del cadete (Flutter): sigue hablando con /api/public/ubicacion,
--   que valida el token del cadete y escribe con service_role.
-- - La lógica de negocio: toda escritura pasa por service_role.
-- =============================================================================

BEGIN;

ALTER TABLE public.cadetes ENABLE ROW LEVEL SECURITY;

-- Borrar TODAS las políticas previas. Escribir DROP POLICY por nombre sería
-- frágil: si alguien creó una política con otro nombre, quedaría abierta y el
-- cierre sería un falso positivo de seguridad.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cadetes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.cadetes', pol.policyname);
  END LOOP;
  RAISE NOTICE 'Politicas previas de public.cadetes eliminadas';
END;
$$;

-- Sin políticas == acceso denegado por defecto. Con RLS habilitado y cero
-- políticas, Postgres rechaza SELECT para `anon`. No se crea ninguna política
-- de lectura a propósito: el acceso legítimo pasa por service_role desde los
-- route handlers, que ignora RLS.

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Debe devolver 0 filas o HTTP 401/403:
--   curl "$URL/rest/v1/cadetes?select=*" -H "apikey: $ANON"
--
-- Debe seguir funcionando (200): el panel de cadetería ahora lee por API, así
-- que hay que abrir /cadeteria como admin y confirmar que la lista de cadetes
-- carga, que el "hace Xs" se actualiza, y que la torre de control sigue
-- mostrando el mapa en vivo.
-- =============================================================================
