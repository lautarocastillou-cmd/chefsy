'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { formatearPrecio } from '@/lib/utils'
import {
  Star,
  Zap,
  Target,
  Archive,
  Search,
  ArrowUpDown,
  Filter,
  Info,
  ChevronRight,
  TrendingUp,
  Sparkles,
  HelpCircle,
  X,
  Utensils,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  SlidersHorizontal,
  Eye,
  Award,
  DollarSign,
  ShoppingBag,
  Percent,
  Coins,
  ShieldCheck,
  Pencil,
  Save,
  RefreshCw,
  PlusCircle,
  Bot,
  MessageSquare,
  ArrowRight
} from 'lucide-react'

export interface DiagnosticoDetallado {
  razon: string
  significado: string
  accionesChefsy: string[]
}

export interface RentabilidadReal {
  tieneCosto: boolean
  costoUnitario: number
  insumoPrincipal?: number
  packaging?: number
  notas?: string
  gananciaLimpiaUnitaria: number
  porcentajeInsumos: number
  porcentajeGananciaLimpia: number
  gananciaTotalMes: number
  estadoSalud: 'saludable' | 'moderado' | 'alerta'
  explicacionSalud: string
  descuentoSeguroPct: number
  ahorroPromoSegura: number
  updatedAt?: string
}

export interface PlatoBCG {
  id: string
  nombre: string
  categoria: string
  categoriaId: string
  imagenUrl?: string
  unidades: number
  participacionUnidadesPct: number
  porcentajeComandas: number
  precioPromedio: number
  facturacionTotal: number
  participacionFacturacionPct: number
  rankingFacturacion: number
  rankingUnidades: number
  cuadrante: 'estrella' | 'caballo' | 'rompecabezas' | 'lastre'
  diagnostico: string
  accionSugerida: string
  diagnosticoDetallado?: DiagnosticoDetallado
  rentabilidadReal?: RentabilidadReal | null
}

export interface CuadranteStats {
  count: number
  facturacionTotal: number
  porcentajeFacturacion: number
  unidadesTotal: number
  porcentajeUnidades: number
  precioPromedio: number
  accionPrincipal: string
}

export interface ResumenBCG {
  totalPlatosAnalizados: number
  totalUnidadesVendidas?: number
  totalFacturacionMenu?: number
  umbralVolumenMedio: number
  umbralPrecioMedio: number
  cantEstrellas: number
  cantCaballos: number
  cantRompecabezas: number
  cantLastres: number
  rentabilidadMenu?: {
    platosAuditados: number
    totalPlatos: number
    gananciaLimpiaTotalMes: number
    costoTotalMercaderiaMes: number
  }
  cuadrantes?: {
    estrella: CuadranteStats
    caballo: CuadranteStats
    rompecabezas: CuadranteStats
    lastre: CuadranteStats
  }
  resumenEjecutivo?: string[]
}

interface Props {
  resumen: ResumenBCG
  platos: PlatoBCG[]
}

type CuadranteFiltro = 'todos' | 'estrella' | 'caballo' | 'rompecabezas' | 'lastre'
type TipoOrden = 'facturacion_desc' | 'ganancia_desc' | 'unidades_desc' | 'precio_desc' | 'unidades_asc' | 'presencia_desc'

export default function MatrizIngenieriaMenu({ resumen, platos }: Props) {
  const [listaPlatos, setListaPlatos] = useState<PlatoBCG[]>(platos)
  useEffect(() => {
    setListaPlatos(platos)
  }, [platos])

  const [filtroCuadrante, setFiltroCuadrante] = useState<CuadranteFiltro>('todos')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<TipoOrden>('facturacion_desc')
  const [platoSeleccionado, setPlatoSeleccionado] = useState<PlatoBCG | null>(null)
  const [mostrarComoFunciona, setMostrarComoFunciona] = useState(false)

  // Estado para carga y edición de costo rápido
  const [guardandoCosto, setGuardandoCosto] = useState(false)
  const [editandoCosto, setEditandoCosto] = useState(false)
  const [costoInput, setCostoInput] = useState('')
  const [desgloseInsumo, setDesgloseInsumo] = useState('')
  const [desglosePackaging, setDesglosePackaging] = useState('')
  const [mostrarDesglose, setMostrarDesglose] = useState(false)

  // Estados para el Consultor Inteligente del Plato ("Preguntale a Chefsy")
  const [preguntaPlatoActiva, setPreguntaPlatoActiva] = useState<'aumento' | 'discontinuar' | 'promo' | 'libre'>('aumento')
  const [porcentajeAumentoSimulado, setPorcentajeAumentoSimulado] = useState<number>(8)
  const [consultaLibrePlato, setConsultaLibrePlato] = useState('')
  const [respuestaLibrePlato, setRespuestaLibrePlato] = useState<string | null>(null)

  // Inicializar formulario al abrir o cambiar de plato seleccionado
  useEffect(() => {
    if (platoSeleccionado) {
      setPreguntaPlatoActiva('aumento')
      setPorcentajeAumentoSimulado(8)
      setConsultaLibrePlato('')
      setRespuestaLibrePlato(null)

      if (platoSeleccionado.rentabilidadReal?.tieneCosto) {
        setCostoInput(platoSeleccionado.rentabilidadReal.costoUnitario.toString())
        setDesgloseInsumo(platoSeleccionado.rentabilidadReal.insumoPrincipal ? platoSeleccionado.rentabilidadReal.insumoPrincipal.toString() : '')
        setDesglosePackaging(platoSeleccionado.rentabilidadReal.packaging ? platoSeleccionado.rentabilidadReal.packaging.toString() : '')
        setEditandoCosto(false)
        setMostrarDesglose(Boolean(platoSeleccionado.rentabilidadReal.insumoPrincipal || platoSeleccionado.rentabilidadReal.packaging))
      } else {
        setCostoInput('')
        setDesgloseInsumo('')
        setDesglosePackaging('')
        setEditandoCosto(true)
        setMostrarDesglose(false)
      }
    }
  }, [platoSeleccionado?.id])

  // Guardar costo en Supabase y actualizar interfaz inmediatamente
  const guardarCostoPlato = async (platoId: string) => {
    if (!platoSeleccionado) return
    const costoNum = Math.max(0, Number(costoInput.replace(/[^0-9]/g, '')) || 0)
    if (costoNum <= 0) {
      alert('Por favor ingresá un costo de elaboración mayor a $0.')
      return
    }
    const insumoNum = Math.max(0, Number(desgloseInsumo.replace(/[^0-9]/g, '')) || 0)
    const packNum = Math.max(0, Number(desglosePackaging.replace(/[^0-9]/g, '')) || 0)

    try {
      setGuardandoCosto(true)
      const res = await fetch('/api/admin/costos-productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: platoId,
          costoEstimado: costoNum,
          insumoPrincipal: insumoNum,
          packaging: packNum
        })
      })

      if (!res.ok) {
        throw new Error('Error al guardar en el servidor')
      }

      // Cálculo de rentabilidad en caliente para visualización inmediata
      const precioPromedio = platoSeleccionado.precioPromedio
      const gananciaLimpiaUnitaria = Math.max(0, precioPromedio - costoNum)
      const porcentajeInsumos = precioPromedio > 0 ? Math.round((costoNum / precioPromedio) * 1000) / 10 : 0
      const porcentajeGananciaLimpia = Math.max(0, Math.round((100 - porcentajeInsumos) * 10) / 10)
      const gananciaTotalMes = Math.round(gananciaLimpiaUnitaria * platoSeleccionado.unidades)

      let estadoSalud: 'saludable' | 'moderado' | 'alerta' = 'saludable'
      let explicacionSalud = 'Excelente margen: te queda más del 65% limpio en mano.'
      if (porcentajeInsumos > 40) {
        estadoSalud = 'alerta'
        explicacionSalud = 'Costo alto: los ingredientes y packaging se comen más del 40% del precio.'
      } else if (porcentajeInsumos >= 30) {
        estadoSalud = 'moderado'
        explicacionSalud = 'Margen normal dentro del estándar gastronómico (30% a 40% de insumos).'
      }

      const descuentoSeguroPct = porcentajeGananciaLimpia > 50 ? 20 : porcentajeGananciaLimpia > 35 ? 10 : 0
      const ahorroPromoSegura = Math.round(precioPromedio * (descuentoSeguroPct / 100))

      const nuevaRentabilidad: RentabilidadReal = {
        tieneCosto: true,
        costoUnitario: costoNum,
        insumoPrincipal: insumoNum,
        packaging: packNum,
        gananciaLimpiaUnitaria,
        porcentajeInsumos,
        porcentajeGananciaLimpia,
        gananciaTotalMes,
        estadoSalud,
        explicacionSalud,
        descuentoSeguroPct,
        ahorroPromoSegura,
        updatedAt: new Date().toISOString()
      }

      const platoActualizado: PlatoBCG = {
        ...platoSeleccionado,
        rentabilidadReal: nuevaRentabilidad
      }

      setPlatoSeleccionado(platoActualizado)
      setListaPlatos(prev => prev.map(p => p.id === platoId ? platoActualizado : p))
      setEditandoCosto(false)
    } catch (err) {
      console.error(err)
      alert('Hubo un problema al guardar el costo. Intentá nuevamente.')
    } finally {
      setGuardandoCosto(false)
    }
  }

  // Lista de categorías únicas presentes en la carta
  const categoriasDisponibles = useMemo(() => {
    const setCats = new Set<string>()
    listaPlatos.forEach(p => {
      if (p.categoria) setCats.add(p.categoria)
    })
    return Array.from(setCats).sort()
  }, [listaPlatos])

  // Resumen de rentabilidad global para los platos que ya tienen costo cargado
  const resumenRentabilidad = useMemo(() => {
    const auditados = listaPlatos.filter(p => p.rentabilidadReal?.tieneCosto)
    const gananciaTotal = auditados.reduce((acc, p) => acc + (p.rentabilidadReal?.gananciaTotalMes || 0), 0)
    const costoTotal = auditados.reduce((acc, p) => acc + ((p.rentabilidadReal?.costoUnitario || 0) * p.unidades), 0)
    return {
      auditadosCount: auditados.length,
      totalCount: listaPlatos.length,
      gananciaTotal,
      costoTotal
    }
  }, [listaPlatos])

  // Métricas consolidadas por cuadrante
  const statsCuadrantes = useMemo(() => {
    if (resumen.cuadrantes) {
      return resumen.cuadrantes
    }
    const totalFact = listaPlatos.reduce((acc, p) => acc + p.facturacionTotal, 0)
    const totalUni = listaPlatos.reduce((acc, p) => acc + p.unidades, 0)

    const calcCuad = (cuad: 'estrella' | 'caballo' | 'rompecabezas' | 'lastre', accion: string): CuadranteStats => {
      const items = listaPlatos.filter(p => p.cuadrante === cuad)
      const count = items.length
      const facturacionTotal = items.reduce((a, b) => a + b.facturacionTotal, 0)
      const unidadesTotal = items.reduce((a, b) => a + b.unidades, 0)
      return {
        count,
        facturacionTotal,
        porcentajeFacturacion: totalFact > 0 ? Math.round((facturacionTotal / totalFact) * 1000) / 10 : 0,
        unidadesTotal,
        porcentajeUnidades: totalUni > 0 ? Math.round((unidadesTotal / totalUni) * 1000) / 10 : 0,
        precioPromedio: unidadesTotal > 0 ? Math.round(facturacionTotal / unidadesTotal) : 0,
        accionPrincipal: accion
      }
    }

    return {
      estrella: calcCuad('estrella', 'Proteger y mantener disponibilidad. No tocar ni descontar.'),
      caballo: calcCuad('caballo', 'Monetizar el volumen: empaquetar en combos con bebida o papas.'),
      rompecabezas: calcCuad('rompecabezas', 'Impulsar visibilidad: mejorar foto y probar promos antes de retirar.'),
      lastre: calcCuad('lastre', 'Auditar complejidad: simplificar insumos o descontinuar platos sin rotación.')
    }
  }, [resumen.cuadrantes, listaPlatos])

  // Filtrado y ordenamiento de platos
  const platosFiltrados = useMemo(() => {
    return listaPlatos
      .filter(p => {
        if (filtroCuadrante !== 'todos' && p.cuadrante !== filtroCuadrante) return false
        if (categoriaSeleccionada !== 'todas' && p.categoria !== categoriaSeleccionada) return false
        if (busqueda.trim()) {
          const q = busqueda.toLowerCase()
          return p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)
        }
        return true
      })
      .sort((a, b) => {
        switch (orden) {
          case 'facturacion_desc':
            return b.facturacionTotal - a.facturacionTotal
          case 'ganancia_desc': {
            const ganA = a.rentabilidadReal?.gananciaTotalMes || 0
            const ganB = b.rentabilidadReal?.gananciaTotalMes || 0
            if (ganB !== ganA) return ganB - ganA
            return b.facturacionTotal - a.facturacionTotal
          }
          case 'unidades_desc':
            return b.unidades - a.unidades
          case 'precio_desc':
            return b.precioPromedio - a.precioPromedio
          case 'unidades_asc':
            return a.unidades - b.unidades
          case 'presencia_desc':
            return b.porcentajeComandas - a.porcentajeComandas
          default:
            return b.facturacionTotal - a.facturacionTotal
        }
      })
  }, [listaPlatos, filtroCuadrante, categoriaSeleccionada, busqueda, orden])

  return (
    <div className="bg-white dark:bg-[#252525] rounded-3xl border border-slate-100 dark:border-[#3d3d3d] p-5 sm:p-7 shadow-sm space-y-6">
      
      {/* ── ENCABEZADO Y EXPLICACIÓN DE INGENIERÍA DE MENÚ ─────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#383838] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  Matriz de Ingeniería de Menú
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#333] text-slate-600 dark:text-slate-300">
                  BCG Gastronómica
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                Auditoría estratégica cruzando volumen de ventas vs aporte al ticket
              </p>
            </div>
          </div>
        </div>

        {/* Umbrales de Corte, Rentabilidad y Botón ¿Cómo funciona? */}
        <div className="flex flex-wrap items-center gap-2.5">
          {resumenRentabilidad.auditadosCount > 0 ? (
            <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200">
              <Coins size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex flex-wrap items-center gap-x-2">
                <span>
                  <strong className="font-extrabold">{resumenRentabilidad.auditadosCount}</strong> con costo:
                </span>
                <span className="font-black text-emerald-700 dark:text-emerald-300">
                  +{formatearPrecio(resumenRentabilidad.gananciaTotal)} ganancia limpia en el mes
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-[#1e1e1e] px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-[#383838] text-slate-500">
              <Coins size={14} className="text-slate-400 shrink-0" />
              <span>Ficha de costos: Carga el costo de tus platos para ver tu ganancia real</span>
            </div>
          )}

          <button
            onClick={() => setMostrarComoFunciona(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 transition-colors"
          >
            <HelpCircle size={14} />
            <span>¿Cómo funciona?</span>
          </button>

          <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-[#1e1e1e] px-3 py-2 rounded-xl border border-slate-200/70 dark:border-[#383838]">
            <Info size={15} className="text-slate-400 shrink-0" />
            <div className="flex flex-wrap items-center gap-x-3 text-slate-600 dark:text-slate-300 font-medium">
              <span title="Promedio de unidades vendidas por plato analizado">
                Corte volumen: <strong className="text-slate-900 dark:text-white font-bold">{resumen.umbralVolumenMedio} u.</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span title="Precio promedio ponderado de venta por unidad">
                Corte ticket: <strong className="text-slate-900 dark:text-white font-bold">{formatearPrecio(resumen.umbralPrecioMedio)}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── LECTURA RÁPIDA DEL MENÚ (RESUMEN EJECUTIVO DINÁMICO) ───────────────── */}
      {resumen.resumenEjecutivo && resumen.resumenEjecutivo.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-[#1e1e1e] dark:to-indigo-950/20 border border-slate-200/70 dark:border-[#383838] space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Lightbulb size={16} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Lectura Estratégica del Menú
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ml-auto">
              Chefsy Insights
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {resumen.resumenEjecutivo.map((conclusion, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-[#252525]/70 p-3 rounded-xl border border-slate-100 dark:border-[#333]"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{conclusion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TARJETAS DE LOS 4 CUADRANTES ESTRATÉGICOS ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 🌟 1. PLATOS ESTRELLA */}
        <button
          onClick={() => setFiltroCuadrante(filtroCuadrante === 'estrella' ? 'todos' : 'estrella')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            filtroCuadrante === 'estrella'
              ? 'bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-slate-50/70 dark:bg-[#1f1f1f] border-slate-200/80 dark:border-[#383838] hover:border-amber-400/50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-500">
                  <Star size={16} className="fill-amber-500" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Platos Estrella</span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                {statsCuadrantes.estrella.count}
              </span>
            </div>

            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatearPrecio(statsCuadrantes.estrella.facturacionTotal)}
            </p>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{statsCuadrantes.estrella.porcentajeFacturacion}% de la caja</span>
              <span>•</span>
              <span>{statsCuadrantes.estrella.unidadesTotal} u. ({statsCuadrantes.estrella.porcentajeUnidades}%)</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-[#333]">
            <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold leading-tight">
              {statsCuadrantes.estrella.accionPrincipal}
            </p>
          </div>
        </button>

        {/* ⚡ 2. CABALLOS DE BATALLA */}
        <button
          onClick={() => setFiltroCuadrante(filtroCuadrante === 'caballo' ? 'todos' : 'caballo')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            filtroCuadrante === 'caballo'
              ? 'bg-blue-500/10 border-blue-500 shadow-md ring-2 ring-blue-500/20'
              : 'bg-slate-50/70 dark:bg-[#1f1f1f] border-slate-200/80 dark:border-[#383838] hover:border-blue-400/50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-500/20 text-blue-500">
                  <Zap size={16} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Caballos de Batalla</span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
                {statsCuadrantes.caballo.count}
              </span>
            </div>

            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatearPrecio(statsCuadrantes.caballo.facturacionTotal)}
            </p>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{statsCuadrantes.caballo.porcentajeFacturacion}% de la caja</span>
              <span>•</span>
              <span>{statsCuadrantes.caballo.unidadesTotal} u. ({statsCuadrantes.caballo.porcentajeUnidades}%)</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-[#333]">
            <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold leading-tight">
              {statsCuadrantes.caballo.accionPrincipal}
            </p>
          </div>
        </button>

        {/* 🎯 3. ROMPECABEZAS / OPORTUNIDAD */}
        <button
          onClick={() => setFiltroCuadrante(filtroCuadrante === 'rompecabezas' ? 'todos' : 'rompecabezas')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            filtroCuadrante === 'rompecabezas'
              ? 'bg-purple-500/10 border-purple-500 shadow-md ring-2 ring-purple-500/20'
              : 'bg-slate-50/70 dark:bg-[#1f1f1f] border-slate-200/80 dark:border-[#383838] hover:border-purple-400/50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-500">
                  <Target size={16} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Rompecabezas</span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400">
                {statsCuadrantes.rompecabezas.count}
              </span>
            </div>

            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatearPrecio(statsCuadrantes.rompecabezas.facturacionTotal)}
            </p>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{statsCuadrantes.rompecabezas.porcentajeFacturacion}% de la caja</span>
              <span>•</span>
              <span>{statsCuadrantes.rompecabezas.unidadesTotal} u. ({statsCuadrantes.rompecabezas.porcentajeUnidades}%)</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-[#333]">
            <p className="text-[10px] text-purple-700 dark:text-purple-300 font-bold leading-tight">
              {statsCuadrantes.rompecabezas.accionPrincipal}
            </p>
          </div>
        </button>

        {/* 📦 4. PLATOS LASTRE / PERROS */}
        <button
          onClick={() => setFiltroCuadrante(filtroCuadrante === 'lastre' ? 'todos' : 'lastre')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            filtroCuadrante === 'lastre'
              ? 'bg-rose-500/10 border-rose-500 shadow-md ring-2 ring-rose-500/20'
              : 'bg-slate-50/70 dark:bg-[#1f1f1f] border-slate-200/80 dark:border-[#383838] hover:border-rose-400/50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-500">
                  <Archive size={16} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Lastre / A Revisar</span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400">
                {statsCuadrantes.lastre.count}
              </span>
            </div>

            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatearPrecio(statsCuadrantes.lastre.facturacionTotal)}
            </p>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{statsCuadrantes.lastre.porcentajeFacturacion}% de la caja</span>
              <span>•</span>
              <span>{statsCuadrantes.lastre.unidadesTotal} u. ({statsCuadrantes.lastre.porcentajeUnidades}%)</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-[#333]">
            <p className="text-[10px] text-rose-700 dark:text-rose-300 font-bold leading-tight">
              {statsCuadrantes.lastre.accionPrincipal}
            </p>
          </div>
        </button>

      </div>

      {/* ── BARRA DE BÚSQUEDA, CATEGORÍA Y ACCESOS RÁPIDOS ─────────────────────── */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar plato o categoría..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#1f1f1f] rounded-xl border border-slate-200 dark:border-[#383838] text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro por Categoría y Orden */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            
            {/* Categoría Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#1f1f1f] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#383838]">
              <Filter size={13} className="text-slate-400" />
              <select
                value={categoriaSeleccionada}
                onChange={e => setCategoriaSeleccionada(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-bold focus:outline-none text-xs cursor-pointer"
              >
                <option value="todas">Todas las Categorías</option>
                {categoriasDisponibles.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Ordenamiento */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#1f1f1f] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#383838]">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={orden}
                onChange={e => setOrden(e.target.value as TipoOrden)}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-bold focus:outline-none text-xs cursor-pointer"
              >
                <option value="facturacion_desc">Mayor Facturación</option>
                <option value="ganancia_desc">Mayor Ganancia Limpia en Mano ($)</option>
                <option value="unidades_desc">Mayor Volumen (u.)</option>
                <option value="precio_desc">Mayor Precio / Ticket</option>
                <option value="unidades_asc">Menor Movimiento (u.)</option>
                <option value="presencia_desc">Mayor Presencia en Pedidos</option>
              </select>
            </div>

          </div>
        </div>

        {/* Accesos Rápidos de Clasificación */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Filtrar cuadrante:</span>
          <button
            onClick={() => setFiltroCuadrante('todos')}
            className={`px-3 py-1 rounded-lg font-bold transition-all text-xs ${
              filtroCuadrante === 'todos'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-[#202020] text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            Todos ({platos.length})
          </button>
          <button
            onClick={() => setFiltroCuadrante('estrella')}
            className={`px-3 py-1 rounded-lg font-bold transition-all text-xs flex items-center gap-1 ${
              filtroCuadrante === 'estrella'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
            }`}
          >
            <Star size={12} className={filtroCuadrante === 'estrella' ? 'fill-white' : 'fill-amber-500'} />
            <span>Estrellas ({statsCuadrantes.estrella.count})</span>
          </button>
          <button
            onClick={() => setFiltroCuadrante('caballo')}
            className={`px-3 py-1 rounded-lg font-bold transition-all text-xs flex items-center gap-1 ${
              filtroCuadrante === 'caballo'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100'
            }`}
          >
            <Zap size={12} />
            <span>Caballos ({statsCuadrantes.caballo.count})</span>
          </button>
          <button
            onClick={() => setFiltroCuadrante('rompecabezas')}
            className={`px-3 py-1 rounded-lg font-bold transition-all text-xs flex items-center gap-1 ${
              filtroCuadrante === 'rompecabezas'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100'
            }`}
          >
            <Target size={12} />
            <span>Rompecabezas ({statsCuadrantes.rompecabezas.count})</span>
          </button>
          <button
            onClick={() => setFiltroCuadrante('lastre')}
            className={`px-3 py-1 rounded-lg font-bold transition-all text-xs flex items-center gap-1 ${
              filtroCuadrante === 'lastre'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
            }`}
          >
            <Archive size={12} />
            <span>Lastre ({statsCuadrantes.lastre.count})</span>
          </button>

          <span className="ml-auto text-[11px] text-slate-400 font-medium">
            Mostrando {platosFiltrados.length} de {platos.length} platos
          </span>
        </div>
      </div>

      {/* ── TABLA AUDITORÍA DE PRODUCTOS ──────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-[#383838]">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50/80 dark:bg-[#1e1e1e] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-[#383838]">
            <tr>
              <th className="px-3 py-3 w-12 text-center">Rank</th>
              <th className="px-4 py-3">Plato & Categoría</th>
              <th className="px-4 py-3">Clasificación BCG</th>
              <th className="px-4 py-3 text-right">Volumen (% Menú)</th>
              <th className="px-4 py-3 text-right">
                <span className="cursor-help" title="Porcentaje de pedidos en los que el plato estuvo presente al menos una vez">
                  Presencia Comandas ⓘ
                </span>
              </th>
              <th className="px-4 py-3 text-right">Precio Venta</th>
              <th className="px-4 py-3 text-right">Ganancia Limpia</th>
              <th className="px-4 py-3 text-right">Total Facturado</th>
              <th className="px-4 py-3">Estrategia Recomendada</th>
              <th className="px-4 py-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
            {platosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-400 text-xs">
                  No se encontraron productos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              platosFiltrados.map((p, idx) => {
                const esEstrella = p.cuadrante === 'estrella'
                const esCaballo = p.cuadrante === 'caballo'
                const esRompecabezas = p.cuadrante === 'rompecabezas'

                return (
                  <tr
                    key={p.id || idx}
                    onClick={() => setPlatoSeleccionado(p)}
                    className="hover:bg-slate-50/80 dark:hover:bg-[#202020] transition-colors cursor-pointer group"
                  >
                    {/* Rank */}
                    <td className="px-3 py-3 text-center">
                      <span className="font-extrabold text-[11px] text-slate-400 group-hover:text-indigo-600 transition-colors">
                        #{p.rankingFacturacion || idx + 1}
                      </span>
                    </td>

                    {/* Plato con Foto y Categoría */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.imagenUrl ? (
                          <img
                            src={p.imagenUrl}
                            alt={p.nombre}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-[#333] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#282828] flex items-center justify-center text-slate-400 shrink-0">
                            <Utensils size={18} />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-xs">
                            {p.nombre}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {p.categoria}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cuadrante BCG */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                        esEstrella
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                          : esCaballo
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                          : esRompecabezas
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                      }`}>
                        {esEstrella && <Star size={12} className="fill-amber-500 text-amber-500" />}
                        {esCaballo && <Zap size={12} />}
                        {esRompecabezas && <Target size={12} />}
                        {!esEstrella && !esCaballo && !esRompecabezas && <Archive size={12} />}
                        {esEstrella ? 'Estrella' : esCaballo ? 'Caballo' : esRompecabezas ? 'Rompecabezas' : 'Lastre'}
                      </span>
                    </td>

                    {/* Unidades & % Volumen */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                          {p.unidades} u.
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {p.participacionUnidadesPct}% del volumen
                        </span>
                      </div>
                    </td>

                    {/* Presencia en comandas */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {p.porcentajeComandas}%
                      </span>
                    </td>

                    {/* Precio Promedio */}
                    <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {formatearPrecio(p.precioPromedio)}
                    </td>

                    {/* Ganancia Limpia */}
                    <td className="px-4 py-3 text-right">
                      {p.rentabilidadReal?.tieneCosto ? (
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                              +{formatearPrecio(p.rentabilidadReal.gananciaLimpiaUnitaria)}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              p.rentabilidadReal.estadoSalud === 'saludable'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : p.rentabilidadReal.estadoSalud === 'moderado'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            }`}>
                              {p.rentabilidadReal.porcentajeGananciaLimpia}%
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Costo: {formatearPrecio(p.rentabilidadReal.costoUnitario)}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPlatoSeleccionado(p)
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold transition-colors border border-indigo-200/50 dark:border-indigo-800/40"
                          title="Cargar costo express de este plato"
                        >
                          <PlusCircle size={12} />
                          <span>+ Cargar costo</span>
                        </button>
                      )}
                    </td>

                    {/* Facturación */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatearPrecio(p.facturacionTotal)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {p.participacionFacturacionPct}% de la venta
                        </span>
                      </div>
                    </td>

                    {/* Estrategia / Recomendación Culinaria */}
                    <td className="px-4 py-3 max-w-xs truncate text-[11px] text-slate-500 dark:text-slate-400">
                      <span title={p.accionSugerida} className="block truncate">
                        {p.accionSugerida}
                      </span>
                    </td>

                    {/* Botón de Diagnóstico */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setPlatoSeleccionado(p)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-[#2e2e2e] dark:hover:bg-indigo-950/40 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 text-[11px] font-bold transition-colors"
                      >
                        <span>Diagnóstico</span>
                        <ChevronRight size={12} />
                      </button>
                    </td>

                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL DIAGNÓSTICO PROFUNDO DE PRODUCTO ───────────────────────────── */}
      {platoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-[#222] w-full max-w-xl rounded-3xl border border-slate-200 dark:border-[#3d3d3d] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="p-5 border-b border-slate-100 dark:border-[#333] flex items-start justify-between gap-3 bg-slate-50/60 dark:bg-[#282828]">
              <div className="flex items-center gap-3">
                {platoSeleccionado.imagenUrl ? (
                  <img
                    src={platoSeleccionado.imagenUrl}
                    alt={platoSeleccionado.nombre}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-[#383838] shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-[#333] flex items-center justify-center text-slate-400 shrink-0">
                    <Utensils size={24} />
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {platoSeleccionado.categoria}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                      #{platoSeleccionado.rankingFacturacion} en Ventas
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {platoSeleccionado.nombre}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setPlatoSeleccionado(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#333] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido Scrolleable */}
            <div className="p-5 space-y-5 overflow-y-auto">
              
              {/* Pills de métricas clave */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-100 dark:border-[#383838]">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Facturación</span>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatearPrecio(platoSeleccionado.facturacionTotal)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {platoSeleccionado.participacionFacturacionPct}% del total
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-100 dark:border-[#383838]">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Unidades</span>
                  <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
                    {platoSeleccionado.unidades} u.
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {platoSeleccionado.participacionUnidadesPct}% del menú
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-100 dark:border-[#383838]">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Precio Promedio</span>
                  <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
                    {formatearPrecio(platoSeleccionado.precioPromedio)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Corte: {formatearPrecio(resumen.umbralPrecioMedio)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-100 dark:border-[#383838]">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Presencia Comandas</span>
                  <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {platoSeleccionado.porcentajeComandas}%
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    de los pedidos
                  </span>
                </div>
              </div>

              {/* ── FICHA DE COSTO RÁPIDO & RENTABILIDAD REAL ─────────────────────── */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-[#383838] p-4 bg-slate-50/70 dark:bg-[#202020] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <Coins size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Rentabilidad & Ganancia Limpia en Mano
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Cargá el costo de elaboración para ver cuánta plata real te deja este plato
                      </p>
                    </div>
                  </div>

                  {platoSeleccionado.rentabilidadReal?.tieneCosto && !editandoCosto && (
                    <button
                      onClick={() => setEditandoCosto(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <Pencil size={12} />
                      <span>Modificar costo</span>
                    </button>
                  )}
                </div>

                {/* SI YA TIENE COSTO Y NO ESTÁ EDITANDO: MÉTRICAS LIMPIAS Y RECOMENDACIÓN */}
                {platoSeleccionado.rentabilidadReal?.tieneCosto && !editandoCosto ? (
                  <div className="space-y-3 pt-1">
                    {/* 3 Métricas en tarjetas */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      
                      {/* Plata limpia por plato */}
                      <div className="bg-white dark:bg-[#262626] p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Plata limpia por plato</span>
                        <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                          +{formatearPrecio(platoSeleccionado.rentabilidadReal.gananciaLimpiaUnitaria)}
                        </p>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                          Te queda el {platoSeleccionado.rentabilidadReal.porcentajeGananciaLimpia}% limpio
                        </span>
                      </div>

                      {/* Ganancia del mes en mano */}
                      <div className="bg-white dark:bg-[#262626] p-3 rounded-xl border border-slate-200/60 dark:border-[#383838]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Ganancia de bolsillo mes</span>
                        <p className="text-base font-black text-slate-800 dark:text-white mt-0.5">
                          +{formatearPrecio(platoSeleccionado.rentabilidadReal.gananciaTotalMes)}
                        </p>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Por {platoSeleccionado.unidades} u. vendidas
                        </span>
                      </div>

                      {/* Costo de elaboración */}
                      <div className="bg-white dark:bg-[#262626] p-3 rounded-xl border border-slate-200/60 dark:border-[#383838]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Costo de elaboración</span>
                        <p className="text-base font-black text-slate-700 dark:text-slate-300 mt-0.5">
                          {formatearPrecio(platoSeleccionado.rentabilidadReal.costoUnitario)}
                        </p>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Se come el {platoSeleccionado.rentabilidadReal.porcentajeInsumos}% del precio
                        </span>
                      </div>
                    </div>

                    {/* Desglose si existe */}
                    {(platoSeleccionado.rentabilidadReal.insumoPrincipal || platoSeleccionado.rentabilidadReal.packaging) ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-[#262626] px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-[#383838]">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Desglose:</span>
                        {platoSeleccionado.rentabilidadReal.insumoPrincipal ? (
                          <span>Ingredientes: <strong className="text-slate-800 dark:text-slate-100">{formatearPrecio(platoSeleccionado.rentabilidadReal.insumoPrincipal)}</strong></span>
                        ) : null}
                        {platoSeleccionado.rentabilidadReal.insumoPrincipal && platoSeleccionado.rentabilidadReal.packaging ? <span>•</span> : null}
                        {platoSeleccionado.rentabilidadReal.packaging ? (
                          <span>Packaging & descartables: <strong className="text-slate-800 dark:text-slate-100">{formatearPrecio(platoSeleccionado.rentabilidadReal.packaging)}</strong></span>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Semáforo de salud de costo y consejo de promo */}
                    <div className="space-y-2">
                      <div className={`p-2.5 rounded-xl border flex items-start gap-2 text-xs ${
                        platoSeleccionado.rentabilidadReal.estadoSalud === 'saludable'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200'
                          : platoSeleccionado.rentabilidadReal.estadoSalud === 'moderado'
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200'
                          : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-200'
                      }`}>
                        {platoSeleccionado.rentabilidadReal.estadoSalud === 'saludable' ? (
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle size={16} className={platoSeleccionado.rentabilidadReal.estadoSalud === 'moderado' ? 'text-amber-600 shrink-0 mt-0.5' : 'text-rose-600 shrink-0 mt-0.5'} />
                        )}
                        <div>
                          <strong className="block font-bold">
                            {platoSeleccionado.rentabilidadReal.estadoSalud === 'saludable' ? '🟢 Margen Excelente' : platoSeleccionado.rentabilidadReal.estadoSalud === 'moderado' ? '🟡 Margen Equilibrado' : '🔴 Atención con el Costo'}
                          </strong>
                          <span className="leading-snug">{platoSeleccionado.rentabilidadReal.explicacionSalud}</span>
                        </div>
                      </div>

                      {/* Recomendación de promo segura */}
                      {platoSeleccionado.rentabilidadReal.descuentoSeguroPct > 0 ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200 text-xs">
                          <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>
                            <strong>Descuento seguro en promociones:</strong> Podés rebajarlo hasta un <strong>{platoSeleccionado.rentabilidadReal.descuentoSeguroPct}% (-{formatearPrecio(platoSeleccionado.rentabilidadReal.ahorroPromoSegura)})</strong> sin poner en riesgo tu ganancia.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-[#252525] text-slate-600 dark:text-slate-300 text-xs">
                          <ShieldCheck size={16} className="text-slate-400 shrink-0" />
                          <span>
                            <strong>Cuidado con los descuentos:</strong> Como el costo absorbe más del 40% del precio, <strong>no conviene hacer rebajas de precio directas</strong> en este plato.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* FORMULARIO DE CARGA RÁPIDA */
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                        ¿Cuánto te sale elaborar una unidad de este plato? (Ingredientes + Packaging)
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input
                            type="text"
                            placeholder="Ej: 3.500"
                            value={costoInput}
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9]/g, '')
                              setCostoInput(val ? Number(val).toLocaleString('es-AR') : '')
                            }}
                            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#282828] rounded-xl border border-slate-300 dark:border-[#444] text-slate-900 dark:text-white font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <button
                          disabled={guardandoCosto}
                          onClick={() => guardarCostoPlato(platoSeleccionado.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          {guardandoCosto ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>Guardando...</span>
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              <span>Guardar Costo</span>
                            </>
                          )}
                        </button>
                        {platoSeleccionado.rentabilidadReal?.tieneCosto && (
                          <button
                            onClick={() => setEditandoCosto(false)}
                            className="px-3 py-2 bg-slate-200 dark:bg-[#333] hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Toggle opcional para separar ingredientes de packaging */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setMostrarDesglose(!mostrarDesglose)}
                        className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{mostrarDesglose ? '▼ Ocultar detalle de ingredientes' : '► Opcional: Separar ingredientes de packaging'}</span>
                      </button>

                      {mostrarDesglose && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 p-2.5 bg-white dark:bg-[#282828] rounded-xl border border-slate-200 dark:border-[#383838]">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                              Ingredientes (Carne, pan, verdura...)
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                              <input
                                type="text"
                                placeholder="Ej: 3.000"
                                value={desgloseInsumo}
                                onChange={e => {
                                  const val = e.target.value.replace(/[^0-9]/g, '')
                                  setDesgloseInsumo(val ? Number(val).toLocaleString('es-AR') : '')
                                  const insumoNum = Number(val) || 0
                                  const packNum = Number(desglosePackaging.replace(/[^0-9]/g, '')) || 0
                                  if (insumoNum > 0 || packNum > 0) {
                                    setCostoInput((insumoNum + packNum).toLocaleString('es-AR'))
                                  }
                                }}
                                className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-50 dark:bg-[#202020] rounded-lg border border-slate-200 dark:border-[#444] text-slate-900 dark:text-white font-bold"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                              Packaging (Caja, bolsa, servilleta...)
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                              <input
                                type="text"
                                placeholder="Ej: 500"
                                value={desglosePackaging}
                                onChange={e => {
                                  const val = e.target.value.replace(/[^0-9]/g, '')
                                  setDesglosePackaging(val ? Number(val).toLocaleString('es-AR') : '')
                                  const packNum = Number(val) || 0
                                  const insumoNum = Number(desgloseInsumo.replace(/[^0-9]/g, '')) || 0
                                  if (insumoNum > 0 || packNum > 0) {
                                    setCostoInput((insumoNum + packNum).toLocaleString('es-AR'))
                                  }
                                }}
                                className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-50 dark:bg-[#202020] rounded-lg border border-slate-200 dark:border-[#444] text-slate-900 dark:text-white font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      💡 <strong>Cálculo al instante:</strong> Con ingresar el costo una sola vez, Chefsy proyecta tu margen limpio y te avisa qué descuento podés hacer en promociones sin perder plata.
                    </p>
                  </div>
                )}
              </div>

              {/* 1. ¿Por qué está aquí? */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100">
                  <div className={`p-1 rounded-md ${
                    platoSeleccionado.cuadrante === 'estrella'
                      ? 'bg-amber-500/20 text-amber-500'
                      : platoSeleccionado.cuadrante === 'caballo'
                      ? 'bg-blue-500/20 text-blue-500'
                      : platoSeleccionado.cuadrante === 'rompecabezas'
                      ? 'bg-purple-500/20 text-purple-500'
                      : 'bg-rose-500/20 text-rose-500'
                  }`}>
                    {platoSeleccionado.cuadrante === 'estrella' ? (
                      <Star size={14} className="fill-amber-500" />
                    ) : platoSeleccionado.cuadrante === 'caballo' ? (
                      <Zap size={14} />
                    ) : platoSeleccionado.cuadrante === 'rompecabezas' ? (
                      <Target size={14} />
                    ) : (
                      <Archive size={14} />
                    )}
                  </div>
                  <span>¿Por qué está clasificado como {platoSeleccionado.cuadrante.toUpperCase()}?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/70 dark:bg-[#282828] p-3 rounded-xl border border-slate-100 dark:border-[#333]">
                  {platoSeleccionado.diagnosticoDetallado?.razon || platoSeleccionado.diagnostico}
                </p>
              </div>

              {/* 2. ¿Qué significa para el negocio? */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Info size={14} className="text-indigo-500" />
                  <span>¿Qué significa para Chefsy?</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/70 dark:bg-[#282828] p-3 rounded-xl border border-slate-100 dark:border-[#333]">
                  {platoSeleccionado.diagnosticoDetallado?.significado || 'Producto clave en la dinámica de compras y ventas de la carta.'}
                </p>
              </div>

              {/* 3. ¿Qué haría Chefsy? (Acciones recomendadas) */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-500" />
                  <span>¿Qué haría Chefsy? (Plan de acción)</span>
                </h4>
                <div className="space-y-2">
                  {(platoSeleccionado.diagnosticoDetallado?.accionesChefsy || [platoSeleccionado.accionSugerida]).map((accion, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30"
                    >
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{accion}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── CONSULTOR INTEGRADO: PREGUNTALE A CHEFSY SOBRE ESTE PLATO ─────── */}
              <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 p-4 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/20 dark:via-[#222] dark:to-purple-950/20 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                      <Bot size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                          Preguntale a Chefsy sobre este plato
                        </h4>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                          Simulador
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Elegí una pregunta para proyectar resultados antes de tomar decisiones en la carta
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botones de preguntas sobre el plato */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs pb-0.5">
                  <button
                    type="button"
                    onClick={() => setPreguntaPlatoActiva('aumento')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs shrink-0 cursor-pointer ${
                      preguntaPlatoActiva === 'aumento'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-[#2c2c2c] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#444] hover:bg-slate-50'
                    }`}
                  >
                    📈 ¿Qué pasa si aumento el precio?
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreguntaPlatoActiva('discontinuar')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs shrink-0 cursor-pointer ${
                      preguntaPlatoActiva === 'discontinuar'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-white dark:bg-[#2c2c2c] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#444] hover:bg-slate-50'
                    }`}
                  >
                    🛑 ¿Me conviene discontinuarlo?
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreguntaPlatoActiva('promo')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs shrink-0 cursor-pointer ${
                      preguntaPlatoActiva === 'promo'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-[#2c2c2c] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#444] hover:bg-slate-50'
                    }`}
                  >
                    🎁 ¿Qué promo armo con él?
                  </button>
                </div>

                {/* 1. RESPUESTA: SIMULADOR DE AUMENTO */}
                {preguntaPlatoActiva === 'aumento' && (() => {
                  const precioActual = platoSeleccionado.precioPromedio
                  const nuevoPrecio = Math.round(precioActual * (1 + porcentajeAumentoSimulado / 100))
                  const diferenciaUnitaria = nuevoPrecio - precioActual
                  const unidadesActuales = platoSeleccionado.unidades
                  const gananciaExtraMismoVol = diferenciaUnitaria * unidadesActuales
                  const unidadesCaida5 = Math.max(1, Math.round(unidadesActuales * 0.95))
                  const facturacionNuevaCaida5 = nuevoPrecio * unidadesCaida5
                  const gananciaExtraCaida5 = facturacionNuevaCaida5 - platoSeleccionado.facturacionTotal

                  let veredictoTexto = ''
                  let veredictoTipo: 'positivo' | 'alerta' | 'neutro' = 'positivo'

                  if (platoSeleccionado.cuadrante === 'estrella') {
                    veredictoTipo = 'positivo'
                    veredictoTexto = `Aumento 100% recomendado: Al ser tu producto estrella (${platoSeleccionado.unidades} u. vendidas), tus clientes lo eligen por calidad y sabor. Absorberán el +${porcentajeAumentoSimulado}% sin resentir la demanda.`
                  } else if (platoSeleccionado.cuadrante === 'caballo') {
                    veredictoTipo = 'alerta'
                    veredictoTexto = `Cuidado con subirlo solo: Es un plato de alto volumen que la gente pide por precio. En vez de aumentar un ${porcentajeAumentoSimulado}%, te conviene meterlo en combo con bebida o papas para inflar el ticket.`
                  } else if (platoSeleccionado.cuadrante === 'rompecabezas') {
                    veredictoTipo = 'alerta'
                    veredictoTexto = `Poco aconsejado: Ya tiene un ticket elevado (${formatearPrecio(precioActual)}) y rota poco. Subir el precio podría frenar aún más los pedidos.`
                  } else {
                    veredictoTipo = 'neutro'
                    veredictoTexto = `No moverá la aguja: Al vender pocas unidades, aumentar el precio no mejorará tu caja. Conviene reformularlo o evaluar discontinuarlo.`
                  }

                  return (
                    <div className="bg-white dark:bg-[#282828] p-4 rounded-2xl border border-slate-200/80 dark:border-[#383838] space-y-3.5">
                      {/* Selector de porcentaje de aumento */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-[#333] pb-3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Simular suba de precio:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[5, 8, 10, 15, 20].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setPorcentajeAumentoSimulado(pct)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                porcentajeAumentoSimulado === pct
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-[#333] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              +{pct}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tarjetas de Proyección de Escenarios */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#222] border border-slate-200/70 dark:border-[#333]">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Nuevo Precio de Venta</span>
                          <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                            {formatearPrecio(nuevoPrecio)}
                          </p>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                            +{formatearPrecio(diferenciaUnitaria)} extra por cada plato
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40">
                          <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 block">Si mantenés las ventas</span>
                          <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                            +{formatearPrecio(gananciaExtraMismoVol)}
                          </p>
                          <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium">
                            plata limpia extra al mes en tu bolsillo
                          </span>
                        </div>
                      </div>

                      {/* Escenario si el volumen cae un 5% */}
                      <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#222] border border-slate-200/70 dark:border-[#333] text-xs flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 font-bold block">
                            Escenario de cautela (si las ventas caen 5% por la suba):
                          </strong>
                          <span className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            Vendiendo {unidadesCaida5} u. en vez de {unidadesActuales} u., aún así tu recaudación {gananciaExtraCaida5 >= 0 ? `aumenta en +${formatearPrecio(gananciaExtraCaida5)}` : `varía apenas ${formatearPrecio(gananciaExtraCaida5)}`} y <strong>cocinás {unidadesActuales - unidadesCaida5} platos menos</strong> con el mismo o mejor resultado.
                          </span>
                        </div>
                      </div>

                      {/* Veredicto de Chefsy */}
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        veredictoTipo === 'positivo'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                          : veredictoTipo === 'alerta'
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
                          : 'bg-slate-100 dark:bg-[#202020] border-slate-200 dark:border-[#383838] text-slate-800 dark:text-slate-300'
                      }`}>
                        <Lightbulb size={16} className={veredictoTipo === 'positivo' ? 'text-emerald-600 shrink-0 mt-0.5' : 'text-amber-600 shrink-0 mt-0.5'} />
                        <div>
                          <strong className="block font-bold">Veredicto de Chefsy:</strong>
                          <span className="leading-relaxed">{veredictoTexto}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* 2. RESPUESTA: EVALUACIÓN DE DISCONTINUACIÓN */}
                {preguntaPlatoActiva === 'discontinuar' && (() => {
                  const unidades = platoSeleccionado.unidades
                  const pctVenta = platoSeleccionado.participacionFacturacionPct
                  const esBajoVolumen = unidades <= 4
                  const esBajoAporte = pctVenta <= 0.8

                  let tituloVeredicto = ''
                  let colorClase = ''
                  let explicacionVeredicto = ''

                  if (esBajoVolumen && esBajoAporte) {
                    tituloVeredicto = '🛑 Discontinuar Recomendada'
                    colorClase = 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    explicacionVeredicto = `Vendió apenas ${unidades} unidades en todo el período y aporta solo el ${pctVenta}% de la caja (${formatearPrecio(platoSeleccionado.facturacionTotal)}). Si te exige masa fresca, vegetales que se marchitan o cortes que se echan a perder, retiralo sin culpa: tu cocina trabajará más ágil y evitarás tirar mercadería a la basura.`
                  } else if (platoSeleccionado.cuadrante === 'rompecabezas') {
                    tituloVeredicto = '⚠️ Poner a prueba 10 días antes de retirar'
                    colorClase = 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    explicacionVeredicto = `Tiene un precio excelente (${formatearPrecio(platoSeleccionado.precioPromedio)}) pero le falta rotación (${unidades} u.). Antes de sacarlo, dale una oportunidad: cambiale la foto por una que dé hambre y lanzalo en promo un fin de semana. Si en 10 días no supera las 10 ventas, ahí sí retiralo.`
                  } else {
                    tituloVeredicto = '🟢 ¡Prohibido sacar de la carta!'
                    colorClase = 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    explicacionVeredicto = `Es uno de los motores comerciales del negocio (${unidades} unidades y ${pctVenta}% de la venta de comida). Tus clientes habituales lo buscan. Sacarlo sería un tiro en el pie para tu recaudación.`
                  }

                  return (
                    <div className="bg-white dark:bg-[#282828] p-4 rounded-2xl border border-slate-200/80 dark:border-[#383838] space-y-3 text-xs">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#222]">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Ventas Totales</span>
                          <strong className="text-sm font-black text-slate-800 dark:text-white">{unidades} u.</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#222]">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Aporte a Caja</span>
                          <strong className="text-sm font-black text-slate-800 dark:text-white">{pctVenta}%</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#222]">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Presencia Pedidos</span>
                          <strong className="text-sm font-black text-slate-800 dark:text-white">{platoSeleccionado.porcentajeComandas}%</strong>
                        </div>
                      </div>

                      <div className={`p-3.5 rounded-xl border ${colorClase}`}>
                        <strong className="block text-sm font-black mb-1">{tituloVeredicto}</strong>
                        <p className="leading-relaxed">{explicacionVeredicto}</p>
                      </div>
                    </div>
                  )
                })()}

                {/* 3. RESPUESTA: PROMO ESTRATÉGICA SEGÚN PRODUCTO */}
                {preguntaPlatoActiva === 'promo' && (() => {
                  const cuad = platoSeleccionado.cuadrante
                  let propuestaPromo = ''

                  if (cuad === 'caballo') {
                    propuestaPromo = `Combo Potenciador: Al ser un plato muy pedido pero de ticket contenido, armá un "Combo ${platoSeleccionado.nombre} + Bebida + Papas". Si el plato vale ${formatearPrecio(platoSeleccionado.precioPromedio)}, vendé el combo a ${formatearPrecio(platoSeleccionado.precioPromedio + 3200)}. Ganás $ 3.200 más por comanda entregando insumos de costo mínimo.`
                  } else if (cuad === 'rompecabezas') {
                    const descSeguro = platoSeleccionado.rentabilidadReal?.descuentoSeguroPct || 15
                    propuestaPromo = `Promo Gancho de Horario Temprano: Lanzalo los días de semana entre las 20:30 y las 21:30 con un ${descSeguro}% de descuento para tentar a los clientes que buscan cenar temprano.`
                  } else if (cuad === 'estrella') {
                    propuestaPromo = `Pack Familiar sin descuento individual: Tu plato estrella no necesita rebajas de precio. Si querés empujarlo, armá un "Pack Parejas" o "Pack Amigos" (ej: 2 ${platoSeleccionado.nombre} + 1 gaseosa de 1.5L) para subir el ticket sin tocar el valor unitario.`
                  } else {
                    propuestaPromo = `Liquidación de insumos: Si decidís discontinuarlo, ponelo al 20% de descuento durante 7 días para agotar el stock existente de ingredientes antes de darlo de baja definitivo.`
                  }

                  return (
                    <div className="bg-white dark:bg-[#282828] p-4 rounded-2xl border border-slate-200/80 dark:border-[#383838] space-y-2.5 text-xs">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Sparkles size={16} />
                        <span>Estrategia de Promo Recomendada</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-[#222] p-3 rounded-xl border border-slate-100 dark:border-[#333]">
                        {propuestaPromo}
                      </p>
                      {platoSeleccionado.rentabilidadReal?.tieneCosto && (
                        <div className="flex items-center gap-2 text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                          <ShieldCheck size={14} className="shrink-0" />
                          <span>Descuento seguro calculado: Hasta {platoSeleccionado.rentabilidadReal.descuentoSeguroPct}% sin perder ganancia.</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

            </div>

            {/* Footer del Modal */}
            <div className="p-4 border-t border-slate-100 dark:border-[#333] bg-slate-50/80 dark:bg-[#282828] flex justify-end">
              <button
                onClick={() => setPlatoSeleccionado(null)}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cerrar diagnóstico
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL ¿CÓMO FUNCIONA LA MATRIZ? ──────────────────────────────────── */}
      {mostrarComoFunciona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-[#222] w-full max-w-lg rounded-3xl border border-slate-200 dark:border-[#3d3d3d] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-[#333] flex items-center justify-between bg-slate-50/60 dark:bg-[#282828]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-500">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    ¿Cómo funciona la Matriz de Menú?
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Metodología BCG adaptada a gastronomía real
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMostrarComoFunciona(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#333] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 space-y-4 text-xs text-slate-600 dark:text-slate-300 overflow-y-auto leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                <h4 className="font-black text-indigo-900 dark:text-indigo-300 text-xs mb-1">
                  1. ¿Cómo se calculan los cortes de los ejes?
                </h4>
                <p>
                  • <strong>Corte de volumen:</strong> Es el promedio exacto de unidades vendidas por plato en el período. Platos por encima son de <em>Alta Popularidad</em>; por debajo, de <em>Baja Popularidad</em>.
                </p>
                <p className="mt-1.5">
                  • <strong>Corte de ticket:</strong> Es la facturación total dividida la cantidad total de unidades vendidas (precio promedio ponderado). Platos con precio por encima son de <em>Alto Valor</em>; por debajo, de <em>Valor Moderado</em>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#282828] border border-slate-100 dark:border-[#383838]">
                <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs mb-1">
                  2. ¿Por qué usamos precio de venta y costo express?
                </h4>
                <p>
                  En lugar de obligarte a cargar recetas complicadas con gramos de sal o aceite, Chefsy cruza cuánto se vende cada plato con su precio para mostrarte al instante cuáles sostienen la facturación del local. Y con solo cargar el costo estimado en 5 segundos, te calcula la ganancia limpia exacta.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs">
                  3. Los 4 Cuadrantes en 10 segundos:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="font-extrabold text-amber-700 dark:text-amber-400 block mb-0.5">🌟 Platos Estrella</span>
                    Alta venta + Alto ticket. No tocarlos, proteger stock y no aplicar descuentos.
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <span className="font-extrabold text-blue-700 dark:text-blue-400 block mb-0.5">⚡ Caballos de Batalla</span>
                    Alta venta + Bajo ticket. Crear combos con bebida o papas para elevar el ticket.
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <span className="font-extrabold text-purple-700 dark:text-purple-400 block mb-0.5">🎯 Rompecabezas</span>
                    Baja venta + Alto ticket. Mejorar fotos y visibilidad antes de evaluar cambios.
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="font-extrabold text-rose-700 dark:text-rose-400 block mb-0.5">📦 Lastre / A Revisar</span>
                    Baja venta + Bajo ticket. Evaluar simplificar insumos o discontinuar.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-[#333] bg-slate-50/80 dark:bg-[#282828] flex justify-end">
              <button
                onClick={() => setMostrarComoFunciona(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black rounded-xl hover:bg-slate-800 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
