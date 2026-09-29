-- =============================================================================
-- CHEFSY — 002_rls_pedidos.sql
-- =============================================================================
-- Cierra el acceso de LECTURA del rol `anon` sobre `pedidos`.
--
-- POR QUÉ ESTO ES NECESARIO
-- `pedidos` es la única tabla que quedó abierta después de 001, y es la
-- más sensible: cada fila tiene nombre, teléfono, dirección, coordenadas
-- del domicilio y el detalle de lo que compró el cliente. Con solo la anon
-- key —que viaja dentro del bundle del navegador y es pública por diseño—
-- se bajaban las 2.072 filas con un `curl`.
--
--   curl "$URL/rest/v1/pedidos?select=*" -H "apikey: $ANON"
--
-- QUÉ CAMBIÓ EN EL CÓDIGO PARA PODER APLICAR ESTO
-- Antes, seis lugares leían la tabla directo desde el navegador. Hoy ninguno:
--   - servicios/supabase/pedidos.ts   → GET /api/admin/pedidos  (GET nuevo)
--   - hooks/usePedidosRealtime.ts     → idem
--   - hooks/useAgendaClientes.ts      → idem
--   - PedidosContexto.tsx             → idem
--   - ModalBreadcrumbTrail.tsx        → GET /api/admin/pedidos/[id]/ruta (nuevo)
--   - app/cadete-en-vivo/[id]/layout  → service_role en el servidor
--
-- Y el canal Realtime pasó de `postgres_changes` a `broadcast`:
-- postgres_changes lee la tabla desde el navegador y NO pasa por route
-- handlers, así que no sobrevive al cierre. El broadcast solo emite una señal
-- {id, tipo} —sin PII— y el panel refetchea por el route handler autenticado.
-- Ver lib/pedidos-broadcast.ts.
--
-- QUÉ NO AFECTA ESTA MIGRACIÓN
-- - Las escrituras: ya estaban bloqueadas por RLS (verificado con un INSERT
--   de prueba que devolvió 42501).
-- - El menú público y el catálogo: no tocan esta tabla.
-- - El tracking público (`/cadete-en-vivo`, `/ubicacion`, `/rastreo`): sigue
--   funcionando porque pasa por route handlers públicos que ya filtran por
--   pedido. Eso NO se cierra acá — es un tema aparte, ver más abajo.
-- =============================================================================

BEGIN;

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Se borran TODAS las políticas existentes, no solo las conocidas.
-- Escribir DROP POLICY por nombre sería frágil: si alguien creó una política
-- con otro nombre, quedaría abierta y el cierre sería un falso positivo de
-- seguridad, que es exactamente el error que hizo pasable este finding.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pedidos'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.pedidos', pol.policyname);
  END LOOP;
  RAISE NOTICE 'políticas de public.pedidos eliminadas';
END;
$$;

-- Sin políticas == acceso denegado por defecto para `anon`.
-- No se crea ninguna política de lectura a propósito: el acceso legítimo
-- pasa por service_role desde los route handlers, que ignora RLS.

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (run after applying)
-- =============================================================================
-- Debe devolver 0 filas:
--   curl "$URL/rest/v1/pedidos?select=*" -H "apikey: $ANON"
--
-- Debe SEGUIR funcionando:
--   - Login del panel y apertura del kanban (pasa por /api/admin/pedidos)
--   - /cadete-en-vivo/<id> y /ubicacion/<id> (pasan por /api/public/rastreo)
--   - El cierre de caja y las métricas (ya usaban service_role)
--   - La cartelería de la tienda (no toca esta tabla)
--
-- Si el panel deja de actualizar, el síntoma es que el canal broadcast no
-- está llegando. Diagnóstico: en DevTools, /dev-tools tiene un panel de
-- estado de Realtime; también se puede mirar la pestaña Network buscando
-- GET /api/admin/pedidos cada ~6 s (el poll de SWR es la red de contención).
--
-- =============================================================================
-- NOTA — LO QUE ESTA MIGRACIÓN NO CIERRA
-- =============================================================================
-- `/api/public/rastreo` y `/api/public/maptest/activos` siguen devolviendo
-- datos de pedidos a cualquier visitante que conozca un id de pedido. Eso no
-- lo arregla esta migración porque esos handlers usan service_role y
-- filtran a mano.
--
-- Los ids tienen forma `ped-<timestamp>-<random>`: adivinables solo por
-- fuerza bruta, pero un id filtrado (por ejemplo en un link de WhatsApp)
-- alcanza para ver nombre, dirección y seguimiento. La corrección es
-- verificar que quien pide el seguimiento sea el cliente del pedido o un
-- cadete asignado. Es un cambio aparte y más invasivo: los links de tracking
-- se comparten con el cliente por diseño, así que hay que decidir primero cómo
-- se prueba la titularidad sin romper el flujo.
-- =============================================================================
