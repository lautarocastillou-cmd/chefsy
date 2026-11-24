-- =============================================================================
-- CHEFSY — 007_clientes_crm_notas.sql
-- Tabla dedicada para notas fijas y etiquetas permanentes de clientes CRM.
-- Indexada por clave_cliente (teléfono normalizado o nombre:<nombre_limpio>)
-- para cubrir tanto cuentas registradas como clientes de WhatsApp/teléfono.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clientes_crm_notas (
  clave_cliente TEXT PRIMARY KEY,
  nombre_referencia TEXT,
  telefono_referencia TEXT,
  nota_fija TEXT NOT NULL DEFAULT '',
  etiquetas TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes_crm_notas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on clientes_crm_notas" ON public.clientes_crm_notas;
CREATE POLICY "Service role full access on clientes_crm_notas"
  ON public.clientes_crm_notas
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
