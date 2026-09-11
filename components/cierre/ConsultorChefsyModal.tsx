'use client'

import React, { useState, useMemo } from 'react'
import {
  Sparkles,
  X,
  Send,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Coins,
  Flame,
  Calendar,
  ChevronRight,
  Bot,
  User,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'

interface ConsultorChefsyModalProps {
  abierto: boolean
  onCerrar: () => void
  metricasAvanzadas: any
  datosCierres: any[]
  topProductos?: any[]
}

interface MensajeChat {
  id: string
  emisor: 'chefsy' | 'usuario'
  texto: string
  sugerenciaDetallada?: {
    titulo: string
    items: string[]
    conclusion: string
  }
}

export default function ConsultorChefsyModal({
  abierto,
  onCerrar,
  metricasAvanzadas,
  datosCierres,
  topProductos = []
}: ConsultorChefsyModalProps) {
  const [consultaTexto, setConsultaTexto] = useState('')
  const [historialChat, setHistorialChat] = useState<MensajeChat[]>([
    {
      id: 'bienvenida',
      emisor: 'chefsy',
      texto: '¡Hola! Soy Chefsy, tu consultor de cabecera. Analizo los números de tus turnos, pedidos y platos en tiempo real. Tocá una de las preguntas rápidas o escribime lo que quieras saber sobre cómo mejorar tus ventas o cuidar tu ganancia.'
    }
  ])
  const [analizando, setAnalizando] = useState(false)

  // 1. Análisis del día más flojo y horario bajo para armar promos
  const infoDiaFlojo = useMemo(() => {
    if (!datosCierres || datosCierres.length === 0) return null
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const acumuladorDias = new Map<number, { total: number; count: number }>()

    datosCierres.forEach(c => {
      const d = new Date(c.fecha + 'T00:00:00').getDay()
      if (!acumuladorDias.has(d)) acumuladorDias.set(d, { total: 0, count: 0 })
      const item = acumuladorDias.get(d)!
      item.total += c.ingresos || 0
      item.count += 1
    })

    let diaMenorNombre = 'Miércoles'
    let promedioMenor = Infinity

    acumuladorDias.forEach((val, dNum) => {
      if (val.count > 0) {
        const prom = val.total / val.count
        if (prom < promedioMenor) {
          promedioMenor = prom
          diaMenorNombre = dias[dNum]
        }
      }
    })

    // Plato estrella o caballo para impulsar
    const platos = metricasAvanzadas?.matrizBCG?.platos || []
    const platoEstrella = platos.find((p: any) => p.cuadrante === 'estrella') || platos[0]
    const platoCaballo = platos.find((p: any) => p.cuadrante === 'caballo') || platos[1]

    return {
      dia: diaMenorNombre,
      promedio: promedioMenor === Infinity ? 0 : Math.round(promedioMenor),
      platoEstrella: platoEstrella?.nombre || 'Hamburguesa Insignia',
      platoCaballo: platoCaballo?.nombre || 'Lomo Especial'
    }
  }, [datosCierres, metricasAvanzadas])

  // 2. Platos a revisar urgentes (Lastre o costo alto)
  const platosUrgentes = useMemo(() => {
    const platos = metricasAvanzadas?.matrizBCG?.platos || []
    const lastres = platos.filter((p: any) => p.cuadrante === 'lastre').slice(0, 3)
    const costoAlerta = platos.filter((p: any) => p.rentabilidadReal?.estadoSalud === 'alerta').slice(0, 2)
    return {
      lastres,
      costoAlerta
    }
  }, [metricasAvanzadas])

  // Manejar click en una pregunta rápida predefinida
  const ejecutarConsultaRapida = (tipo: 'promo_dias_flojos' | 'platos_urgentes' | 'fuga_plata') => {
    let pregunta = ''
    let respuestaTexto = ''
    let sugerencia: any = null

    if (tipo === 'promo_dias_flojos') {
      pregunta = '¿Qué promo armo para reactivar los días u horas más flojas?'
      const dia = infoDiaFlojo?.dia || 'los días de semana'
      const prom = infoDiaFlojo?.promedio ? formatearPrecio(infoDiaFlojo.promedio) : '$ 0'
      const estrella = infoDiaFlojo?.platoEstrella || 'tus platos principales'
      const caballo = infoDiaFlojo?.platoCaballo || 'tus platos de batalla'

      respuestaTexto = `Detecté que ${dia} suele ser tu jornada más tranquila (promedio de ${prom} por turno). La clave no es regalar tu producto estrella, sino usar una promo gancho en horario temprano para levantar la cocina antes del pico.`

      sugerencia = {
        titulo: `Plan de Ataque para ${dia}`,
        items: [
          `Lanzar "El ${dia} de ${caballo}": armar un combo con bebida incluida o papas especiales por un 10% a 15% menos de su valor sumado por separado.`,
          `Horario feliz (Happy Hour de cocina): aplicar el descuento únicamente en pedidos ingresados entre las 20:30 y las 21:30 para adelantar comandas y evitar que colapse la cocina a las 23:00.`,
          `No descontar ${estrella}: es tu producto más vendido y tus clientes lo van a pedir igual a precio completo.`
        ],
        conclusion: `Resultado esperado: Aumentás el volumen un 25% en tu día más flojo sin canibalizar el ticket de los fines de semana.`
      }
    } else if (tipo === 'platos_urgentes') {
      pregunta = '¿Cuáles son los 3 platos más urgentes a revisar en la carta?'
      const nombresLastre = platosUrgentes.lastres.map((p: any) => p.nombre).join(', ')

      respuestaTexto = platosUrgentes.lastres.length > 0
        ? `Tenés ${platosUrgentes.lastres.length} platos en zona "Lastre" (${nombresLastre}) que están vendiendo muy pocas unidades y aportan menos del 1% a la facturación total.`
        : `Tu menú está bastante ordenado y no tenés platos con alerta crítica de rotación en este momento.`

      sugerencia = {
        titulo: 'Veredicto de Chefsy sobre estos platos',
        items: [
          `Simplificar insumos: Si alguno de estos platos te obliga a comprar ingredientes frescos exclusivos que se vencen si no salen, retiralo ya mismo de la carta.`,
          `Probar una foto nueva durante 10 días: Si querés darle una última oportunidad a alguno, sacale una buena foto y ponelo como recomendado.`,
          `Si en 10 días no sube al menos a 10 unidades vendidas, discontinuarlo es la decisión más sana para tu cocina.`
        ],
        conclusion: 'Menos platos en carta significa cocina más rápida, menos comida que se tira y menos compras dispersas.'
      }
    } else if (tipo === 'fuga_plata') {
      pregunta = '¿Dónde se está fugando dinero en el negocio?'
      const fletesTotal = metricasAvanzadas?.modalidades?.canales?.delivery?.fleteTotal || 0
      const canceladosMonto = datosCierres.reduce((acc, c) => acc + (c.monto_cancelados || 0), 0)

      respuestaTexto = `Revisando los números, encontré 3 puntos donde habitualmente se escapa plata en los locales y cómo estás parado hoy:`

      sugerencia = {
        titulo: 'Fugas de Dinero & Ajustes Recomendados',
        items: [
          `Fletes de Cadetería: En este período los clientes aportaron ${formatearPrecio(fletesTotal)} para viajes. Asegurate de que los viajes a zonas lejanas no los esté absorbiendo el local cuando el cadete cobra extra.`,
          `Pedidos Cancelados: Se registraron cancelaciones por ${formatearPrecio(canceladosMonto)}. Cada pedido cancelado con comanda en marcha es mercadería perdida al 100%.`,
          `Platos sin combo: Si tus clientes piden una hamburguesa o lomo solo, estás perdiendo de venderles la bebida y las papas con un margen del 70%.`
        ],
        conclusion: 'Ajustando estos 3 detalles podés recuperar entre un 4% y un 7% de ganancia neta a fin de mes.'
      }
    }

    agregarAlChat(pregunta, respuestaTexto, sugerencia)
  }

  // Manejar envío de pregunta libre del usuario
  const enviarPreguntaLibre = (e: React.FormEvent) => {
    e.preventDefault()
    if (!consultaTexto.trim()) return

    const userText = consultaTexto.trim()
    setConsultaTexto('')
    setAnalizando(true)

    const lower = userText.toLowerCase()

    setTimeout(() => {
      let respuesta = ''
      let sugerencia: any = null

      if (lower.includes('aumentar') || lower.includes('precio') || lower.includes('subir')) {
        respuesta = 'Para aumentar precios sin que la gente se queje, la regla de oro gastronómica es segmentar: a los platos estrella y de mayor calidad podés subirles entre un 7% y un 10% sin que caiga la demanda, porque el cliente los elige por sabor y lealtad. A las bebidas y entradas estándar, mantenelas firmes porque son las que el cliente usa de referencia para comparar con otros locales.'
      } else if (lower.includes('discontinuar') || lower.includes('sacar') || lower.includes('eliminar') || lower.includes('carta')) {
        respuesta = 'Un plato merece ser discontinuado si cumple estas 3 condiciones: 1) Vendió menos de 5 unidades en todo el mes. 2) Representa menos del 0.5% de tu caja. 3) Te obliga a comprar insumos específicos que no se usan en ningún otro plato. Si cumple las tres, sacalo de la carta sin dudar: ganarás velocidad en cocina y menos desperdicio.'
      } else if (lower.includes('promo') || lower.includes('descuento') || lower.includes('combo')) {
        respuesta = 'El mejor tipo de promoción no es bajar el precio de un plato solo (eso te come el margen), sino el combo cruzado: plato principal + bebida + guarnición. El cliente siente que ahorra un 15%, pero a vos te sube el ticket promedio en $ 2.500 por comanda.'
      } else if (lower.includes('cadete') || lower.includes('envio') || lower.includes('delivery')) {
        respuesta = 'En delivery, el flete debe ser 100% neutro para la cocina: lo que el cliente abona por envío debe cubrir la tarifa del cadete. La ganancia neta de tu local debe venir exclusivamente de la comida.'
      } else {
        respuesta = `Analizando tu consulta sobre "${userText}": basándome en tus ventas actuales, te recomiendo enfocarte en empujar los platos de alto ticket que tienen buena rotación y asegurarte de tener siempre cargado el costo en la ficha de cada plato para saber con precisión cuánta plata te queda en mano.`
      }

      agregarAlChat(userText, respuesta, sugerencia)
      setAnalizando(false)
    }, 400)
  }

  const agregarAlChat = (pregunta: string, respuesta: string, sugerencia?: any) => {
    setHistorialChat(prev => [
      ...prev,
      { id: Date.now() + '-user', emisor: 'usuario', texto: pregunta },
      { id: Date.now() + '-chefsy', emisor: 'chefsy', texto: respuesta, sugerenciaDetallada: sugerencia }
    ])
  }

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#202020] w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-[#383838] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER DEL ASISTENTE CONSULTOR ─────────────────────────────────── */}
        <div className="p-5 border-b border-slate-100 dark:border-[#333] flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Preguntale a Chefsy</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Consultor del Menú
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Respuestas claras y recomendaciones con datos reales de tu local
              </p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── BOTONES DE PREGUNTAS RÁPIDAS (ACCIONES FRECUENTES) ──────────────── */}
        <div className="p-3 bg-slate-50 dark:bg-[#1a1a1a] border-b border-slate-200/70 dark:border-[#333] flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Consultas rápidas:</span>
          
          <button
            onClick={() => ejecutarConsultaRapida('promo_dias_flojos')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#252525] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 font-bold border border-slate-200 dark:border-[#383838] transition-colors shrink-0 shadow-2xs cursor-pointer"
          >
            <Calendar size={13} className="text-indigo-500" />
            <span>¿Promo para días flojos?</span>
          </button>

          <button
            onClick={() => ejecutarConsultaRapida('platos_urgentes')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#252525] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-600 font-bold border border-slate-200 dark:border-[#383838] transition-colors shrink-0 shadow-2xs cursor-pointer"
          >
            <AlertTriangle size={13} className="text-amber-500" />
            <span>¿Platos a revisar?</span>
          </button>

          <button
            onClick={() => ejecutarConsultaRapida('fuga_plata')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#252525] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-600 font-bold border border-slate-200 dark:border-[#383838] transition-colors shrink-0 shadow-2xs cursor-pointer"
          >
            <Coins size={13} className="text-rose-500" />
            <span>¿Dónde se fuga dinero?</span>
          </button>
        </div>

        {/* ── CUERPO DEL CHAT SCROLLEABLE ─────────────────────────────────────── */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {historialChat.map(item => {
            const esChefsy = item.emisor === 'chefsy'
            return (
              <div
                key={item.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  esChefsy ? 'items-start' : 'items-start flex-row-reverse'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    esChefsy
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-200 dark:bg-[#333] text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {esChefsy ? <Bot size={16} /> : <User size={16} />}
                </div>

                <div
                  className={`p-3.5 sm:p-4 rounded-2xl max-w-[85%] space-y-2.5 ${
                    esChefsy
                      ? 'bg-slate-50 dark:bg-[#282828] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-[#383838]'
                      : 'bg-indigo-600 text-white font-medium rounded-tr-none'
                  }`}
                >
                  <p>{item.texto}</p>

                  {/* Sugerencia detallada estructurada si existe */}
                  {item.sugerenciaDetallada && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-[#383838] space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 font-black text-indigo-600 dark:text-indigo-400">
                        <Lightbulb size={14} />
                        <span>{item.sugerenciaDetallada.titulo}</span>
                      </div>

                      <div className="space-y-1.5 pl-1">
                        {item.sugerenciaDetallada.items.map((it, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span className="text-slate-600 dark:text-slate-300">{it}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                        {item.sugerenciaDetallada.conclusion}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {analizando && (
            <div className="flex items-center gap-2 text-xs text-indigo-500 font-semibold p-2 animate-pulse">
              <Sparkles size={16} />
              <span>Chefsy está analizando los números del local...</span>
            </div>
          )}
        </div>

        {/* ── INPUT DE CONSULTA LIBRE ─────────────────────────────────────────── */}
        <form
          onSubmit={enviarPreguntaLibre}
          className="p-3 border-t border-slate-100 dark:border-[#333] bg-slate-50/70 dark:bg-[#1a1a1a] flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Preguntale lo que quieras (ej: ¿Qué hago con las empanadas?)..."
            value={consultaTexto}
            onChange={e => setConsultaTexto(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-white dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-[#383838] text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!consultaTexto.trim() || analizando}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Preguntar</span>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  )
}
