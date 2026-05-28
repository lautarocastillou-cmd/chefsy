'use client'

// ─────────────────────────────────────────────────────
// modules/malu/componentes/ModalVentaMostrador.tsx
// Modal unificado para Registrar Venta (Efectivo/Transferencia)
// y Fiar / Cuenta Corriente desde Stock o desde Caja.
// ─────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { usarMalu, obtenerFechaNegocioMalu } from '../contexto'
import type { ProductoMalu } from '../tipos'

interface Props {
  producto?: ProductoMalu | null
  onCerrar: () => void
  metodoInicial?: 'efectivo' | 'transferencia' | 'fiar' | 'apartar'
}

function formatearPeso(monto: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

export default function ModalVentaMostrador({ producto = null, onCerrar, metodoInicial = 'efectivo' }: Props) {
  const { clientas, productos, agregarVenta, agregarVentaMostrador, editarProducto, agregarApartado } = usarMalu()

  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoMalu | null>(producto)
  const [talle, setTalle] = useState('Único')
  const [cantidad, setCantidad] = useState(1)
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia' | 'fiar' | 'apartar'>(metodoInicial === 'fiar' ? 'fiar' : (metodoInicial === 'apartar' ? 'apartar' : 'efectivo'))
  const [fecha, setFecha] = useState(obtenerFechaNegocioMalu())

  // Estado para Fiar
  const [busqueda, setBusqueda] = useState('')
  const [clientaSeleccionadaId, setClientaSeleccionadaId] = useState('')
  const [esCuotas, setEsCuotas] = useState(false)
  const [cuotas, setCuotas] = useState(3)

  // Estado para Seña / Apartar
  const [montoSenado, setMontoSenado] = useState<number>(0)
  const [metodoSeña, setMetodoSeña] = useState<'efectivo' | 'transferencia'>('efectivo')

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Estados personalizados
  const [dropdownCuotasOpen, setDropdownCuotasOpen] = useState(false)
  const [dropdownProdOpen, setDropdownProdOpen] = useState(false)
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [dropdownClientOpen, setDropdownClientOpen] = useState(false)

  // Buscador de productos
  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
    (p.codigo || '').toLowerCase().includes(busquedaProducto.toLowerCase()) ||
    (p.categoria || '').toLowerCase().includes(busquedaProducto.toLowerCase())
  )

  // Efecto para calcular talle inicial cuando se selecciona o cambia el producto
  useEffect(() => {
    if (productoSeleccionado) {
      const talles = productoSeleccionado.talle
        ? productoSeleccionado.talle.split(',').map(t => t.trim()).filter(Boolean)
        : ['Único']
      setTalle(talles[0] || 'Único')
    } else {
      setTalle('Único')
    }
  }, [productoSeleccionado])

  const tallesDisponibles = productoSeleccionado?.talle
    ? productoSeleccionado.talle.split(',').map(t => t.trim()).filter(Boolean)
    : ['Único']

  const clientasFiltradas = clientas.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.telefono && c.telefono.includes(busqueda))
  )

  const handleMetodoClick = (m: 'efectivo' | 'transferencia' | 'fiar' | 'apartar') => {
    setMetodo(m)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productoSeleccionado) {
      setError('Por favor, seleccioná un producto.')
      return
    }
    if (cantidad < 1) {
      setError('La cantidad debe ser al menos 1.')
      return
    }
    if (productoSeleccionado.stock !== undefined && productoSeleccionado.stock !== null && productoSeleccionado.stock < cantidad) {
      setError(`Stock insuficiente. Solo quedan ${productoSeleccionado.stock} unidades.`)
      return
    }

    setGuardando(true)
    setError('')

    try {
      const montoTotal = productoSeleccionado.precio * cantidad
      const nuevoStock = Math.max(0, (productoSeleccionado.stock || 0) - cantidad)

      if (metodo === 'apartar') {
        if (!clientaSeleccionadaId) {
          setError('Por favor, seleccioná una clienta.')
          setGuardando(false)
          return
        }
        if (montoSenado <= 0) {
          setError('Por favor, ingresá un monto de seña válido (mayor a 0).')
          setGuardando(false)
          return
        }
        if (montoSenado > montoTotal) {
          setError(`El monto señado no puede superar el total de ${formatearPeso(montoTotal)}.`)
          setGuardando(false)
          return
        }

        const clienta = clientas.find(c => c.id === clientaSeleccionadaId)
        if (!clienta) throw new Error('Clienta no encontrada')

        const talleStr = talle && talle !== 'Único' ? ` (${talle})` : ''

        // 1. Registrar Apartado
        await agregarApartado({
          clienta_id: clientaSeleccionadaId,
          producto_id: productoSeleccionado.id,
          descripcion: `${productoSeleccionado.nombre}${talleStr}`,
          talle: talle === 'Único' ? null : talle,
          cantidad,
          monto_total: montoTotal,
          monto_senado: montoSenado,
          metodo_seña: metodoSeña,
          fecha,
          estado: 'pendiente'
        })

        // 2. Descontar stock
        await editarProducto(productoSeleccionado.id, { stock: nuevoStock })

        alert(`¡Seña registrada con éxito!\nSe apartó ${cantidad} unidad(es) de "${productoSeleccionado.nombre}" para ${clienta.nombre}. Seña de ${formatearPeso(montoSenado)} ingresada a caja.`)
      } else if (metodo === 'fiar') {
        if (!clientaSeleccionadaId) {
          setError('Por favor, seleccioná una clienta.')
          setGuardando(false)
          return
        }
        const clienta = clientas.find(c => c.id === clientaSeleccionadaId)
        if (!clienta) throw new Error('Clienta no encontrada')

        const talleStr = talle && talle !== 'Único' ? ` (${talle})` : ''
        const notaFinal = esCuotas ? `[Cuotas: ${cuotas} | Pagadas: 0] Fiar desde Stock` : 'Fiar desde Stock'

        // 1. Agregar venta fiada (deuda)
        await agregarVenta({
          clienta_id: clientaSeleccionadaId,
          descripcion: `${productoSeleccionado.nombre}${talleStr} (x${cantidad})`,
          monto: montoTotal,
          fecha,
          nota: notaFinal,
        })

        // 2. Descontar Stock
        await editarProducto(productoSeleccionado.id, { stock: nuevoStock })

        alert(`¡Deuda asignada con éxito!\nSe fiaron ${cantidad} unidad(es) de "${productoSeleccionado.nombre}" a ${clienta.nombre} por un total de ${formatearPeso(montoTotal)}.`)
      } else {
        // Venta Mostrador (Efectivo o Transferencia)
        // 1. Agregar venta mostrador (caja diaria)
        await agregarVentaMostrador({
          producto_id: productoSeleccionado.id,
          descripcion: productoSeleccionado.nombre,
          talle: talle === 'Único' ? null : talle,
          cantidad,
          monto: montoTotal,
          metodo,
          fecha,
        })

        // 2. Descontar Stock
        await editarProducto(productoSeleccionado.id, { stock: nuevoStock })

        alert(`¡Venta registrada con éxito!\nSe vendieron ${cantidad} unidad(es) de "${productoSeleccionado.nombre}" por un total de ${formatearPeso(montoTotal)} mediante ${metodo === 'efectivo' ? 'Efectivo' : 'Transferencia'}.`)
      }

      onCerrar()
    } catch (err: any) {
      console.error(err)
      setError('Error al registrar la operación.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 max-h-[90vh] overflow-y-auto animate-[slideIn_0.2s_ease-out]"
        style={{
          background: '#161616',
          border: '1px solid rgba(229, 211, 179, 0.18)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-100 font-serif-elegant">
              Registrar Venta
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Descuenta stock e ingresa la operación
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-xs p-2 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}
          >
            ✕
          </button>
        </div>

        {/* Selector de Producto o Ficha del Producto Seleccionado */}
        {!productoSeleccionado ? (
          <div className="relative mb-4">
            <label className="block text-[10px] uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
              Seleccionar Producto *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40">🔍</span>
              <input
                type="text"
                placeholder="Escribí para buscar prenda por nombre, código o categoría..."
                value={busquedaProducto}
                onChange={e => {
                  setBusquedaProducto(e.target.value)
                  setDropdownProdOpen(true)
                }}
                onFocus={() => setDropdownProdOpen(true)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
              />
            </div>
            {dropdownProdOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownProdOpen(false)} />
                <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#161616]/95 backdrop-blur-md shadow-2xl z-50 py-1">
                  {productosFiltrados.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-neutral-500 text-center">
                      No se encontraron productos
                    </div>
                  ) : (
                    productosFiltrados.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProductoSeleccionado(p)
                          setBusquedaProducto(p.nombre)
                          setDropdownProdOpen(false)
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-[#E5D3B3]/10 hover:text-[#E5D3B3] flex items-center justify-between gap-4 border-b border-white/5 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-200 truncate">{p.nombre}</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                            <span>{p.categoria || 'Sin categoría'}</span>
                            <span>•</span>
                            <span>Talle: {p.talle || 'Único'}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[#E5D3B3]">{formatearPeso(p.precio)}</p>
                          <p className={`text-[10px] ${p.stock === 0 ? 'text-red-400 font-bold' : 'text-neutral-400'}`}>
                            Stock: {p.stock}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div
            className="rounded-2xl p-4 mb-4 flex items-center justify-between animate-fade-in"
            style={{
              background: 'rgba(229, 211, 179, 0.03)',
              border: '1px solid rgba(229, 211, 179, 0.1)',
            }}
          >
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-neutral-100 truncate">{productoSeleccionado.nombre}</p>
              <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>Precio: {formatearPeso(productoSeleccionado.precio)}</span>
                <span>•</span>
                <span>Stock: {productoSeleccionado.stock} uds</span>
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {!producto && (
                <button
                  type="button"
                  onClick={() => {
                    setProductoSeleccionado(null)
                    setBusquedaProducto('')
                  }}
                  className="text-[10px] px-2.5 py-1 rounded-lg transition-colors border border-white/10 hover:bg-white/5"
                  style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)' }}
                >
                  Cambiar
                </button>
              )}
              <span className="text-2xl">👗</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Método de Cobro / Destino */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-2 text-neutral-400 font-semibold">
              Destino / Método de Pago *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleMetodoClick('efectivo')}
                className="py-2 rounded-xl text-xs font-semibold transition-all"
                style={
                  metodo === 'efectivo'
                    ? { background: 'rgba(229, 211, 179, 0.15)', color: '#E5D3B3', border: '1px solid rgba(229, 211, 179, 0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }
                }
              >
                💵 Efectivo
              </button>
              <button
                type="button"
                onClick={() => handleMetodoClick('transferencia')}
                className="py-2 rounded-xl text-xs font-semibold transition-all"
                style={
                  metodo === 'transferencia'
                    ? { background: 'rgba(229, 211, 179, 0.15)', color: '#E5D3B3', border: '1px solid rgba(229, 211, 179, 0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }
                }
              >
                📱 Transf.
              </button>
              <button
                type="button"
                onClick={() => handleMetodoClick('fiar')}
                className="py-2 rounded-xl text-xs font-semibold transition-all"
                style={
                  metodo === 'fiar'
                    ? { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }
                }
              >
                👤 Fiar
              </button>
              <button
                type="button"
                onClick={() => handleMetodoClick('apartar')}
                className="py-2 rounded-xl text-xs font-semibold transition-all"
                style={
                  metodo === 'apartar'
                    ? { background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }
                }
              >
                📌 Señar
              </button>
            </div>
          </div>

          {/* Formulario Fiar (Si se selecciona Fiar) */}
          {metodo === 'fiar' && (
            <div className="space-y-3.5 p-3.5 rounded-2xl bg-neutral-900/40 border border-[#E5D3B3]/10 animate-fade-in">
              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                  Buscar y Seleccionar Clienta *
                </label>
                {clientaSeleccionadaId ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-200">
                        {clientas.find(c => c.id === clientaSeleccionadaId)?.nombre || 'Clienta seleccionada'}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {clientas.find(c => c.id === clientaSeleccionadaId)?.telefono || 'Sin teléfono'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setClientaSeleccionadaId('')
                        setBusqueda('')
                      }}
                      className="text-[10px] px-2 py-1 rounded-lg transition-colors border border-white/10 hover:bg-white/5"
                      style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Escribí para buscar clienta por nombre o teléfono..."
                      value={busqueda}
                      onChange={e => {
                        setBusqueda(e.target.value)
                        setDropdownClientOpen(true)
                      }}
                      onFocus={() => setDropdownClientOpen(true)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                    />
                    {dropdownClientOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setDropdownClientOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#161616]/95 backdrop-blur-md shadow-2xl z-50 py-1">
                          {clientasFiltradas.length === 0 ? (
                            <div className="px-4 py-2.5 text-xs text-neutral-500 text-center">
                              No se encontraron clientas
                            </div>
                          ) : (
                            clientasFiltradas.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setClientaSeleccionadaId(c.id)
                                  setDropdownClientOpen(false)
                                }}
                                className="w-full text-left px-4 py-2 text-xs transition-colors hover:bg-[#E5D3B3]/10 hover:text-[#E5D3B3] flex items-center justify-between border-b border-white/5 last:border-b-0"
                              >
                                <span className="font-medium">{c.nombre}</span>
                                <span className="text-[10px] text-neutral-400">{c.telefono || ''}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ¿Paga en cuotas? */}
              <div 
                className="flex items-center justify-between gap-4 p-2.5 rounded-xl bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div 
                  onClick={() => setEsCuotas(!esCuotas)}
                  className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-semibold text-neutral-300"
                >
                  <div 
                    className="w-4.5 h-4.5 rounded-lg flex items-center justify-center transition-all border"
                    style={{
                      background: esCuotas ? '#E5D3B3' : 'transparent',
                      borderColor: esCuotas ? '#E5D3B3' : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    {esCuotas && (
                      <svg className="w-3 h-3 text-[#0a0a0a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span>¿Paga en cuotas?</span>
                </div>
                
                {esCuotas && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDropdownCuotasOpen(!dropdownCuotasOpen)}
                      className="px-3 py-1.5 rounded-xl text-xs outline-none bg-neutral-950 text-neutral-200 border border-white/10 flex items-center justify-between gap-2 min-w-[100px]"
                    >
                      <span>{cuotas} cuotas</span>
                      <span className="text-[10px] opacity-60">▼</span>
                    </button>
                    {dropdownCuotasOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setDropdownCuotasOpen(false)} />
                        <div className="absolute right-0 mt-1.5 w-32 rounded-xl border border-white/10 bg-[#161616]/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden py-1">
                          {[2, 3, 4, 6, 12].map(num => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                setCuotas(num)
                                setDropdownCuotasOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[#E5D3B3]/10 hover:text-[#E5D3B3] ${cuotas === num ? 'text-[#E5D3B3] font-semibold bg-[#E5D3B3]/5' : 'text-neutral-300'}`}
                            >
                              {num} cuotas
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {esCuotas && productoSeleccionado && (productoSeleccionado.precio * cantidad) > 0 && (
                <div 
                  className="text-right text-[10px] text-neutral-400 font-medium p-2 rounded-xl animate-fade-in"
                  style={{ background: 'rgba(229,211,179,0.05)', border: '1px solid rgba(229,211,179,0.15)' }}
                >
                  Se registrarán <span className="font-bold text-[#E5D3B3]">{cuotas} cuotas</span> de <span className="font-bold text-[#E5D3B3]">{formatearPeso((productoSeleccionado.precio * cantidad) / cuotas)}</span>
                </div>
              )}
            </div>
          )}

          {/* Formulario Seña / Apartar */}
          {metodo === 'apartar' && (
            <div className="space-y-3.5 p-3.5 rounded-2xl bg-neutral-900/40 border border-emerald-500/10 animate-fade-in">
              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                  Buscar y Seleccionar Clienta *
                </label>
                {clientaSeleccionadaId ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-200">
                        {clientas.find(c => c.id === clientaSeleccionadaId)?.nombre || 'Clienta seleccionada'}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {clientas.find(c => c.id === clientaSeleccionadaId)?.telefono || 'Sin teléfono'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setClientaSeleccionadaId('')
                        setBusqueda('')
                      }}
                      className="text-[10px] px-2 py-1 rounded-lg transition-colors border border-white/10 hover:bg-white/5"
                      style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Escribí para buscar clienta por nombre o teléfono..."
                      value={busqueda}
                      onChange={e => {
                        setBusqueda(e.target.value)
                        setDropdownClientOpen(true)
                      }}
                      onFocus={() => setDropdownClientOpen(true)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                    />
                    {dropdownClientOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setDropdownClientOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#161616]/95 backdrop-blur-md shadow-2xl z-50 py-1">
                          {clientasFiltradas.length === 0 ? (
                            <div className="px-4 py-2.5 text-xs text-neutral-500 text-center">
                              No se encontraron clientas
                            </div>
                          ) : (
                            clientasFiltradas.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setClientaSeleccionadaId(c.id)
                                  setDropdownClientOpen(false)
                                }}
                                className="w-full text-left px-4 py-2 text-xs transition-colors hover:bg-[#E5D3B3]/10 hover:text-[#E5D3B3] flex items-center justify-between border-b border-white/5 last:border-b-0"
                              >
                                <span className="font-medium">{c.nombre}</span>
                                <span className="text-[10px] text-neutral-400">{c.telefono || ''}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Fila: Monto Seña y Medio de Pago Seña */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                    ¿Cuánto Deja de Seña? *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={productoSeleccionado ? productoSeleccionado.precio * cantidad : undefined}
                    value={montoSenado || ''}
                    onChange={e => setMontoSenado(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Monto seña"
                    required
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                    Medio de Seña *
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setMetodoSeña('efectivo')}
                      className="flex-1 py-2 rounded-lg text-[10px] font-bold"
                      style={
                        metodoSeña === 'efectivo'
                          ? { background: 'rgba(229, 211, 179, 0.15)', color: '#E5D3B3', border: '1px solid rgba(229, 211, 179, 0.3)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }
                      }
                    >
                      💵 Efec.
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoSeña('transferencia')}
                      className="flex-1 py-2 rounded-lg text-[10px] font-bold"
                      style={
                        metodoSeña === 'transferencia'
                          ? { background: 'rgba(229, 211, 179, 0.15)', color: '#E5D3B3', border: '1px solid rgba(229, 211, 179, 0.3)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }
                      }
                    >
                      📱 Transf.
                    </button>
                  </div>
                </div>
              </div>

              {productoSeleccionado && (productoSeleccionado.precio * cantidad - montoSenado) > 0 && (
                <div className="text-right text-[10px] text-neutral-400 font-medium p-2 rounded-xl" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)' }}>
                  Saldo restante a pagar: <span className="font-bold text-emerald-400">{formatearPeso((productoSeleccionado.precio * cantidad) - montoSenado)}</span>
                </div>
              )}
            </div>
          )}

          {/* Fila: Talle y Cantidad */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                Talle
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tallesDisponibles.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTalle(t)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all select-none"
                    style={
                      talle === t
                        ? { background: 'rgba(229, 211, 179, 0.15)', color: '#E5D3B3', borderColor: 'rgba(229, 211, 179, 0.35)' }
                        : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.07)' }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
                Cantidad
              </label>
              <input
                type="number"
                min="1"
                max={productoSeleccionado?.stock !== null ? productoSeleccionado?.stock : undefined}
                value={cantidad}
                onChange={e => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
              />
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5 text-neutral-400 font-semibold">
              Fecha de Venta
            </label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5', colorScheme: 'dark' }}
            />
          </div>

          {/* Total */}
          <div className="pt-3.5 border-t border-neutral-900 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">Total a pagar:</span>
            <span 
              className="text-lg font-bold"
              style={{ color: metodo === 'fiar' ? '#f87171' : '#E5D3B3' }}
            >
              {formatearPeso((productoSeleccionado?.precio || 0) * cantidad)}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Botones */}
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
              disabled={guardando || !productoSeleccionado}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={
                metodo === 'fiar'
                  ? { background: 'linear-gradient(135deg, #f87171, #ef4444)', color: '#fff' }
                  : { background: 'linear-gradient(135deg, #E5D3B3, #C9B497)', color: '#0a0a0a' }
              }
            >
              {guardando ? 'Guardando...' : metodo === 'fiar' ? 'Asignar Deuda' : 'Confirmar Venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
