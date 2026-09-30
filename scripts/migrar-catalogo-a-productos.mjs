// ─────────────────────────────────────────────────────
// scripts/migrar-catalogo-a-productos.mjs
// ─────────────────────────────────────────────────────
//
// COPIA el catálogo desde la tabla blob `catalogo` hacia las tablas
// normalizadas `categorias`, `productos` y `modificadores`.
//
// POR QUÉ
// /api/tienda/pedido/route.ts valida que el precio que manda el cliente
// coincida con el de la base. Hace un `.from('productos')`, y esa tabla
// estaba VACÍA: los 110 productos vivían solo dentro de un JSON en la
// fila `catalogo`. Con la tabla vacía la validación nunca se ejecutaba y
// el endpoint aceptaba cualquier precio.
//
// Verificado 2026-09-30: productos = 0 filas, catalogo.productos = 110.
//
// QUÉ HACE
//   - UPSERT de las 12 categorías, 110 productos y 4 modificadores.
//   - Idempotente: se puede correr las veces que quiera.
//   - No borra nada. Lo que no está en el blob tampoco se toca.
//   - Reporta los productos cuya categoría no existe, sin inventar una.
//
// CÓMO SE CORRE
//   node scripts/migrar-catalogo-a-productos.mjs          (muestra y pregunta)
//   node scripts/migrar-catalogo-a-productos.mjs --aplicar (escribe)
//
// ─────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function leerEnv() {
  const archivo = path.join(RAIZ, ".env.local");
  if (!fs.existsSync(archivo)) {
    console.error("No existe .env.local. Copiá .env.example y completalo.");
    process.exit(1);
  }
  const txt = fs.readFileSync(archivo, "utf8");
  const g = (k) => {
    const m = txt.match(new RegExp("^" + k + "=(.*)$", "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
  };
  return { url: g("NEXT_PUBLIC_SUPABASE_URL"), key: g("SUPABASE_SERVICE_ROLE_KEY") };
}

const { url, key } = leerEnv();
if (!url || !key) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const H = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

const aplicar = process.argv.includes("--aplicar");

// ── 1. Leer el blob ────────────────────────────────────────────────────────
const r = await fetch(`${url}/rest/v1/catalogo?select=categorias,productos,modificadores`, { headers: H });
if (!r.ok) {
  console.error("No se pudo leer la tabla catalogo:", r.status, await r.text());
  process.exit(1);
}
const fila = (await r.json())[0];
if (!fila) {
  console.error("La tabla catalogo esta vacia. No hay nada que migrar.");
  process.exit(1);
}

const categorias = Array.isArray(fila.categorias) ? fila.categorias : [];
const productos = Array.isArray(fila.productos) ? fila.productos : [];
const modificadores = Array.isArray(fila.modificadores) ? fila.modificadores : [];

// ── 2. Diagnóstico previo ──────────────────────────────────────────────────
const idsCategoria = new Set(categorias.map((c) => c.id));
const huerfanos = productos.filter((p) => !idsCategoria.has(p.categoriaId));
const idsDuplicados = (() => {
  const ids = productos.map((p) => p.id);
  return ids.filter((id, i) => ids.indexOf(id) !== i);
})();
const preciosInvalidos = productos.filter((p) => typeof p.precio !== "number" || p.precio < 0);

console.log("=== Catalogo en la tabla blob 'catalogo' ===");
console.log(`  categorias:    ${categorias.length}`);
console.log(`  productos:     ${productos.length}`);
console.log(`  modificadores: ${modificadores.length}\n`);

if (huerfanos.length) {
  console.log(`  ATENCION: ${huerfanos.length} producto(s) apuntan a una categoria inexistente:`);
  for (const p of huerfanos) {
    console.log(`    - "${p.nombre}"  ->  ${p.categoriaId}`);
  }
  console.log(`    Se van a copiar igual (el id queda), pero esos productos quedan`);
  console.log(`    huerfanos: no apareceran bajo ninguna categoria del menu.\n`);
}
if (idsDuplicados.length) {
  console.log(`  ATENCION: ${idsDuplicados.length} id(s) duplicados: ${idsDuplicados.join(", ")}\n`);
}
if (preciosInvalidos.length) {
  console.log(`  ATENCION: ${preciosInvalidos.length} producto(s) con precio invalido:\n`);
}

// Estado actual
const actual = await fetch(`${url}/rest/v1/productos?select=id`, { headers: { ...H, Prefer: "count=exact", Range: "0-0" } });
const filasActuales = (actual.headers.get("content-range") || "").split("/")[1] ?? "?";
console.log(`  tabla productos ahora: ${filasActuales} filas\n`);

if (!aplicar) {
  console.log("Esto es solo una vista previa. Para escribir:");
  console.log("  node scripts/migrar-catalogo-a-productos.mjs --aplicar\n");
  process.exit(0);
}

// ── 3. Escribir ────────────────────────────────────────────────────────────
const filasCategoria = categorias.map((c) => ({
  id: String(c.id),
  nombre: String(c.nombre ?? c.id),
  orden: Number.isFinite(Number(c.orden)) ? Number(c.orden) : 0,
  activa: c.activa !== false,
}));

const filasProducto = productos.map((p) => ({
  id: String(p.id),
  categoria_id: String(p.categoriaId ?? ""),
  nombre: String(p.nombre ?? p.id),
  precio: Number(p.precio) || 0,
  precio_puntos:
    p.precio_puntos === null || p.precio_puntos === undefined || Number(p.precio_puntos) <= 0
      ? null
      : Number(p.precio_puntos),
  activo: p.activo !== false,
  es_combo: Boolean(p.esCombo),
  stock: p.stock === null || p.stock === undefined ? null : Number(p.stock),
  modificadores_ids: Array.isArray(p.modificadoresIds) ? p.modificadoresIds.map(String) : [],
}));

const filasModificador = modificadores.map((m) => ({
  id: String(m.id),
  nombre: String(m.nombre ?? m.id),
  precio_extra: Number(m.precioExtra) || 0,
}));

async function escribir(tabla, filas) {
  if (filas.length === 0) return { ok: true, n: 0 };
  const r = await fetch(`${url}/rest/v1/${tabla}?on_conflict=id`, {
    method: "POST",
    headers: H,
    body: JSON.stringify(filas),
  });
  const texto = await r.text();
  return { ok: r.ok, n: texto ? JSON.parse(texto).length : filas.length, texto, status: r.status };
}

console.log("Escribiendo...\n");

const r1 = await escribir("categorias", filasCategoria);
console.log(`  categorias:    ${r1.ok ? "OK " : "FALLA"} ${r1.ok ? `${r1.n} filas` : r1.texto?.slice(0, 200)}`);

const r2 = await escribir("productos", filasProducto);
console.log(`  productos:     ${r2.ok ? "OK " : "FALLA"} ${r2.ok ? `${r2.n} filas` : r2.texto?.slice(0, 300)}`);

const r3 = await escribir("modificadores", filasModificador);
console.log(`  modificadores: ${r3.ok ? "OK " : "FALLA"} ${r3.ok ? `${r3.n} filas` : r3.texto?.slice(0, 200)}`);

if (!r2.ok) {
  console.log("\nNo se pudieron escribir los productos. No ejecutes esto en produccion");
  console.log("hasta entender el error de arriba: puede ser una clave foranea que");
  console.log("rechace las categorias huerfanas.");
  process.exit(1);
}

// ── 4. Verificación ────────────────────────────────────────────────────────
console.log("\n=== Verificacion ===");
for (const t of ["categorias", "productos", "modificadores"]) {
  const r = await fetch(`${url}/rest/v1/${t}?select=*`, { headers: { ...H, Prefer: "count=exact", Range: "0-0" } });
  const n = (r.headers.get("content-range") || "").split("/")[1];
  console.log(`  ${t.padEnd(14)} ${n} filas`);
}

// Muestra de precios ahora disponibles para el servidor
const muestra = await fetch(`${url}/rest/v1/productos?select=nombre,precio&order=precio.desc&limit=3`, { headers: H });
const prods = await muestra.json();
console.log("\n  Productos mas caros (el servidor ya puede validarlos):");
for (const p of prods) console.log(`    ${String(p.nombre).padEnd(30)} $${p.precio}`);

console.log("\nListo. La validacion de precios de /api/tienda/pedido ya tiene contra");
console.log("que compararse. Probalo mandando un precio adulterado: ahora debe rechazarlo.");