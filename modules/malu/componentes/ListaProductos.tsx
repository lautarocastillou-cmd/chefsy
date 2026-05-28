'use client'

// ─────────────────────────────────────────────────────
// modules/malu/componentes/ListaProductos.tsx
// Panel de control de stock y listado de productos de Malú.
// ─────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { usarMalu } from '../contexto'
import type { ProductoMalu } from '../tipos'
import ModalProducto from './ModalProducto'
import ModalVentaMostrador from './ModalVentaMostrador'

function formatearPeso(monto: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

function ImagenProducto({ src, alt }: { src?: string | null; alt: string }) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-neutral-900/60 select-none">
        <span className="text-base">👕</span>
        <span className="text-[7px] font-bold text-neutral-500 mt-0.5 tracking-wider uppercase">Sin Foto</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  )
}

export default function ListaProductos() {
  const { productos, borrarProducto, sincronizarStock, cargando } = usarMalu()
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas')
  const [filtroStock, setFiltroStock] = useState<'todos' | 'sin'>('todos')
  const [modalProducto, setModalProducto] = useState<ProductoMalu | null>(null) // null = cerrado, 'new' = agregar, ProductoMalu = editar
  const [modalVenta, setModalVenta] = useState<{ producto: ProductoMalu; metodo: 'efectivo' | 'transferencia' | 'fiar' } | null>(null)
  const [modalQrProducto, setModalQrProducto] = useState<ProductoMalu | null>(null)
  const [abrirNuevo, setAbrirNuevo] = useState(false)
  const [ultimoSyncStr, setUltimoSyncStr] = useState('')

  const [tiendaUrl, setTiendaUrl] = useState('')
  const [sincronizando, setSincronizando] = useState(false)

  // Estados para nueva categoría
  const [categoriasExtra, setCategoriasExtra] = useState<string[]>([])
  const [abrirCategoria, setAbrirCategoria] = useState(false)
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('malu-categorias-extra')
    if (stored) {
      try {
        setCategoriasExtra(JSON.parse(stored))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const handleGuardarCategoria = (e: React.FormEvent) => {
    e.preventDefault()
    const cat = nuevaCategoriaNombre.trim()
    if (!cat) return
    if (!categoriasExtra.includes(cat)) {
      const nuevas = [...categoriasExtra, cat]
      setCategoriasExtra(nuevas)
      localStorage.setItem('malu-categorias-extra', JSON.stringify(nuevas))
    }
    setNuevaCategoriaNombre('')
    setAbrirCategoria(false)
  }

  const cargarUltimoSync = () => {
    const saved = localStorage.getItem('malu-last-sync-time')
    if (!saved) {
      setUltimoSyncStr('Nunca sincronizado')
      return
    }
    try {
      const d = new Date(saved)
      const hoy = new Date()
      const ayer = new Date()
      ayer.setDate(hoy.getDate() - 1)
      
      const hs = d.getHours().toString().padStart(2, '0')
      const mins = d.getMinutes().toString().padStart(2, '0')
      const timePart = `a las ${hs}:${mins} hs`
      
      if (d.toDateString() === hoy.toDateString()) {
        setUltimoSyncStr(`Última sincronización: Hoy ${timePart}`)
      } else if (d.toDateString() === ayer.toDateString()) {
        setUltimoSyncStr(`Última sincronización: Ayer ${timePart}`)
      } else {
        const dia = d.getDate().toString().padStart(2, '0')
        const mes = (d.getMonth() + 1).toString().padStart(2, '0')
        const anio = d.getFullYear()
        setUltimoSyncStr(`Última sincronización: el ${dia}/${mes}/${anio} ${timePart}`)
      }
    } catch {
      setUltimoSyncStr('Nunca sincronizado')
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('malu-empretienda-url')
    if (saved) {
      setTiendaUrl(saved)
    } else {
      setTiendaUrl('https://malucta.empretienda.com.ar')
    }
    cargarUltimoSync()
  }, [])

  const handleSincronizar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tiendaUrl.trim() || sincronizando) return
    setSincronizando(true)
    try {
      const res = await sincronizarStock(tiendaUrl.trim())
      alert(`Sincronización exitosa.\nSe crearon ${res.creados} productos nuevos.\nSe actualizaron ${res.actualizados} existentes (total procesados: ${res.total}).`)
      localStorage.setItem('malu-empretienda-url', tiendaUrl.trim())
      localStorage.setItem('malu-last-sync-time', new Date().toISOString())
      cargarUltimoSync()
    } catch (err: any) {
      console.error(err)
      alert(`Error al sincronizar: ${err.message || 'Error de red o CORS'}`)
    } finally {
      setSincronizando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(229,211,179,0.3)', borderTopColor: '#E5D3B3' }}
        />
      </div>
    )
  }

  // Filtrado de productos
  const filtrados = productos.filter(p => {
    const matchBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo || '').toLowerCase().includes(busqueda.toLowerCase())
    const matchCategoria =
      categoriaFiltro === 'Todas' || p.categoria === categoriaFiltro
    const matchStock =
      filtroStock === 'todos' || (filtroStock === 'sin' && p.stock === 0)
    return matchBusqueda && matchCategoria && matchStock
  })

  // Obtener categorías únicas (incluyendo las agregadas manualmente)
  const categorias = ['Todas', ...Array.from(new Set([
    ...productos.map(p => p.categoria).filter(Boolean) as string[],
    ...categoriasExtra
  ]))]

  // Métricas
  const totalStockItems = productos.reduce((acc, p) => acc + p.stock, 0)
  const sinStock = productos.filter(p => p.stock === 0).length
  const valorTotalInventario = productos.reduce((acc, p) => acc + (p.precio * p.stock), 0)

  const handleEliminar = async (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de que querés eliminar el producto "${nombre}"?`)) {
      try {
        await borrarProducto(id)
      } catch (err) {
        alert('Error al eliminar el producto.')
      }
    }
  }

  return (
    <div className="space-y-7">
      {/* Sincronizador de Empretienda */}
      <form 
        onSubmit={handleSincronizar}
        className="rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
        style={{ 
          background: 'rgba(229,211,179,0.03)', 
          border: '1px solid rgba(229,211,179,0.12)',
        }}
      >
        <div className="flex-1">
          <h4 className="text-xs font-bold text-neutral-200 tracking-wider uppercase mb-0.5">
            Sincronización con Empretienda
          </h4>
          <p className="text-[11px] text-neutral-400">
            Abril, importá y actualizá el stock desde tu tienda pública.
          </p>
        </div>

        <div className="flex gap-2 shrink-0 flex-col sm:flex-row flex-1 sm:flex-initial">
          <input
            type="text"
            placeholder="https://marca.empretienda.com.ar"
            value={tiendaUrl}
            onChange={e => setTiendaUrl(e.target.value)}
            disabled={sincronizando}
            required
            className="px-3.5 py-2 rounded-xl text-xs outline-none transition-colors duration-150"
            style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: '#f5f5f5',
            }}
          />
          <div className="flex flex-col items-stretch sm:items-end gap-1.5">
            <button
              type="submit"
              disabled={sincronizando || !tiendaUrl.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap w-full"
              style={{
                background: sincronizando ? 'rgba(229,211,179,0.3)' : 'linear-gradient(135deg, #E5D3B3, #C9B497)',
                color: '#0a0a0a',
                boxShadow: sincronizando ? 'none' : '0 4px 12px rgba(229,211,179,0.15)',
              }}
            >
              {sincronizando ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <span className="w-3.5 h-3.5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                  Sincronizando...
                </span>
              ) : (
                'Sincronizar Stock Web'
              )}
            </button>
            {ultimoSyncStr && (
              <span className="text-[10px] text-neutral-500 font-medium px-1 text-center sm:text-right w-full select-none">
                {ultimoSyncStr}
              </span>
            )}
          </div>
        </div>
      </form>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'todos', label: 'Productos Distintos', value: productos.length.toString(), color: '#E5D3B3' },
          { id: 'total', label: 'Stock Total (Prendas)', value: totalStockItems.toString(), color: '#eab308' },
          { id: 'sin', label: 'Sin Stock', value: sinStock.toString(), color: sinStock > 0 ? '#ef4444' : 'rgba(255,255,255,0.35)' },
        ].map(m => {
          const isActive = (m.id === 'sin' && filtroStock === 'sin') || (m.id === 'todos' && filtroStock === 'todos')
          return (
            <button
              key={m.label}
              type="button"
              onClick={() => {
                if (m.id === 'sin') {
                  setFiltroStock(prev => prev === 'sin' ? 'todos' : 'sin')
                } else {
                  setFiltroStock('todos')
                }
              }}
              className="rounded-2xl p-4 text-left transition-all duration-150 active:scale-[0.98] outline-none"
              style={{ 
                background: isActive ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)', 
                border: isActive ? `1px solid ${m.color}` : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isActive ? `0 0 12px rgba(${m.id === 'sin' ? '239,68,68' : '229,211,179'}, 0.12)` : 'none'
              }}
            >
              <p className="text-[10px] uppercase tracking-widest mb-1 text-neutral-400">
                {m.label}
              </p>
              <p className="text-xl font-bold" style={{ color: m.color }}>
                {m.value}
              </p>
            </button>
          )
        })}
      </div>

      {/* Buscador + Botón Nuevo */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre o código/SKU..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f5f5f5',
              caretColor: '#E5D3B3',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(229,211,179,0.4)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setAbrirCategoria(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:bg-white/5 active:scale-[0.98] whitespace-nowrap"
            style={{
              borderColor: 'rgba(229,211,179,0.3)',
              color: '#E5D3B3',
              background: 'rgba(229,211,179,0.04)',
            }}
          >
            + Nueva Categoría
          </button>
          <button
            onClick={() => setAbrirNuevo(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, #E5D3B3, #C9B497)',
              color: '#0a0a0a',
              boxShadow: '0 4px 12px rgba(229,211,179,0.25)',
            }}
          >
            + Nuevo Producto
          </button>
        </div>
      </div>

      {/* Filtro de Categorías */}
      {categorias.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaFiltro(cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: categoriaFiltro === cat ? 'rgba(229,211,179,0.15)' : 'rgba(255,255,255,0.04)',
                border: categoriaFiltro === cat ? '1px solid rgba(229,211,179,0.3)' : '1px solid rgba(255,255,255,0.07)',
                color: categoriaFiltro === cat ? '#E5D3B3' : 'rgba(255,255,255,0.5)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Lista de Productos */}
      {filtrados.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {busqueda || categoriaFiltro !== 'Todas' ? (
            <>
              <p className="text-3xl mb-2">🔍</p>
              <p>No se encontraron productos con esos filtros</p>
            </>
          ) : (
            <>
              <p className="text-3xl mb-2">📦</p>
              <p className="text-sm">Abril, aún no tenés productos cargados en el stock</p>
              <button
                onClick={() => setAbrirNuevo(true)}
                className="mt-3 text-xs underline"
                style={{ color: '#E5D3B3' }}
              >
                Cargar tu primer producto
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtrados.map((p, i) => {
            const lowStock = p.stock > 0 && p.stock <= 3
            const outOfStock = p.stock === 0

            return (
              <div
                key={p.id}
                className="rounded-2xl px-4 py-3.5 flex items-center justify-between gap-4 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  animationDelay: `${i * 30}ms`,
                }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Vista previa miniatura de imagen */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <ImagenProducto src={p.imagen_url} alt={p.nombre} />
                  </div>

                  {/* Nombre y detalles */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-neutral-100 truncate">
                        {p.nombre}
                      </p>
                      {p.codigo && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}
                        >
                          {p.codigo}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap text-neutral-400">
                      {p.categoria && <span>{p.categoria}</span>}
                      {p.talle && <span>• Talle: {p.talle}</span>}
                      {p.color && <span>• Color: {p.color}</span>}
                    </div>
                  </div>
                </div>

                {/* Info de Precio, Stock y Acciones */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-sm text-neutral-100">
                      {formatearPeso(p.precio)}
                    </p>
                    <div className="mt-1">
                      {outOfStock ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          Sin Stock
                        </span>
                      ) : lowStock ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', border: '1px solid rgba(234,179,8,0.2)' }}
                        >
                          Bajo ({p.stock})
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          Stock: {p.stock}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModalVenta({ producto: p, metodo: 'efectivo' })}
                      className="p-1.5 rounded-lg transition-all hover:bg-white/10 text-sm font-semibold shrink-0"
                      title="Registrar Venta ($)"
                      style={{ color: '#E5D3B3' }}
                    >
                      $
                    </button>
                    <button
                      onClick={() => setModalVenta({ producto: p, metodo: 'fiar' })}
                      className="p-1.5 rounded-lg transition-all hover:bg-white/10 text-xs shrink-0"
                      title="Fiar / Cuenta Corriente"
                      style={{ color: '#f87171' }}
                    >
                      👤+
                    </button>
                    <button
                      onClick={() => setModalQrProducto(p)}
                      className="p-1.5 rounded-lg transition-all hover:bg-white/10 text-xs shrink-0 text-neutral-400 hover:text-white"
                      title="Ver Código QR"
                    >
                      📷
                    </button>
                    <button
                      onClick={() => setModalProducto(p)}
                      className="p-1.5 rounded-lg transition-all hover:bg-white/10 text-xs shrink-0"
                      title="Editar"
                      style={{ color: '#E5D3B3' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleEliminar(p.id, p.nombre)}
                      className="p-1.5 rounded-lg transition-all hover:bg-red-500/15 text-xs text-red-400 shrink-0"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modales */}
      {abrirNuevo && (
        <ModalProducto onCerrar={() => setAbrirNuevo(false)} />
      )}
      {modalProducto && (
        <ModalProducto producto={modalProducto} onCerrar={() => setModalProducto(null)} />
      )}
      {modalVenta && (
        <ModalVentaMostrador 
          producto={modalVenta.producto} 
          metodoInicial={modalVenta.metodo} 
          onCerrar={() => setModalVenta(null)} 
        />
      )}

      {modalQrProducto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }}
          onClick={() => setModalQrProducto(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 text-center space-y-4 animate-[slideIn_0.2s_ease-out] print:p-0 print:border-none"
            style={{
              background: '#161616',
              border: '1px solid rgba(229, 211, 179, 0.18)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-neutral-200 font-serif-elegant">Código QR de Prenda</h3>
              <button
                onClick={() => setModalQrProducto(null)}
                className="text-xs p-1 px-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mx-auto print:p-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(modalQrProducto.id)}`}
                alt={`QR ${modalQrProducto.nombre}`}
                className="w-48 h-48 mx-auto object-contain"
              />
            </div>

            <div className="space-y-1 text-center">
              <h4 className="font-bold text-base text-neutral-100">{modalQrProducto.nombre}</h4>
              <p className="text-xs text-neutral-400">
                Precio: <span className="font-bold text-[#E5D3B3]">{formatearPeso(modalQrProducto.precio)}</span>
              </p>
              {modalQrProducto.codigo && (
                <p className="text-[10px] text-neutral-500 font-mono">Código/SKU: {modalQrProducto.codigo}</p>
              )}
            </div>

            <div className="flex gap-2 pt-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-neutral-900 transition-all hover:opacity-95"
                style={{ background: 'linear-gradient(135deg, #E5D3B3, #C9B497)' }}
              >
                🖨️ Imprimir Código
              </button>
              <button
                onClick={() => setModalQrProducto(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Categoría */}
      {abrirCategoria && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }}
          onClick={() => setAbrirCategoria(false)}
        >
          <form
            onSubmit={handleGuardarCategoria}
            className="w-full max-w-sm rounded-3xl p-6 space-y-4 animate-[slideIn_0.2s_ease-out]"
            style={{
              background: '#161616',
              border: '1px solid rgba(229, 211, 179, 0.18)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-neutral-200 font-serif-elegant">Nueva Categoría</h3>
              <button
                type="button"
                onClick={() => setAbrirCategoria(false)}
                className="text-xs p-1 px-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                Nombre de la Categoría *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Accesorios, Camperas, Hot Sale..."
                value={nuevaCategoriaNombre}
                onChange={e => setNuevaCategoriaNombre(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(229,211,179,0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAbrirCategoria(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-neutral-900 transition-all hover:opacity-95"
                style={{ background: 'linear-gradient(135deg, #E5D3B3, #C9B497)' }}
              >
                Guardar Categoría
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
