'use client'

// ─────────────────────────────────────────────────────
// components/productos/SelectorProducto.tsx
// Selector de producto según categoría elegida.
// ─────────────────────────────────────────────────────

import { obtenerProductosPorCategoria } from '@/lib/catalogo'

interface PropsSelectorProducto {
  idCategoria: string
  valor: string
  onCambio: (idProducto: string) => void
  claseSelect?: string
}

const clasePorDefecto =
  'w-full border border-gray-300 rounded-md px-2 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent'

export default function SelectorProducto({
  idCategoria,
  valor,
  onCambio,
  claseSelect = clasePorDefecto,
}: PropsSelectorProducto) {
  const productos = idCategoria ? obtenerProductosPorCategoria(idCategoria) : []
  const deshabilitado = !idCategoria

  return (
    <select
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
      disabled={deshabilitado}
      className={claseSelect}
    >
      <option value="">
        {deshabilitado ? 'Elegí categoría primero' : 'Producto…'}
      </option>
      {productos.map((producto) => (
        <option key={producto.id} value={producto.id}>
          {producto.esCombo ? '🎁 ' : ''}{producto.nombre} — ${producto.precio.toLocaleString('es-AR')}
        </option>
      ))}
    </select>
  )
}
