'use client'

// ─────────────────────────────────────────────────────
// modules/malu/componentes/ModalProducto.tsx
// Modal para agregar o editar productos de stock.
// ─────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { usarMalu } from '../contexto'
import type { ProductoMalu } from '../tipos'

interface Props {
  producto?: ProductoMalu | null
  onCerrar: () => void
}

export default function ModalProducto({ producto, onCerrar }: Props) {
  const { productos, agregarProducto, editarProducto } = usarMalu()

  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('')
  const [categoria, setCategoria] = useState('')
  const [talle, setTalle] = useState('')
  const [color, setColor] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Estados para autocompletar categorías
  const [dropdownCatOpen, setDropdownCatOpen] = useState(false)
  const [categoriasExtra, setCategoriasExtra] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('malu-categorias-extra')
    if (stored) {
      try {
        setCategoriasExtra(JSON.parse(stored))
      } catch {}
    }
  }, [])

  const todasLasCategorias = Array.from(new Set([
    ...productos.map(p => p.categoria).filter(Boolean) as string[],
    ...categoriasExtra
  ]))

  const filtradasCategorias = todasLasCategorias.filter(c =>
    c.toLowerCase().includes(categoria.toLowerCase())
  )

  useEffect(() => {
    if (producto) {
      setCodigo(producto.codigo || '')
      setNombre(producto.nombre || '')
      setDescripcion(producto.descripcion || '')
      setPrecio(producto.precio ? producto.precio.toString() : '0')
      setStock(producto.stock ? producto.stock.toString() : '0')
      setCategoria(producto.categoria || '')
      setTalle(producto.talle || '')
      setColor(producto.color || '')
      setImagenUrl(producto.imagen_url || '')
    }
  }, [producto])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    const numericPrecio = parseFloat(precio) || 0
    const numericStock = parseInt(stock, 10) || 0

    setGuardando(true)
    setError('')

    try {
      const datos = {
        codigo: codigo.trim() || null,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        precio: numericPrecio,
        stock: numericStock,
        imagen_url: imagenUrl.trim() || null,
        categoria: categoria.trim() || null,
        talle: talle.trim() || null,
        color: color.trim() || null,
        external_id: producto ? producto.external_id : null, // conservar external_id
      }

      if (producto) {
        await editarProducto(producto.id, datos)
      } else {
        await agregarProducto(datos)
      }
      onCerrar()
    } catch (err: any) {
      console.error(err)
      setError('Error al guardar el producto. Verificá si las tablas de Supabase están creadas.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto animate-[slideIn_0.2s_ease-out]"
        style={{
          background: '#161616',
          border: '1px solid rgba(229,211,179,0.2)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-neutral-100">
            {producto ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <button
            onClick={onCerrar}
            className="text-xs p-2 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
              Nombre del Producto *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Remera Over Malú"
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors duration-150"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(229,211,179,0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Fila: Precio y Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                Precio ($) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors duration-150"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(229,211,179,0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                Stock actual *
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={e => setStock(e.target.value)}
                placeholder="0"
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors duration-150"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(229,211,179,0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>

          {/* Fila: Categoría, Talle, Color */}
          <div className="grid grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                Categoría
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={categoria}
                  onChange={e => {
                    setCategoria(e.target.value)
                    setDropdownCatOpen(true)
                  }}
                  onFocus={() => setDropdownCatOpen(true)}
                  placeholder="Ej: Remeras"
                  className="w-full px-3 py-2.5 rounded-xl text-xs outline-none transition-colors duration-150"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                  onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(229,211,179,0.4)' }}
                  onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
                {dropdownCatOpen && filtradasCategorias.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownCatOpen(false)} />
                    <div className="absolute left-0 right-0 mt-1 max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-[#161616]/95 backdrop-blur-md shadow-2xl z-50 py-1">
                      {filtradasCategorias.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCategoria(c)
                            setDropdownCatOpen(false)
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-[#E5D3B3]/10 hover:text-[#E5D3B3] transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                Talle
              </label>
              <input
                type="text"
                value={talle}
                onChange={e => setTalle(e.target.value)}
                placeholder="Ej: M, Único"
                className="w-full px-3 py-2.5 rounded-xl text-xs outline-none transition-colors duration-150"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(229,211,179,0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                Color
              </label>
              <input
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="Ej: Negro"
                className="w-full px-3 py-2.5 rounded-xl text-xs outline-none transition-colors duration-150"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(229,211,179,0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>

          {/* Fila: Código SKU y URL de Imagen */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                Código / SKU
              </label>
              <input
                type="text"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                placeholder="Ej: REM-1234"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors duration-150"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(229,211,179,0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                URL de Imagen
              </label>
              <input
                type="text"
                value={imagenUrl}
                onChange={e => setImagenUrl(e.target.value)}
                placeholder="Ej: https://..."
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors duration-150"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(229,211,179,0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Confeccionado en algodón rústico..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none transition-colors duration-150"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(229,211,179,0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #E5D3B3, #C9B497)', color: '#0a0a0a' }}
            >
              {guardando ? 'Guardando...' : producto ? 'Guardar Cambios' : 'Agregar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
