#!/usr/bin/env node
// ─────────────────────────────────────────────────────
// scripts/verificar-esquema.mjs
// ─────────────────────────────────────────────────────
//
// CRUZA TODAS las columnas que el código le pide a la base contra el esquema
// real, y falla si alguna no existe.
//
// POR QUÉ EXISTE
// Escribir una columna que el código pide y la base no tiene NO da error de
// compilación: TypeScript no sabe contra qué base se corre. Pasa el typecheck,
// pasa el build, y revienta recién en producción con un 42703.
//
// Cuando eso pasa dentro de un bloque que captura el error, la consulta muere
// en SILENCIO. Ya pasó dos veces:
//
//   2026-09-29  cadetes_pagos_extras.viaje_numero  -- el cadete no veía sus
//               pagos extras y su monto base salía en 0. Nadie se enteró
//               hasta mirar los logs de Supabase.
//   2026-09-29  clientes.puntos                   -- pagar con puntos desde la
//               tienda fallaba siempre con 400. 19 de 20 consultas usaban
//               bien el nombre; una se había quedado atrás.
//
// Ambos estaban en consultas cuyo error se ignoraba. Este script los
// encuentra en un segundo.
//
// ─────────────────────────────────────────────────────
//
// CÓMO SE USA
//
//   1. Regenerar el esquema (cuando cambia la base):
//        node scripts/actualizar-esquema.mjs
//
//   2. Correr el chequeo:
//        npm run verificar:esquema
//
// Si algo falla, el script dice qué tabla, qué columna, en qué archivo y con
// qué consulta. Salida distinta de 0 para que un CI pueda cortarlo.
//
// ─────────────────────────────────────────────────────
//
// LIMITACIÓN CONOCIDA
// Solo detecta columnas que el código LISTA explícitamente. Se le escapan:
//
//   - Los INSERT que pasan una variable: `.insert(payload)` donde payload se
//     construyó antes. El script no la puede seguir.
//   - Los filtros dentro de un `.or('a.ilike.1,b.ilike.1')`.
//   - Las columnas que solo se usan dentro de una función RPC de Postgres.
//
// Para eso está `pg_proc`, que se chequea aparte.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ESQUEMA_PATH = path.join(RAIZ, 'datos', 'esquema-verificado.json');

if (!fs.existsSync(ESQUEMA_PATH)) {
  console.error(
    `No existe ${ESQUEMA_PATH}.\n` +
    `Generalo con: node scripts/actualizar-esquema.mjs`
  );
  process.exit(2);
}

const ESQUEMA = JSON.parse(fs.readFileSync(ESQUEMA_PATH, 'utf8'));

// Tablas sin datos verificados: se omiten en vez de reportar falsos positivos.
const SIN_VERIFICAR = new Set(ESQUEMA.sin_verificar || []);

const archivos = execSync('git ls-files "*.ts" "*.tsx"', { cwd: RAIZ, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => /^(app|servicios|lib|contexto|hooks|scripts)\//.test(f));

// Resuelve constantes tipo .select(COLUMNAS_PEDIDO) para no perder columnas
// que llegan por indirección.
const constantes = new Map();
for (const f of archivos) {
  const src = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  for (const m of src.matchAll(/(?:const|export const)\s+([A-Z_][A-Z0-9_]*)\s*=\s*'([^']+)'/g)) {
    constantes.set(m[1], m[2]);
  }
}

// Opciones de PostgREST que aparecen como clave de objeto pero no son columnas.
// Se filtran igual, por si alguna se escapa del limpiado de abajo.
const NO_ES_COLUMNA = new Set([
  'select', 'order', 'eq', 'neq', 'single', 'maybeSingle', 'insert', 'update',
  'upsert', 'onConflict', 'head', 'count', 'ignoreDuplicates', 'defaultToNull',
  'preferences', 'foreignTable', 'referencedTable', 'limit', 'offset',
]);

const resolverColumnas = (crudo) => {
  // .select('id, nombre', { count: 'exact', head: true }) — lo que va después
  // de la coma son opciones de PostgREST, no columnas. Sin esto, `head` y
  // `count` se reportaban como columnas inexistentes.
  const soloColumnas = crudo.replace(/\{[^}]*\}.*$/, '').replace(/,\s*$/, '');

  return soloColumnas
    .split(',')
    .map((c) => c.trim().split(':')[0].trim().replace(/^["'`*]|["'`]$/g, ''))
    .flatMap((c) => (constantes.has(c) ? constantes.get(c).split(',') : [c]))
    .map((c) => c.trim())
    .filter((c) => /^\w+$/.test(c) && c !== '*' && !NO_ES_COLUMNA.has(c));
};

const problemas = [];
let consultasRevisadas = 0;

const registrar = (tabla, columna, archivo, tipo) => {
  if (SIN_VERIFICAR.has(tabla) || !ESQUEMA.tablas?.[tabla]) return;
  const reales = ESQUEMA.tablas[tabla];
  if (reales.includes(columna)) return;
  // Evitar repetir el mismo hallazgo 10 veces si aparece en muchos archivos.
  const yaExiste = problemas.find(
    (p) => p.tabla === tabla && p.columna === columna
  );
  if (yaExiste) {
    yaExiste.archivos.add(archivo);
    return;
  }
  consultasRevisadas++;
  problemas.push({ tabla, columna, tipo, archivos: new Set([archivo]) });
};

for (const f of archivos) {
  const src = fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\s+/g, ' ');

  for (const m of src.matchAll(/\.from\(\s*'(\w+)'\s*\)\s*\.select\(\s*([^)]+?)\s*\)/g)) {
    consultasRevisadas++;
    for (const c of resolverColumnas(m[2])) {
      registrar(m[1], c, f, 'columna leída que no existe');
    }
  }

  // Escrituras con objeto literal. La ventana no puede cruzar otro .from(),
  // por el mismo motivo que los filtros: si lo hace, el .update de la tabla
  // siguiente se le atribuye a la anterior.
  for (const m of src.matchAll(
    /\.from\(\s*'(\w+)'\s*\)((?:(?!\.from\()[\s\S]){0,250}?)\.(?:insert|update|upsert)\(\s*\{([\s\S]{0,800}?)\}\s*\)/g
  )) {
    for (const c of m[3].matchAll(/([A-Za-z_]\w*)\s*:/g)) {
      if (NO_ES_COLUMNA.has(c[1])) continue;
      registrar(m[1], c[1], f, 'escritura a columna que no existe');
    }
  }

  // Filtros .eq/.order/etc. OJO: la ventana entre .from('t') y el filtro no
  // puede cruzar otro .from(), o el filtro se le atribuye a la tabla
  // equivocada. Pasaba con .from('cierres_diarios') seguido de .from('turnos')
  // y su .eq('activo'): reportaba cierres_diarios.activo inexistente.
  for (const m of src.matchAll(
    /\.from\(\s*'(\w+)'\s*\)((?:(?!\.from\()[\s\S]){0,400}?)\.(eq|neq|gt|gte|lt|lte|order|ilike|like|is)\(\s*['"](\w+)['"]/g
  )) {
    registrar(m[1], m[4], f, `filtro .${m[3]}() sobre columna que no existe`);
  }
}

console.log(`Tablas verificadas:  ${Object.keys(ESQUEMA.tablas || {}).length}`);
console.log(`Tablas omitidas:     ${[...SIN_VERIFICAR].join(', ') || 'ninguna'}`);
console.log('');

if (problemas.length === 0) {
  console.log('OK — ninguna columna del código apunta a algo que no exista en la base.');
  process.exit(0);
}

console.error(`FALLÓ: ${problemas.length} columna(s) del código no existen en la base\n`);
for (const p of problemas) {
  console.error(`  ${p.tabla}.${p.columna}`);
  console.error(`      ${p.tipo}`);
  console.error(`      ${[...p.archivos].join('\n      ')}`);
  console.error('');
}
console.error('Cada una de estas hace fallar la consulta ENTERA en producción (42703).');
console.error('Si el error se captura y se ignora, la consulta muere en silencio.');
process.exit(1);
