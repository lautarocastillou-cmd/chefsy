-- Reservas privadas de Malú y suscripciones Web Push.
-- Aplicar en Supabase SQL Editor antes de desplegar las nuevas rutas.
CREATE TABLE IF NOT EXISTS reservas_malu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 80),
  productos TEXT NOT NULL CHECK (char_length(productos) BETWEEN 1 AND 500),
  canal TEXT NOT NULL DEFAULT 'Local' CHECK (canal IN ('Local', 'WhatsApp', 'Instagram', 'Empretienda', 'TikTok')),
  telefono TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  recordatorio_at TIMESTAMPTZ,
  estado TEXT NOT NULL DEFAULT 'active' CHECK (estado IN ('active', 'collected', 'cancelled')),
  notificado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reservas_malu_estado_recordatorio_idx
  ON reservas_malu (estado, recordatorio_at)
  WHERE estado = 'active';

CREATE TABLE IF NOT EXISTS reservas_malu_push (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  subscription_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reservas_malu ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas_malu_push ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reservas_malu FROM anon, authenticated;
REVOKE ALL ON reservas_malu_push FROM anon, authenticated;

COMMENT ON TABLE reservas_malu IS 'Reservas privadas de Malú; acceso únicamente desde Route Handlers con service role.';
COMMENT ON TABLE reservas_malu_push IS 'Suscripciones push de la PWA independiente Malú Reservas.';
