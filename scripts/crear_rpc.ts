import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const { error } = await supabaseAdmin.rpc('exec_sql', {
    query: `
      CREATE OR REPLACE FUNCTION public.restituir_stock(productos_devueltos jsonb)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
          producto jsonb;
          receta RECORD;
      BEGIN
          FOR producto IN SELECT * FROM jsonb_array_elements(productos_devueltos)
          LOOP
              FOR receta IN SELECT insumo_id, cantidad FROM public.stock_recetas WHERE producto_id = (producto->>'idCatalogo')
              LOOP
                  UPDATE public.stock_insumos
                  SET stock_actual = stock_actual + (receta.cantidad * (producto->>'cantidad')::numeric),
                      updated_at = now()
                  WHERE id = receta.insumo_id;
              END LOOP;
          END LOOP;
      END;
      $$;
    `
  })

  if (error) {
    console.error('Error with exec_sql, attempting raw SQL via REST/GraphQL is not possible without an endpoint. We will create a local script using pg package instead if we have postgresql connection string, or we might need to tell the user to run it in Supabase Studio.')
    console.error(error)
  } else {
    console.log('Success creating restituir_stock')
  }
}

run()
