-- 1. Encontrar y eliminar dinámicamente la restricción actual de 'estado' (ya que Postgres puede haber autogenerado un nombre distinto)
DO $$ 
DECLARE
  constname text;
BEGIN
  SELECT con.conname INTO constname
  FROM pg_constraint con
  INNER JOIN pg_class rel ON rel.oid = con.conrelid
  INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
  INNER JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = rel.oid
  WHERE nsp.nspname = 'public' 
    AND rel.relname = 'pedidos'
    AND att.attname = 'estado'
    AND con.contype = 'c';

  IF constname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE pedidos DROP CONSTRAINT ' || quote_ident(constname);
  END IF;
END $$;

-- 2. Añadir la restricción actualizada que incluye "en_camino"
ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check CHECK (estado IN ('nuevo', 'en_cocina', 'listo', 'en_camino', 'entregado', 'cancelado'));

-- 3. Añadir la columna "en_camino_at" para tener registro de cuándo el cadete comenzó el viaje
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS en_camino_at TIMESTAMPTZ;
