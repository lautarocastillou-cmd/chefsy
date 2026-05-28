'use client'

// ─────────────────────────────────────────────────────
// modules/malu/componentes/DetalleClienta.tsx
// Vista de cuenta corriente de una clienta:
// historial narrativo con saldo acumulado + WhatsApp.
// ─────────────────────────────────────────────────────

import { useState } from 'react'
import { usarMalu, obtenerFechaNegocioMalu } from '../contexto'
import ModalNuevaVenta from './ModalNuevaVenta'
import ModalNuevoPago from './ModalNuevoPago'

function formatearPeso(monto: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

function formatearFechaNarrativa(fechaStr: string): string {
  const [anio, mes, dia] = fechaStr.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const mesIndex = parseInt(mes, 10) - 1
  const mesAbreviado = meses[mesIndex] || mes
  return `${parseInt(dia, 10)}/${mesAbreviado}`
}

function formatearFechaSimple(fechaStr: string): string {
  const [_, mes, dia] = fechaStr.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const mesIdx = parseInt(mes, 10) - 1
  return `${parseInt(dia, 10)} de ${meses[mesIdx] || mes}`
}

function obtenerEnlaceWhatsapp(nombre: string, telefono: string, saldo: number) {
  let limpio = telefono.replace(/\D/g, '')
  // Si no empieza con 54, asumimos que es de Argentina y agregamos 549 (código internacional para celulares)
  if (!limpio.startsWith('54')) {
    if (limpio.startsWith('15')) {
      limpio = limpio.substring(2)
    }
    limpio = '549' + limpio
  }
  const mensaje = encodeURIComponent(`¡Hola ${nombre}! Te escribo de Malú Clothing. Queríamos recordarte que tenés un saldo pendiente de ${formatearPeso(saldo)}. ¡Muchas gracias! 💕`)
  return `https://wa.me/${limpio}?text=${mensaje}`
}

export function parsearCuotas(nota: string | null | undefined) {
  if (!nota) return null
  const match = nota.match(/\[Cuotas:\s*(\d+)\s*\|\s*Pagadas:\s*(\d+)\]/)
  if (match) {
    const total = parseInt(match[1], 10)
    const pagadas = parseInt(match[2], 10)
    const limpia = nota.replace(/\[Cuotas:\s*\d+\s*\|\s*Pagadas:\s*\d+\]/, '').trim()
    return { total, pagadas, limpia }
  }
  return null
}

interface Props {
  clientaId: string
  onVolver: () => void
}

export default function DetalleClienta({ clientaId, onVolver }: Props) {
  const { obtenerResumen, borrarVenta, borrarPago, agregarPago, editarVenta, editarClienta } = usarMalu()
  const [modalVenta, setModalVenta] = useState(false)
  const [modalPago, setModalPago] = useState(false)
  const [tab, setTab] = useState<'todo' | 'ventas' | 'pagos'>('todo')
  const [procesandoCuotaId, setProcesandoCuotaId] = useState<string | null>(null)

  // Estados para edición de perfil
  const [modalEditar, setModalEditar] = useState(false)
  const [editNombre, setEditNombre] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editNotas, setEditNotas] = useState('')
  const [editFechaNacimiento, setEditFechaNacimiento] = useState('')
  const [editTalleGeneral, setEditTalleGeneral] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [errorEdit, setErrorEdit] = useState('')

  const handleGuardarEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editNombre.trim()) { setErrorEdit('El nombre es obligatorio.'); return }
    setGuardandoEdit(true)
    try {
      await editarClienta(clientaId, {
        nombre: editNombre.trim(),
        telefono: editTelefono.trim() || null,
        notas: editNotas.trim() || null,
        fecha_nacimiento: editFechaNacimiento || null,
        talle_general: editTalleGeneral.trim() || null,
      })
      setModalEditar(false)
    } catch {
      setErrorEdit('Error al actualizar datos. Intentá de nuevo.')
    } finally {
      setGuardandoEdit(false)
    }
  }

  const resumen = obtenerResumen(clientaId)
  if (!resumen) return null

  const { clienta, ventas, pagos, totalVentas, totalPagos, saldo } = resumen

  const handleBorrarVenta = async (id: string) => {
    if (!window.confirm('¿Eliminar esta venta? Esta acción no se puede deshacer.')) return
    await borrarVenta(id)
  }

  const handleBorrarPago = async (id: string) => {
    if (!window.confirm('¿Eliminar este pago? Esta acción no se puede deshacer.')) return
    await borrarPago(id)
  }

  const handlePagarCuota = async (venta: any) => {
    const infoCuotas = parsearCuotas(venta.nota)
    if (!infoCuotas) return

    const { total, pagadas, limpia } = infoCuotas
    if (pagadas >= total) return

    const metodoPago = window.prompt(
      `Cobrar cuota de "${venta.descripcion}".\nMonto de la cuota: ${formatearPeso(venta.monto / total)}\n\nEscribí el método de pago:\n1 - Efectivo\n2 - Transferencia\n3 - Otro`,
      "1"
    )

    if (metodoPago === null) return // Cancelado

    let metodo: 'efectivo' | 'transferencia' | 'otro' = 'efectivo'
    if (metodoPago === '2') metodo = 'transferencia'
    if (metodoPago === '3') metodo = 'otro'

    setProcesandoCuotaId(venta.id)
    try {
      const montoCuota = parseFloat((venta.monto / total).toFixed(2))
      const nuevaPagadas = pagadas + 1
      const nuevaNota = `[Cuotas: ${total} | Pagadas: ${nuevaPagadas}] ${limpia}`.trim()

      // 1. Agregar el pago
      await agregarPago({
        clienta_id: clientaId,
        monto: montoCuota,
        metodo,
        fecha: obtenerFechaNegocioMalu(),
        nota: `Cobro cuota ${nuevaPagadas}/${total} de: ${venta.descripcion}`,
      })

      // 2. Actualizar la nota de la venta
      await editarVenta(venta.id, { nota: nuevaNota })
      
      alert(`¡Cuota ${nuevaPagadas}/${total} cobrada con éxito para Abril!`)
    } catch (err) {
      console.error(err)
      alert('Error al procesar el pago de la cuota.')
    } finally {
      setProcesandoCuotaId(null)
    }
  }

  // 1. Combinar movimientos y ordenarlos cronológicamente ASCENDENTE (del más viejo al más nuevo)
  // para poder computar el saldo acumulado en orden correcto.
  const movimientosCronologicos = [
    ...ventas.map(v => ({ ...v, tipo: 'venta' as const })),
    ...pagos.map(p => ({ ...p, tipo: 'pago' as const })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha))

  // 2. Calcular el saldo acumulado en cada paso
  let running = 0
  const movimientosConSaldo = movimientosCronologicos.map(item => {
    if (item.tipo === 'venta') {
      running += item.monto
    } else {
      running -= item.monto
    }
    return { ...item, saldoAcumulado: running }
  })

  // 3. Filtrar según la pestaña activa
  const filtrados = tab === 'todo'
    ? movimientosConSaldo
    : movimientosConSaldo.filter(m => m.tipo === (tab === 'ventas' ? 'venta' : 'pago'))

  return (
    <>
      <div className="space-y-5">
        {/* Header con volver */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onVolver}
              className="px-3 py-1.5 rounded-xl text-xs transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.color = '#f5f5f5'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              }}
            >
              ← Volver
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold truncate font-serif-elegant" style={{ color: '#f5f5f5' }}>
                  {clienta.nombre}
                </h2>
                <button
                  onClick={() => {
                    setEditNombre(clienta.nombre)
                    setEditTelefono(clienta.telefono || '')
                    setEditFechaNacimiento(clienta.fecha_nacimiento || '')
                    setEditTalleGeneral(clienta.talle_general || '')
                    setEditNotas(clienta.notas || '')
                    setModalEditar(true)
                    setErrorEdit('')
                  }}
                  className="px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all border border-neutral-800 bg-neutral-900/60 animate-pulse hover:opacity-90"
                  style={{ color: '#E5D3B3' }}
                  title="Editar datos de clienta"
                >
                  ✏️ Editar
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {clienta.telefono && <span>📞 {clienta.telefono}</span>}
                {clienta.fecha_nacimiento && (
                  <span>🎂 Nacimiento: {formatearFechaSimple(clienta.fecha_nacimiento)}</span>
                )}
                {clienta.talle_general && (
                  <span>📏 Talle: {clienta.talle_general}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tarjeta de saldo y WhatsApp */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: saldo > 0
              ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)'
              : 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 100%)',
            border: `1px solid ${saldo > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'}`,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-1 text-neutral-400">
                  {saldo > 0 ? 'Saldo de Cuenta' : 'Al día'}
                </p>
                <p
                  className="text-4xl font-bold"
                  style={{ color: saldo > 0 ? '#ef4444' : '#22c55e' }}
                >
                  {formatearPeso(Math.abs(saldo))}
                </p>
              </div>

              {clienta.telefono && saldo > 0 && (
                <a
                  href={obtenerEnlaceWhatsapp(clienta.nombre, clienta.telefono, saldo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-full hover:scale-105 active:scale-95 transition-all text-white flex items-center justify-center shrink-0"
                  style={{
                    background: 'rgba(37,211,102,0.15)',
                    border: '1px solid rgba(37,211,102,0.3)',
                  }}
                  title="Enviar WhatsApp con saldo"
                >
                  <svg className="w-5 h-5 fill-emerald-400" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.102-2.884-6.964-1.86-1.862-4.33-2.883-6.958-2.884-5.442 0-9.863 4.42-9.866 9.865-.001 1.777.472 3.511 1.371 5.042l-.997 3.64 3.738-.981zM17.487 14.39c-.3-.15-1.782-.88-2.062-.98-.28-.1-.484-.15-.685.15-.2.3-.78.98-.957 1.18-.18.2-.35.22-.65.07-1.125-.565-1.874-.954-2.614-2.22-.195-.333-.195-.54.005-.74.18-.18.4-.47.6-.7.2-.23.27-.38.4-.65.13-.27.07-.5-.03-.7-.1-.2-.85-2.05-1.166-2.81-.31-.745-.62-.647-.85-.647-.22 0-.47-.02-.72-.02-.25 0-.65.09-.99.47-.34.38-1.3 1.27-1.3 3.1 0 1.83 1.33 3.6 1.51 3.85.18.25 2.62 4.005 6.35 5.62.885.385 1.58.615 2.12.785.89.28 1.7.24 2.34.145.715-.105 2.185-.89 2.49-1.75.305-.86.305-1.6.215-1.75-.09-.15-.35-.25-.65-.4z"/>
                  </svg>
                </a>
              )}
            </div>
            <div className="text-right text-[11px] space-y-0.5 text-neutral-400">
              <p>Total Llevado: <span className="font-semibold text-neutral-300">{formatearPeso(totalVentas)}</span></p>
              <p>Total Pagado: <span className="font-semibold text-neutral-300 text-emerald-400">{formatearPeso(totalPagos)}</span></p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setModalVenta(true)}
            className="py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171',
            }}
          >
            + Registrar Compra
          </button>
          <button
            onClick={() => setModalPago(true)}
            className="py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.2)',
              color: '#4ade80',
            }}
          >
            + Registrar Pago
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            { key: 'todo', label: `Historial (${movimientosConSaldo.length})` },
            { key: 'ventas', label: `Compras (${ventas.length})` },
            { key: 'pagos', label: `Pagos (${pagos.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all"
              style={
                tab === t.key
                  ? { background: 'rgba(229,211,179,0.15)', color: '#E5D3B3', border: '1px solid rgba(229,211,179,0.2)' }
                  : { color: 'rgba(255,255,255,0.35)' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Historial Narrativo */}
        {filtrados.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <p className="text-2xl mb-2">📋</p>
            <p className="text-xs">Sin movimientos aún en esta vista</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtrados.map(item => (
              <div
                key={item.id}
                className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 group"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap text-xs text-neutral-300">
                    <span className="font-semibold font-mono text-[#E5D3B3]">
                      {formatearFechaNarrativa(item.fecha)}:
                    </span>
                    
                    {item.tipo === 'venta' ? (
                      <span className="leading-relaxed">
                        Llevó <span className="font-semibold text-neutral-100">&quot;{(item as any).descripcion}&quot;</span> — Debía <span className="text-neutral-100 font-bold">{formatearPeso(item.saldoAcumulado)}</span>
                      </span>
                    ) : (
                      <span className="leading-relaxed">
                        Entregó <span className="font-semibold text-neutral-100">{('metodo' in item) ? (item as any).metodo : 'efectivo'}</span> — Pagó <span className="text-emerald-400 font-bold">{formatearPeso(item.monto)}</span> <span className="text-neutral-400 font-medium">(Saldo: {formatearPeso(item.saldoAcumulado)})</span>
                      </span>
                    )}
                  </div>

                  {/* Notas y Cuotas si corresponden */}
                  {item.tipo === 'venta' && (() => {
                    const infoCuotas = parsearCuotas((item as any).nota)
                    return (
                      <>
                        {infoCuotas ? (
                          <div className="mt-2 pl-4 border-l border-neutral-800">
                            {infoCuotas.limpia && (
                              <p className="text-[11px] text-neutral-400 italic">
                                &quot;{infoCuotas.limpia}&quot;
                              </p>
                            )}
                            <p className="text-[10px] mt-1 font-semibold text-amber-500 flex flex-wrap items-center gap-1.5">
                              <span>📅 {infoCuotas.pagadas} de {infoCuotas.total} cuotas pagadas</span>
                              {infoCuotas.pagadas < infoCuotas.total && (
                                <span className="text-[9px] text-neutral-500">({infoCuotas.total - infoCuotas.pagadas} pendientes)</span>
                              )}
                            </p>
                            {infoCuotas.pagadas < infoCuotas.total && (
                              <button
                                onClick={() => handlePagarCuota(item)}
                                disabled={procesandoCuotaId === item.id}
                                className="mt-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 active:scale-[0.97] transition-all disabled:opacity-50"
                              >
                                {procesandoCuotaId === item.id ? 'Cobrando...' : '💵 Cobrar Cuota'}
                              </button>
                            )}
                          </div>
                        ) : (
                          (item as any).nota && (
                            <p className="text-[11px] mt-1 text-neutral-400 italic pl-4 border-l border-neutral-800">
                              &quot;{(item as any).nota}&quot;
                            </p>
                          )
                        )}
                      </>
                    )
                  })()}

                  {item.tipo === 'pago' && (item as any).nota && (
                    <p className="text-[11px] mt-1 text-neutral-400 italic pl-4 border-l border-neutral-800">
                      &quot;{(item as any).nota}&quot;
                    </p>
                  )}
                </div>

                {/* Botón borrar */}
                <button
                  onClick={() => item.tipo === 'venta' ? handleBorrarVenta(item.id) : handleBorrarPago(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-xs"
                  style={{ color: 'rgba(239,68,68,0.6)', background: 'rgba(239,68,68,0.06)' }}
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {clienta.notas && (
          <div
            className="rounded-xl px-4 py-3 text-xs"
            style={{
              background: 'rgba(229, 211, 179, 0.03)',
              border: '1px solid rgba(229, 211, 179, 0.12)',
              color: 'rgba(229, 211, 179, 0.7)',
            }}
          >
            📌 {clienta.notas}
          </div>
        )}
      </div>

      {modalVenta && (
        <ModalNuevaVenta clientaId={clientaId} onCerrar={() => setModalVenta(false)} />
      )}
      {modalPago && (
        <ModalNuevoPago clientaId={clientaId} onCerrar={() => setModalPago(false)} />
      )}

      {modalEditar && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModalEditar(false) }}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 animate-[slideIn_0.2s_ease-out]"
            style={{ background: '#161616', border: '1px solid rgba(229, 211, 179, 0.18)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold font-serif-elegant" style={{ color: '#f5f5f5' }}>Editar Datos de Clienta</h3>
              <button onClick={() => setModalEditar(false)} className="text-xs p-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>✕</button>
            </div>
            <form onSubmit={handleGuardarEdit} className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Nombre *</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(229, 211, 179, 0.4)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Teléfono</label>
                <input
                  type="text"
                  value={editTelefono}
                  onChange={e => setEditTelefono(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(229, 211, 179, 0.4)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Fecha Nacimiento</label>
                  <input
                    type="date"
                    value={editFechaNacimiento}
                    onChange={e => setEditFechaNacimiento(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5', colorScheme: 'dark' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(229, 211, 179, 0.4)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Talle General</label>
                  <input
                    type="text"
                    placeholder="Ej: M, L, 38"
                    value={editTalleGeneral}
                    onChange={e => setEditTalleGeneral(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(229, 211, 179, 0.4)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Notas</label>
                <textarea
                  value={editNotas}
                  onChange={e => setEditNotas(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f5' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(229, 211, 179, 0.4)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>
              {errorEdit && <p className="text-xs text-red-400">{errorEdit}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModalEditar(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdit}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #E5D3B3, #C9B497)', color: '#0a0a0a' }}
                >
                  {guardandoEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
