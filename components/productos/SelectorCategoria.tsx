'use client'

// ─────────────────────────────────────────────────────
// components/productos/SelectorCategoria.tsx
// Selector de categoría del catálogo.
// ─────────────────────────────────────────────────────

import { obtenerCategoriasActivas } from '@/lib/catalogo'

interface PropsSelectorCategoria {
  valor: string
  onCambio: (idCategoria: string) => void
  claseSelect?: string
  deshabilitado?: boolean
}

const clasePorDefecto =
  'w-full border border-gray-300 rounded-md px-2 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent'

export default function SelectorCategoria({
  valor,
  onCambio,
  claseSelect = clasePorDefecto,
  deshabilitado = false,
}: PropsSelectorCategoria) {
  const categorias = obtenerCategoriasActivas()

  return (
    <select
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
      disabled={deshabilitado}
      className={claseSelect}
    >
      <option value="">Categoría…</option>
      {categorias.map((categoria) => (
        <option key={categoria.id} value={categoria.id}>
          {categoria.nombre}
        </option>
      ))}
    </select>
  )
}
