-- Historial de actividad asociado a cada reserva de Malú.
ALTER TABLE reservas_malu
  ADD COLUMN IF NOT EXISTS actividad JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN reservas_malu.actividad IS 'Eventos de actividad de la reserva, ordenados del más reciente al más antiguo.';
