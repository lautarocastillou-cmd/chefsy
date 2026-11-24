'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Pedido } from '@/tipos'
import {
  SugerenciaCliente,
  ResultadoSugerenciaCRM,
  formatearTelefonoArgentino,
  obtenerClaveCliente,
  prepararSugerenciasCRMDetallado,
} from '@/lib/motor-clientes'
import { formatearPrecio } from '@/lib/utils'
import {
  Users,
  Search,
  X,
  Sparkles,
  Phone,
  MapPin,
  ShoppingBag,
  UserPlus,
  ArrowRight,
  Check,
  ArrowLeft,
  StickyNote,
  Tag,
  Plus,
  Edit3,
  Clock,
  CreditCard,
  Utensils,
  AlertTriangle,
  CopyPlus,
  Loader2,
  Star,
  RotateCcw,
} from 'lucide-react'

const ETIQUETAS_PREDEFINIDAS: { label: string; tipo: 'alerta' | 'cocina' | 'vip' }[] = [
  { label: 'VIP', tipo: 'vip' },
  { label: 'Sin cebolla', tipo: 'cocina' },
  { label: 'Bien cocida', tipo: 'cocina' },
  { label: 'Sin aderezos', tipo: 'cocina' },
  { label: 'Mucho aderezo', tipo: 'cocina' },
  { label: 'Timbre roto', tipo: 'alerta' },
  { label: 'Llamar al llegar', tipo: 'alerta' },
  { label: 'Revisar transf.', tipo: 'alerta' },
  { label: 'Paga billete grande', tipo: 'vip' },
  { label: 'Suele cancelar', tipo: 'alerta' },
]

const ETIQUETAS_ALERTA = new Set([
  'timbre roto',
  'llamar al llegar',
  'revisar transf.',
  'suele cancelar',
])
const ETIQUETAS_COCINA = new Set([
  'sin cebolla',
  'bien cocida',
  'sin aderezos',
  'mucho aderezo',
])
const ETIQUETAS_VIP = new Set(['vip', 'paga billete grande'])

export function estiloEtiquetaCRM(etiqueta: string): string {
  const norm = etiqueta.toLowerCase().trim()
  if (ETIQUETAS_ALERTA.has(norm)) {
    return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60'
  }
  if (ETIQUETAS_COCINA.has(norm)) {
    return 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60'
  }
  if (ETIQUETAS_VIP.has(norm)) {
    return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60'
  }
  return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
}

function formatearMetodoPago(metodo?: string): string {
  switch (metodo) {
    case 'efectivo':
      return 'Efectivo'
    case 'transferencia':
      return 'Transferencia'
    case 'tarjeta':
      return 'Tarjeta'
    case 'mixto':
      return 'Mixto'
    default:
      return 'Sin definir'
  }
}

function obtenerInfoRecencia(ultimaFecha?: string): { texto: string; esRegreso: boolean } | null {
  if (!ultimaFecha) return null
  const fecha = new Date(ultimaFecha)
  if (Number.isNaN(fecha.getTime())) return null
  const diffMs = Date.now() - fecha.getTime()
  const dias = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  if (dias === 0) return { texto: 'Pidió hoy', esRegreso: false }
  if (dias === 1) return { texto: 'Pidió ayer', esRegreso: false }
  if (dias >= 21) return { texto: `Volvió tras ${dias} días`, esRegreso: true }
  return { texto: `Hace ${dias} días`, esRegreso: false }
}

function obtenerEstatusCliente(totalPedidos = 0): { label: string; clase: string; esVip?: boolean } {
  if (totalPedidos >= 8) {
    return {
      label: 'VIP',
      clase: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
      esVip: true,
    }
  }
  if (totalPedidos >= 3) {
    return {
      label: 'Habitual',
      clase: 'bg-chefsy-50 dark:bg-chefsy-950/50 text-chefsy-700 dark:text-chefsy-300 border-chefsy-200 dark:border-chefsy-800/60',
    }
  }
  if (totalPedidos === 2) {
    return {
      label: 'Recurrente',
      clase: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
    }
  }
  return {
    label: 'Nuevo',
    clase: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  }
}

interface PropsPanelCRMCliente {
  indiceClientes: SugerenciaCliente[]
  sugerenciasActivas: SugerenciaCliente[]
  sugerenciasDetalladas?: ResultadoSugerenciaCRM[]
  clienteEncontrado: Pedido | null
  clienteSeleccionadoCRM: SugerenciaCliente | null
  guardandoNotaCRM: boolean
  clienteInput: string
  telefonoInput: string
  motivoCoincidencia: string
  puedeMostrarSinCoincidencias: boolean
  pareceClienteNuevo?: boolean
  modoClienteNuevo: boolean
  indiceSugerenciaActiva: number
  onSeleccionarSugerencia: (sug: SugerenciaCliente) => void
  onAplicarDatosCRM: () => void
  onActivarModoClienteNuevo: () => void
  onDesactivarModoClienteNuevo?: () => void
  onLimpiarSeleccion: () => void
  onResetIndiceSugerencia: () => void
  onAplicarObservacion: (texto: string) => void
  onGuardarNotasCRM: (
    claveCliente: string,
    notaFija: string,
    etiquetas: string[],
    referencia?: { nombre?: string; telefono?: string }
  ) => Promise<boolean>
}

export default function PanelCRMCliente({
  indiceClientes,
  sugerenciasActivas,
  sugerenciasDetalladas,
  clienteEncontrado,
  clienteSeleccionadoCRM,
  guardandoNotaCRM,
  clienteInput,
  telefonoInput,
  motivoCoincidencia,
  puedeMostrarSinCoincidencias,
  pareceClienteNuevo = false,
  modoClienteNuevo,
  indiceSugerenciaActiva,
  onSeleccionarSugerencia,
  onAplicarDatosCRM,
  onActivarModoClienteNuevo,
  onDesactivarModoClienteNuevo,
  onLimpiarSeleccion,
  onResetIndiceSugerencia,
  onAplicarObservacion,
  onGuardarNotasCRM,
}: PropsPanelCRMCliente) {
  const [busquedaCrm, setBusquedaCrm] = useState('')
  const [editandoNotas, setEditandoNotas] = useState(false)
  const [notaDraft, setNotaDraft] = useState('')
  const [etiquetasDraft, setEtiquetasDraft] = useState<string[]>([])
  const [nuevaEtiquetaInput, setNuevaEtiquetaInput] = useState('')
  const [feedbackGuardado, setFeedbackGuardado] = useState(false)
  const [feedbackObsCopiada, setFeedbackObsCopiada] = useState<string | null>(null)

  // Sincronizar editor de notas cuando cambia el cliente seleccionado
  useEffect(() => {
    setEditandoNotas(false)
    setFeedbackGuardado(false)
    setNuevaEtiquetaInput('')
    if (clienteSeleccionadoCRM) {
      setNotaDraft(clienteSeleccionadoCRM.notaFija || '')
      setEtiquetasDraft(clienteSeleccionadoCRM.etiquetas || [])
    } else {
      setNotaDraft('')
      setEtiquetasDraft([])
    }
  }, [clienteSeleccionadoCRM])

  const clientesFrecuentes = useMemo(() => {
    if (!Array.isArray(indiceClientes) || indiceClientes.length === 0) return []
    return [...indiceClientes]
      .filter((c) => c.nombre && c.nombre.trim().length >= 2)
      .sort((a, b) => (b.totalPedidos || 0) - (a.totalPedidos || 0))
      .slice(0, 8)
  }, [indiceClientes])

  const resultadosCrm = useMemo<ResultadoSugerenciaCRM[]>(() => {
    const q = busquedaCrm.trim()
    if (q.length > 0) {
      const opciones = { umbralCalidad: 55, priorizarBarrio: false, limite: 6 }
      const digitos = q.replace(/\D/g, '')

      // En el buscador único (omni-search) evaluamos por campo por separado
      // para evitar falsos conflictos entre nombre, teléfono y dirección.
      const candidatosPorCampo: ResultadoSugerenciaCRM[][] = [
        prepararSugerenciasCRMDetallado(indiceClientes, { nombre: q }, opciones),
      ]
      if (digitos.length >= 4) {
        candidatosPorCampo.push(
          prepararSugerenciasCRMDetallado(indiceClientes, { telefono: q }, opciones)
        )
      }
      if (q.length >= 4) {
        candidatosPorCampo.push(
          prepararSugerenciasCRMDetallado(indiceClientes, { direccion: q }, opciones)
        )
      }

      const mejoresPorClave = new Map<string, ResultadoSugerenciaCRM>()
      for (const lista of candidatosPorCampo) {
        for (const item of lista) {
          const clave = item.cliente.claveCliente || obtenerClaveCliente(item.cliente)
          const previo = mejoresPorClave.get(clave)
          if (!previo || item.score > previo.score) {
            mejoresPorClave.set(clave, item)
          }
        }
      }

      return Array.from(mejoresPorClave.values())
        .sort(
          (a, b) =>
            b.score - a.score ||
            (b.cliente.totalPedidos || 0) - (a.cliente.totalPedidos || 0)
        )
        .slice(0, 6)
    }
    if (sugerenciasDetalladas !== undefined) {
      return sugerenciasDetalladas
    }
    return sugerenciasActivas.map((cliente) => ({
      cliente,
      score: 70,
      confianza: 'media' as const,
      motivo: motivoCoincidencia || 'Coincidencia de nombre',
    }))
  }, [busquedaCrm, indiceClientes, sugerenciasDetalladas, sugerenciasActivas, motivoCoincidencia])

  const hayBusquedaCrm = busquedaCrm.trim().length > 0
  const hayBusquedaFormulario = clienteInput.trim().length > 0 || telefonoInput.trim().length > 0
  const hayBusquedaActiva = hayBusquedaCrm || hayBusquedaFormulario
  const mostrarMiniPerfil = Boolean(clienteSeleccionadoCRM && !hayBusquedaCrm)

  const toggleEtiquetaDraft = (label: string) => {
    setEtiquetasDraft((prev) =>
      prev.some((t) => t.toLowerCase() === label.toLowerCase())
        ? prev.filter((t) => t.toLowerCase() !== label.toLowerCase())
        : [...prev, label].slice(0, 10)
    )
  }

  const agregarEtiquetaPersonalizada = () => {
    const limpia = nuevaEtiquetaInput.trim().slice(0, 28)
    if (!limpia) return
    if (!etiquetasDraft.some((t) => t.toLowerCase() === limpia.toLowerCase())) {
      setEtiquetasDraft((prev) => [...prev, limpia].slice(0, 10))
    }
    setNuevaEtiquetaInput('')
  }

  const handleGuardarNotas = async () => {
    if (!clienteSeleccionadoCRM) return
    const clave = clienteSeleccionadoCRM.claveCliente || obtenerClaveCliente(clienteSeleccionadoCRM)
    const ok = await onGuardarNotasCRM(clave, notaDraft, etiquetasDraft, {
      nombre: clienteSeleccionadoCRM.nombre,
      telefono: clienteSeleccionadoCRM.telefono,
    })
    if (ok) {
      setEditandoNotas(false)
      setFeedbackGuardado(true)
      setTimeout(() => setFeedbackGuardado(false), 2200)
    }
  }

  const handleCopiarObs = (texto: string, origen: string) => {
    onAplicarObservacion(texto)
    setFeedbackObsCopiada(origen)
    setTimeout(() => setFeedbackObsCopiada(null), 1600)
  }

  const renderTarjetaClienteLista = (
    sug: SugerenciaCliente,
    idx: number,
    esFrecuente = false,
    detalle?: Pick<ResultadoSugerenciaCRM, 'confianza' | 'motivo' | 'score'>
  ) => {
    const etiquetasVisibles = (sug.etiquetas || []).slice(0, 2)
    const tieneNota = Boolean(sug.notaFija?.trim())
    const estaActiva = !esFrecuente && !hayBusquedaCrm && idx === indiceSugerenciaActiva
    const esConfianzaAlta = !esFrecuente && detalle?.confianza === 'alta'

    return (
      <button
        key={`${esFrecuente ? 'freq' : 'res'}-${sug.nombre}-${sug.telefono}-${idx}`}
        type="button"
        onClick={() => {
          onSeleccionarSugerencia(sug)
          setBusquedaCrm('')
          onResetIndiceSugerencia()
        }}
        className={`w-full p-2.5 flex items-start gap-2.5 text-left transition-all group cursor-pointer rounded-2xl border ${
          estaActiva
            ? 'bg-chefsy-50 dark:bg-chefsy-950/30 border-chefsy-300 dark:border-chefsy-700 shadow-xs'
            : esConfianzaAlta
              ? 'bg-emerald-50/45 dark:bg-emerald-950/20 border-emerald-200/90 dark:border-emerald-800/70 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/35 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-[0_1px_2px_rgba(16,185,129,0.06)]'
              : 'bg-slate-50/60 dark:bg-slate-800/35 border-slate-100 dark:border-slate-800/80 hover:bg-chefsy-50/50 dark:hover:bg-slate-800 hover:border-chefsy-200 dark:hover:border-chefsy-800'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 transition-colors ${
            esFrecuente
              ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-chefsy group-hover:text-white'
              : esConfianzaAlta
                ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white'
                : 'bg-chefsy/10 dark:bg-chefsy/20 text-chefsy-700 dark:text-chefsy-300 group-hover:bg-chefsy group-hover:text-white'
          }`}
        >
          {sug.nombre.slice(0, 1).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-chefsy-700 dark:group-hover:text-chefsy-400 transition-colors">
              {sug.nombre}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {tieneNota && (
                <span
                  className="text-amber-500 dark:text-amber-400"
                  title={`Nota fija: ${sug.notaFija}`}
                >
                  <StickyNote size={11} />
                </span>
              )}
              {sug.totalPedidos && sug.totalPedidos > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 tabular-nums">
                  <ShoppingBag size={8} />
                  {sug.totalPedidos}
                </span>
              ) : null}
            </div>
          </div>

          {sug.telefono && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              <Phone size={9} className="shrink-0 opacity-70" />
              <span className="truncate">{formatearTelefonoArgentino(sug.telefono)}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            <MapPin size={9} className="shrink-0 opacity-70" />
            {sug.direccion ? (
              <span className="truncate">{sug.direccion}</span>
            ) : (
              <span className="italic opacity-75">Retiro en local</span>
            )}
          </div>

          {!esFrecuente && detalle?.motivo && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border leading-none ${
                  esConfianzaAlta
                    ? 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/90 dark:border-emerald-800/70'
                    : 'bg-slate-100 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                {esConfianzaAlta && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
                {detalle.motivo}
              </span>
            </div>
          )}

          {etiquetasVisibles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {etiquetasVisibles.map((tag) => (
                <span
                  key={tag}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border leading-none ${estiloEtiquetaCRM(tag)}`}
                >
                  {tag}
                </span>
              ))}
              {(sug.etiquetas?.length || 0) > 2 && (
                <span className="text-[9px] font-semibold text-slate-400 px-1">
                  +{(sug.etiquetas?.length || 0) - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    )
  }

  return (
    <aside
      data-lenis-prevent="true"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="hidden lg:flex lg:flex-col w-[305px] xl:w-[330px] shrink-0 max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-200"
    >
      {/* Header del Panel CRM */}
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-chefsy/10 dark:bg-chefsy/20 text-chefsy dark:text-chefsy-400 flex items-center justify-center shrink-0">
            <Users size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
              {mostrarMiniPerfil ? 'Perfil del Cliente' : 'Clientes CRM'}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
              {mostrarMiniPerfil ? 'Contexto, notas y preferencias' : 'Autocompletado rápido'}
            </p>
          </div>
        </div>

        {mostrarMiniPerfil ? (
          <button
            type="button"
            onClick={onLimpiarSeleccion}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
            title="Volver a la lista de clientes"
          >
            <ArrowLeft size={12} />
            Lista
          </button>
        ) : (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 tabular-nums shrink-0"
            title="Clientes en historial"
          >
            {hayBusquedaActiva ? resultadosCrm.length : indiceClientes.length}
          </span>
        )}
      </div>

      {/* Buscador Rápido CRM */}
      <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/30 shrink-0">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={busquedaCrm}
            onChange={(e) => setBusquedaCrm(e.target.value)}
            placeholder="Buscar nombre, tel o dirección..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-chefsy/40 focus:border-chefsy transition-all"
          />
          {busquedaCrm && (
            <button
              type="button"
              onClick={() => setBusquedaCrm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full cursor-pointer"
              aria-label="Limpiar búsqueda CRM"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Cuerpo Scrolleable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3.5 space-y-3">
        {mostrarMiniPerfil && clienteSeleccionadoCRM ? (
          /* ══════════════════════════════════════════════════════════════════
             VISTA MINI-PERFIL + NOTAS FIJAS & ETIQUETAS (Puntos 2 y 4)
             ══════════════════════════════════════════════════════════════════ */
          (() => {
            const estatus = obtenerEstatusCliente(clienteSeleccionadoCRM.totalPedidos || 0)
            const recencia = obtenerInfoRecencia(clienteSeleccionadoCRM.ultimaFecha)
            const etiquetasActuales = clienteSeleccionadoCRM.etiquetas || []
            const notaActual = clienteSeleccionadoCRM.notaFija?.trim() || ''

            return (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Tarjeta Identidad + Estatus + Recencia */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-50/90 to-white dark:from-slate-800/50 dark:to-slate-900 p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-chefsy text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {clienteSeleccionadoCRM.nombre.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                        {clienteSeleccionadoCRM.nombre}
                      </h4>
                      {clienteSeleccionadoCRM.telefono && (
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone size={10} className="shrink-0 text-chefsy-600 dark:text-chefsy-400" />
                          <span className="truncate">
                            {formatearTelefonoArgentino(clienteSeleccionadoCRM.telefono)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges de Estatus, Recencia y Cancelaciones */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${estatus.clase}`}
                    >
                      {estatus.esVip && <Star size={9} className="fill-current" />}
                      {estatus.label} · {clienteSeleccionadoCRM.totalPedidos || 0} ped.
                    </span>

                    {recencia && (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          recencia.esRegreso
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/70 dark:border-slate-700'
                        }`}
                      >
                        <Clock size={9} />
                        {recencia.texto}
                      </span>
                    )}

                    {(clienteSeleccionadoCRM.totalCancelados || 0) >= 2 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                        <AlertTriangle size={9} />
                        {clienteSeleccionadoCRM.totalCancelados} cancelados
                      </span>
                    )}
                  </div>
                </div>

                {/* Grid de Contexto Rápido (Ticket promedio, Pago habitual, Plato favorito) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Ticket prom.
                    </span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5 block tabular-nums">
                      {clienteSeleccionadoCRM.ticketPromedio
                        ? formatearPrecio(clienteSeleccionadoCRM.ticketPromedio)
                        : '—'}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <CreditCard size={10} /> Pago habitual
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 block truncate">
                      {formatearMetodoPago(
                        clienteSeleccionadoCRM.metodoPagoHabitual || clienteSeleccionadoCRM.metodoPago
                      )}
                    </span>
                  </div>

                  {clienteSeleccionadoCRM.platoFavorito && (
                    <div className="col-span-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-2.5 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-chefsy/10 dark:bg-chefsy/20 text-chefsy dark:text-chefsy-400 flex items-center justify-center shrink-0">
                        <Utensils size={12} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-none">
                          Plato más pedido
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block mt-0.5">
                          {clienteSeleccionadoCRM.platoFavorito}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Última observación usada */}
                {clienteSeleccionadoCRM.ultimaObservacion && (
                  <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/25 p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Última observación
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopiarObs(clienteSeleccionadoCRM.ultimaObservacion!, 'ultima')
                        }
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-chefsy-700 dark:text-chefsy-400 hover:underline cursor-pointer"
                      >
                        {feedbackObsCopiada === 'ultima' ? (
                          <>
                            <Check size={10} /> Aplicada
                          </>
                        ) : (
                          <>
                            <CopyPlus size={10} /> Usar en pedido
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug italic">
                      “{clienteSeleccionadoCRM.ultimaObservacion}”
                    </p>
                  </div>
                )}

                {/* ── Sección Notas Fijas y Etiquetas Permanentes (Punto 2) ── */}
                <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/15 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                      <StickyNote size={12} />
                      Notas fijas y etiquetas
                    </span>
                    {!editandoNotas && (
                      <button
                        type="button"
                        onClick={() => setEditandoNotas(true)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 px-2 py-0.5 rounded-lg bg-amber-100/80 dark:bg-amber-900/30 transition-colors cursor-pointer"
                      >
                        <Edit3 size={10} />
                        {notaActual || etiquetasActuales.length > 0 ? 'Editar' : 'Agregar'}
                      </button>
                    )}
                  </div>

                  {feedbackGuardado && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1.5 rounded-xl">
                      <Check size={12} />
                      Preferencias guardadas en CRM
                    </div>
                  )}

                  {!editandoNotas ? (
                    <>
                      {etiquetasActuales.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {etiquetasActuales.map((tag) => (
                            <span
                              key={tag}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${estiloEtiquetaCRM(tag)}`}
                            >
                              <Tag size={9} className="opacity-75" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {notaActual ? (
                        <div className="bg-white/90 dark:bg-slate-900/70 border border-amber-200/70 dark:border-amber-900/40 rounded-xl p-2.5 space-y-1.5">
                          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {notaActual}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleCopiarObs(notaActual, 'fija')}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-chefsy-700 dark:text-chefsy-400 hover:underline cursor-pointer"
                          >
                            {feedbackObsCopiada === 'fija' ? (
                              <>
                                <Check size={10} /> Copiada a observaciones
                              </>
                            ) : (
                              <>
                                <CopyPlus size={10} /> Copiar a observaciones
                              </>
                            )}
                          </button>
                        </div>
                      ) : etiquetasActuales.length === 0 ? (
                        <p className="text-[11px] text-amber-800/70 dark:text-amber-400/70 leading-snug">
                          Sin notas todavía. Guardá preferencias de cocina, timbre o alertas para próximos turnos.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    /* Editor Inline de Notas y Etiquetas */
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                          Etiquetas rápidas
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {ETIQUETAS_PREDEFINIDAS.map((item) => {
                            const activa = etiquetasDraft.some(
                              (t) => t.toLowerCase() === item.label.toLowerCase()
                            )
                            return (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => toggleEtiquetaDraft(item.label)}
                                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                  activa
                                    ? `${estiloEtiquetaCRM(item.label)} ring-1 ring-current`
                                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                              >
                                {activa ? '✓ ' : '+ '}
                                {item.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Etiqueta personalizada */}
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={nuevaEtiquetaInput}
                          onChange={(e) => setNuevaEtiquetaInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              agregarEtiquetaPersonalizada()
                            }
                          }}
                          placeholder="Etiqueta propia..."
                          maxLength={28}
                          className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-chefsy/40"
                        />
                        <button
                          type="button"
                          onClick={agregarEtiquetaPersonalizada}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer shrink-0"
                          title="Agregar etiqueta"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Etiquetas seleccionadas personalizadas que no están en las predefinidas */}
                      {etiquetasDraft.filter(
                        (t) => !ETIQUETAS_PREDEFINIDAS.some((p) => p.label.toLowerCase() === t.toLowerCase())
                      ).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {etiquetasDraft
                            .filter(
                              (t) =>
                                !ETIQUETAS_PREDEFINIDAS.some(
                                  (p) => p.label.toLowerCase() === t.toLowerCase()
                                )
                            )
                            .map((customTag) => (
                              <button
                                key={customTag}
                                type="button"
                                onClick={() => toggleEtiquetaDraft(customTag)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                                title="Quitar etiqueta"
                              >
                                {customTag} <X size={10} />
                              </button>
                            ))}
                        </div>
                      )}

                      {/* Nota fija libre */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          Nota fija permanente
                        </span>
                        <textarea
                          rows={3}
                          value={notaDraft}
                          onChange={(e) => setNotaDraft(e.target.value)}
                          placeholder="Ej: Portón negro al lado del kiosco. Timbre roto, llamar al llegar."
                          maxLength={500}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-chefsy/40 resize-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGuardarNotas}
                          disabled={guardandoNotaCRM}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-chefsy hover:bg-chefsy-700 disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          {guardandoNotaCRM ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          Guardar en CRM
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditandoNotas(false)
                            setNotaDraft(clienteSeleccionadoCRM.notaFija || '')
                            setEtiquetasDraft(clienteSeleccionadoCRM.etiquetas || [])
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })()
        ) : (
          /* ══════════════════════════════════════════════════════════════════
             VISTA LISTA (Coincidencia exacta, Resultados búsqueda, Frecuentes)
             ══════════════════════════════════════════════════════════════════ */
          <div className="space-y-2.5">
            {/* Coincidencia Exacta: Cliente Registrado */}
            {clienteEncontrado && !hayBusquedaCrm && !modoClienteNuevo && (
              <button
                type="button"
                onClick={onAplicarDatosCRM}
                className="w-full bg-gradient-to-br from-chefsy-50 via-emerald-50/70 to-white dark:from-chefsy-950/50 dark:via-emerald-950/30 dark:to-slate-900 hover:from-chefsy-100/80 dark:hover:from-chefsy-900/40 border border-chefsy-200 dark:border-chefsy-800/70 rounded-2xl p-3.5 flex flex-col items-start text-left transition-all shadow-sm active:scale-[0.98] cursor-pointer group animate-[slideIn_0.2s_ease-out]"
              >
                <div className="flex items-center justify-between w-full gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-chefsy-700 dark:text-chefsy-400">
                    <Sparkles className="w-3 h-3" /> Cliente registrado
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-chefsy text-white group-hover:bg-chefsy-700 transition-colors">
                    Aplicar
                  </span>
                </div>

                <div className="flex items-center gap-2.5 w-full">
                  <div className="w-9 h-9 rounded-xl bg-chefsy text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {clienteEncontrado.cliente.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block truncate">
                      {clienteEncontrado.cliente}
                    </span>
                    {clienteEncontrado.telefono && clienteEncontrado.telefono !== 'Sin especificar' && (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone size={10} className="shrink-0 text-chefsy-600 dark:text-chefsy-400" />
                        {formatearTelefonoArgentino(clienteEncontrado.telefono)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-chefsy-200/60 dark:border-chefsy-800/40 w-full flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <MapPin size={11} className="shrink-0 text-chefsy-600 dark:text-chefsy-400" />
                  <span className="truncate">
                    {clienteEncontrado.direccion ? clienteEncontrado.direccion : 'Retiro en local'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate w-full">
                  {motivoCoincidencia}
                </span>
              </button>
            )}

            {/* Lista de Resultados de Búsqueda */}
            {resultadosCrm.length > 0 && (hayBusquedaCrm || (!clienteEncontrado && !modoClienteNuevo)) && (
              <div className="space-y-1.5">
                <div className="px-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Coincidencias
                  </span>
                  <span className="text-[10px] font-semibold text-chefsy-600 dark:text-chefsy-400">
                    {resultadosCrm.length} {resultadosCrm.length === 1 ? 'encontrado' : 'encontrados'}
                  </span>
                </div>
                {resultadosCrm.map((item, idx) =>
                  renderTarjetaClienteLista(item.cliente, idx, false, item)
                )}
                {!hayBusquedaCrm && !modoClienteNuevo && (
                  <button
                    type="button"
                    onClick={onActivarModoClienteNuevo}
                    className="w-full mt-1.5 px-3 py-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 border border-dashed border-slate-200 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-800/70 rounded-xl transition-colors cursor-pointer"
                  >
                    <UserPlus size={12} className="shrink-0" />
                    Es cliente nuevo
                  </button>
                )}
              </div>
            )}

            {/* Confirmación Modo Cliente Nuevo Bloqueado */}
            {modoClienteNuevo && !hayBusquedaCrm && (
              <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/25 p-3.5 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 leading-snug">
                      Cargando como cliente nuevo
                    </p>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 leading-snug">
                      Autocompletado pausado para este pedido.
                    </p>
                  </div>
                </div>
                {onDesactivarModoClienteNuevo && (
                  <button
                    type="button"
                    onClick={onDesactivarModoClienteNuevo}
                    className="w-full px-3 py-1.5 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white/80 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    <RotateCcw size={11} className="shrink-0" />
                    Volver a buscar en CRM
                  </button>
                )}
              </div>
            )}

            {/* Estado Calmado: Parece Cliente Nuevo (Punto 4) */}
            {pareceClienteNuevo &&
              !hayBusquedaCrm &&
              !modoClienteNuevo &&
              !clienteEncontrado &&
              resultadosCrm.length === 0 && (
                <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 to-slate-50/80 dark:from-emerald-950/20 dark:to-slate-900/60 p-4 text-center space-y-2.5 animate-in fade-in duration-150">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Parece un cliente nuevo
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      No coincide con ningún cliente registrado. Podés seguir cargando sin problema.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onActivarModoClienteNuevo}
                    className="w-full px-3 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/90 dark:border-emerald-800/70 rounded-xl bg-white/80 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                  >
                    <Check size={13} className="shrink-0" />
                    Confirmar como cliente nuevo
                  </button>
                </div>
              )}

            {/* Estado Sin Coincidencias (búsqueda manual CRM o fallback) */}
            {((hayBusquedaCrm && resultadosCrm.length === 0) ||
              (!hayBusquedaCrm &&
                !modoClienteNuevo &&
                !pareceClienteNuevo &&
                !clienteEncontrado &&
                resultadosCrm.length === 0 &&
                puedeMostrarSinCoincidencias)) && (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/30 p-4 text-center space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <UserPlus size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Sin coincidencias
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                    No encontramos clientes registrados con esos datos.
                  </p>
                </div>
                {!modoClienteNuevo && !hayBusquedaCrm && (
                  <button
                    type="button"
                    onClick={onActivarModoClienteNuevo}
                    className="w-full px-3 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-chefsy-700 dark:text-chefsy-400 border border-chefsy-200 dark:border-chefsy-800/70 rounded-xl bg-chefsy-50 dark:bg-chefsy-950/30 hover:bg-chefsy-100 dark:hover:bg-chefsy-900/40 transition-colors cursor-pointer"
                  >
                    <ArrowRight size={13} className="shrink-0" />
                    Continuar como cliente nuevo
                  </button>
                )}
              </div>
            )}

            {/* Estado Inicial (sin búsqueda): Clientes Frecuentes */}
            {!hayBusquedaActiva &&
              !clienteEncontrado &&
              !modoClienteNuevo &&
              (clientesFrecuentes.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="px-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Clientes frecuentes
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Top {clientesFrecuentes.length}
                    </span>
                  </div>
                  {clientesFrecuentes.map((sug, idx) => renderTarjetaClienteLista(sug, idx, true))}
                </div>
              ) : (
                <div className="py-10 px-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Search size={18} />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Buscá un cliente por nombre o teléfono
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                    Al escribir en el pedido, las coincidencias aparecerán acá para autocompletar en un clic.
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Footer Sutil CRM */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
          {mostrarMiniPerfil
            ? 'Las notas y etiquetas se guardan para futuros turnos'
            : 'Hacé clic en un cliente para ver perfil y autocompletar'}
        </p>
      </div>
    </aside>
  )
}
