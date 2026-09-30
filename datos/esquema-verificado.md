# Esquema verificado de la base

Este archivo es una **foto** del esquema real de la base de producción, tomada
el **29 de septiembre de 2026** desde `information_schema.columns` en Supabase.

## Por qué existe

Si el código pide una columna que la base no tiene, **no da error de
compilación**. TypeScript no sabe contra qué base se corre el proyecto. El
error aparece recién en producción, como un `42703 column ... does not exist`.

Y si el error está dentro de un bloque que lo captura y lo ignora, la consulta
muere **en silencio**. Passó dos veces el mismo día:

| Columna | Qué pasaba |
|---|---|
| `cadetes_pagos_extras.viaje_numero` | El cadete no veía sus pagos extras y su monto base salía en 0. Nadie se enteró hasta mirar los logs de Supabase. |
| `clientes.puntos` | Pagar con puntos desde la tienda fallaba siempre con un 400. 19 de las 20 consultas del proyecto usaban bien `puntos_actuales`; una se había quedado atrás. |

## Cómo se usa

```bash
npm run verificar:esquema
```

Cruza todas las columnas que el código le pide a la base contra este archivo.
Si alguna no existe, dice qué tabla, qué columna, en qué archivo, y sale con
código 1.

## Corre en el build automáticamente

No hace falta acordarse de correrlo:

```json
"build": "npm run verificar:esquema && next build"
```

Si el código y la base discrepan, **el build falla y no se despliega**. Eso es
intencional: es preferible que Vercel rechace el deploy a que un 42703 llegue
a producción y deje de funcionar una funcionalidad en silencio.

Probado en los dos sentidos: reintroduciendo `clientes.puntos` a propósito, el
build corta con código 1 sin llegar a compilar. Sin el bug, compila.

El script usa `git ls-files` para no meterse en `node_modules`, y si no
encuentra git (CI) cae a un recorrido del disco por las carpetas del proyecto.

**Ojo:** esto solo se ejecuta en el build, no en `npm run dev`. Si estás
trabajando contra una base que todavía no tenés en este archivo, corré el
comando a mano de vez en cuando.

## Cómo se regenera

Cuando cambie el esquema de la base, hay que actualizar la foto. En Supabase
Studio → SQL Editor:

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

Y después copiar el resultado a `datos/esquema-verificado.json` con esta forma:

```json
{
  "generado": "AAAA-MM-DD",
  "tablas": { "nombre_tabla": ["columna1", "columna2"] },
  "sin_verificar": []
}
```

## Qué NO cubre

Es una verificación de nombres, no de tipos ni de lógica. Se le escapan:

- Los `INSERT` que pasan una variable (`.insert(payload)`): no puede seguir
  la variable hasta donde se construyó.
- Los filtros dentro de un `.or('a.ilike.1,b.ilike.1')`.
- Las columnas que solo se usan dentro de una función RPC de Postgres.
- Las claves foráneas y las políticas de RLS.

Para un esquema completo, con tipos, defaults y claves foráneas, la fuente
real sigue siendo `npx supabase db dump --linked --schema public`.

## Tablas sin verificar

`usuarios`, `turnos`, `tienda_metadata` y `stock_recetas` están en la lista
`sin_verificar` porque la consulta de origen se cortó antes de llegar. El
script las omite en vez de reportar falsos positivos.
