'use client'

// ─────────────────────────────────────────────────────
// components/impresion/ConfiguracionTipografia.tsx
// Editor de tipografía para comandas de cocina y tickets.
// Los valores se guardan en la configuración local del navegador
// y se envían al agente con el botón de sincronización.
// ─────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Columns3,
  Loader2,
  Printer,
  RotateCcw,
  Type,
} from 'lucide-react'
import {
  ConfiguracionImpresora,
  EVENTO_CONFIG_IMPRESORA,
  gestorImpresora,
} from '@/lib/impresion/impresoraTermica'
import {
  anchoColumnas,
  describirDocumento,
  dotsInterlineado,
  estiloVistaPrevia,
  LIMITES_TIPOGRAFIA,
  normalizarDocumento,
  TIPOGRAFIA_POR_DEFECTO,
  TipografiaDocumento,
} from '@/lib/impresion/tipografia'

type DocumentoActivo = 'comanda' | 'ticket'

interface Props {
  onAbrirSolucionador?: () => void
}

export default function ConfiguracionTipografia({ onAbrirSolucionador }: Props) {
  const [config, setConfig] = useState<ConfiguracionImpresora>(gestorImpresora.obtenerConfiguracion())
  const [documento, setDocumento] = useState<DocumentoActivo>('comanda')
  const [sincronizando, setSincronizando] = useState<'subir' | 'bajar' | null>(null)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    const actualizar = () => setConfig(gestorImpresora.obtenerConfiguracion())
    window.addEventListener(EVENTO_CONFIG_IMPRESORA, actualizar)
    return () => window.removeEventListener(EVENTO_CONFIG_IMPRESORA, actualizar)
  }, [])

  const tipografia = config.tipografia
  const actual = tipografia[documento]
  const columnas = anchoColumnas(config.anchoMm, actual)
  const preview = estiloVistaPrevia(actual, config.anchoMm)

  const cambiar = (cambios: Partial<TipografiaDocumento>) => {
    const actualizado = normalizarDocumento({ ...actual, ...cambios }, actual)
    gestorImpresora.guardarConfiguracion({
      tipografia: { ...tipografia, [documento]: actualizado },
    })
    setConfig(gestorImpresora.obtenerConfiguracion())
    setFeedback(null)
  }

  const restaurar = () => {
    gestorImpresora.guardarConfiguracion({
      tipografia: { ...tipografia, [documento]: TIPOGRAFIA_POR_DEFECTO[documento] },
    })
    setConfig(gestorImpresora.obtenerConfiguracion())
    setFeedback({ tipo: 'ok', texto: `Tipografía de ${documento} restaurada a los valores por defecto.` })
  }

  const sincronizar = async () => {
    if (!gestorImpresora.tieneAgenteConfigurado()) {
      setFeedback({
        tipo: 'error',
        texto: 'Activá el agente local y completá la URL y el token antes de sincronizar.',
      })
      return
    }

    setSincronizando('subir')
    setFeedback(null)
    try {
      const resultado = await gestorImpresora.sincronizarTipografia()
      if (resultado.ok) {
        setFeedback({
          tipo: 'ok',
          texto: `Tipografía sincronizada con el agente${resultado.version ? ` (v${resultado.version})` : ''}.`,
        })
      } else {
        setFeedback({ tipo: 'error', texto: resultado.error || 'No se pudo sincronizar con el agente.' })
      }
    } finally {
      setSincronizando(null)
    }
  }

  const traer = async () => {
    if (!gestorImpresora.tieneAgenteConfigurado()) {
      setFeedback({
        tipo: 'error',
        texto: 'Activá el agente local y completá la URL y el token para traer la configuración.',
      })
      return
    }

    setSincronizando('bajar')
    setFeedback(null)
    try {
      const resultado = await gestorImpresora.traerTipografiaDelAgente()
      if (resultado.ok) {
        setConfig(gestorImpresora.obtenerConfiguracion())
        setFeedback({ tipo: 'ok', texto: 'Tipografía importada desde el agente.' })
      } else {
        setFeedback({ tipo: 'error', texto: resultado.error || 'No se pudo leer la tipografía del agente.' })
      }
    } finally {
      setSincronizando(null)
    }
  }

  return (
    <div
      id="tipografia-impresion"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
    >
      <div className="flex flex-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-4">
        <div className="flex items-start gap-3">
          <span className="p-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl shrink-0">
            <Type size={18} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Tipografía de comandas y tickets
            </h2>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
              Fuente, tamaño, interletrado e interlineado para la comandera de cocina y el ticket del cliente.
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1 rounded-full shrink-0">
          <Columns3 size={11} /> {columnas} columnas
        </span>
      </div>

      {/* Selector de documento */}
      <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto sm:inline-flex">
        <button
          type="button"
          onClick={() => setDocumento('comanda')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
            documento === 'comanda'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Comanda de cocina
        </button>
        <button
          type="button"
          onClick={() => setDocumento('ticket')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
            documento === 'ticket'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Ticket del cliente
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
        {/* Controles */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Fuente
            </p>
            <div className="grid grid-cols-2 gap-2">
              <BotonFuente
                activo={actual.fuente === 'A'}
                titulo="A · Estándar"
                detalle="12×24 dots, más legible"
                onClick={() => cambiar({ fuente: 'A' })}
              />
              <BotonFuente
                activo={actual.fuente === 'B'}
                titulo="B · Compacta"
                detalle="9×17 dots, entra más texto"
                onClick={() => cambiar({ fuente: 'B' })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ControlRango
              etiqueta="Tamaño horizontal"
              valor={actual.ancho}
              sufijo="x"
              min={LIMITES_TIPOGRAFIA.ancho.min}
              max={LIMITES_TIPOGRAFIA.ancho.max}
              onChange={(valor) => cambiar({ ancho: valor })}
              ayuda="Multiplica el ancho de cada letra. Más ancho = menos columnas."
            />
            <ControlRango
              etiqueta="Tamaño vertical"
              valor={actual.alto}
              sufijo="x"
              min={LIMITES_TIPOGRAFIA.alto.min}
              max={LIMITES_TIPOGRAFIA.alto.max}
              onChange={(valor) => cambiar({ alto: valor })}
              ayuda="Multiplica la altura de cada letra."
            />
            <ControlRango
              etiqueta="Interletrado"
              valor={actual.interletrado}
              sufijo={actual.interletrado === 1 ? ' dot' : ' dots'}
              min={LIMITES_TIPOGRAFIA.interletrado.min}
              max={LIMITES_TIPOGRAFIA.interletrado.max}
              onChange={(valor) => cambiar({ interletrado: valor })}
              ayuda="Espacio extra entre letras. 0 = apretado."
            />
            <ControlRango
              etiqueta="Interlineado"
              valor={actual.interlineado}
              sufijo={` dots (+${dotsInterlineado(actual)} total)`}
              min={LIMITES_TIPOGRAFIA.interlineado.min}
              max={LIMITES_TIPOGRAFIA.interlineado.max}
              onChange={(valor) => cambiar({ interlineado: valor })}
              ayuda="Espacio extra entre líneas."
            />
          </div>

          <ControlRango
            etiqueta="Espacio entre ítems"
            valor={actual.espacioItems}
            sufijo={actual.espacioItems === 1 ? ' línea' : ' líneas'}
            min={LIMITES_TIPOGRAFIA.espacioItems.min}
            max={LIMITES_TIPOGRAFIA.espacioItems.max}
            onChange={(valor) => cambiar({ espacioItems: valor })}
            ayuda="Líneas en blanco después de cada producto del pedido."
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={sincronizar}
              disabled={sincronizando !== null}
              className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold py-2.5 px-4 rounded-xl transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {sincronizando === 'subir' ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
              Sincronizar con el agente
            </button>
            <button
              type="button"
              onClick={traer}
              disabled={sincronizando !== null}
              className="inline-flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {sincronizando === 'bajar' ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={14} />}
              Traer del agente
            </button>
            <button
              type="button"
              onClick={restaurar}
              className="inline-flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              Restaurar
            </button>
          </div>

          {feedback && (
            <div
              className={`flex items-start gap-2 p-3 rounded-xl border text-[11px] font-bold ${
                feedback.tipo === 'ok'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
              }`}
            >
              {feedback.tipo === 'ok' ? (
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              )}
              <span>{feedback.texto}</span>
            </div>
          )}

          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {describirDocumento(actual, config.anchoMm)}. Los cambios se guardan en este navegador; usá
            “Sincronizar con el agente” para dejarlos también en la PC de la comandera.
          </p>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
            Aplica a la impresión térmica ESC/POS (agente local o impresora directa). El modo navegador
            usa su propio formato.
          </p>

          {onAbrirSolucionador && (
            <button
              type="button"
              onClick={onAbrirSolucionador}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              <Printer size={13} />
              ¿No imprime? Abrir el solucionador de problemas
            </button>
          )}
        </div>

        {/* Vista previa */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Vista previa aproximada
          </span>
          <div
            className="rounded-lg bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-slate-300 px-3 py-3 overflow-hidden"
            style={{ width: preview.width }}
          >
            <div style={{ ...preview }}>
              {documento === 'comanda' ? (
                <VistaComanda columnas={columnas} />
              ) : (
                <VistaTicket columnas={columnas} />
              )}
            </div>
          </div>
          <span className="text-[10px] text-slate-400">
            Papel {config.anchoMm} mm · {columnas} columnas reales
          </span>
        </div>
      </div>
    </div>
  )
}

function BotonFuente({
  activo,
  titulo,
  detalle,
  onClick,
}: {
  activo: boolean
  titulo: string
  detalle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
        activo
          ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/40 dark:border-violet-700'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <span className={`block text-xs font-black ${activo ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'}`}>
        {titulo}
      </span>
      <span className="block text-[10px] text-slate-400 mt-0.5">{detalle}</span>
    </button>
  )
}

function ControlRango({
  etiqueta,
  valor,
  sufijo,
  min,
  max,
  onChange,
  ayuda,
}: {
  etiqueta: string
  valor: number
  sufijo: string
  min: number
  max: number
  onChange: (valor: number) => void
  ayuda: string
}) {
  return (
    <label className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {etiqueta}
        </span>
        <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">{valor}{sufijo}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={valor}
        onChange={(evento) => onChange(Number(evento.target.value))}
        className="mt-2 w-full accent-violet-600 cursor-pointer"
      />
      <span className="block text-[10px] text-slate-400 mt-1 leading-snug">{ayuda}</span>
    </label>
  )
}

function Separador({ columnas }: { columnas: number }) {
  return <div className="whitespace-pre overflow-hidden">{'-'.repeat(columnas)}</div>
}

function VistaComanda({ columnas }: { columnas: number }) {
  return (
    <div>
      <div className="text-center font-black">COCINA</div>
      <div className="text-center">22:41</div>
      <div className="text-center font-bold">Lautaro</div>
      <Separador columnas={columnas} />
      <div className="font-bold">2x Zapping Chefsy</div>
      <div className="font-bold">1x Papas con cheddar</div>
      <div className="opacity-70">   + Sin panceta</div>
      <div className="h-[1em]" />
      <Separador columnas={columnas} />
      <div className="font-bold">NOTA: SIN CEBOLLA</div>
      <Separador columnas={columnas} />
      <div className="text-center font-bold">[ DELIVERY ]</div>
    </div>
  )
}

function VistaTicket({ columnas }: { columnas: number }) {
  return (
    <div>
      <div className="text-center font-black">CHEFSY</div>
      <div className="text-center">Ticket de Pedido</div>
      <div className="text-center">Pedido #A1B2C3 · 22:41</div>
      <Separador columnas={columnas} />
      <div className="flex justify-between gap-2">
        <span>1x Zapping Comun</span>
        <span>$ 11.000</span>
      </div>
      <div className="flex justify-between gap-2">
        <span>2x Papas cheddar</span>
        <span>$ 12.000</span>
      </div>
      <Separador columnas={columnas} />
      <div className="flex justify-between gap-2 font-bold">
        <span>TOTAL:</span>
        <span>$ 23.000</span>
      </div>
      <div className="flex justify-between gap-2">
        <span>Pago:</span>
        <span>Efectivo</span>
      </div>
      <Separador columnas={columnas} />
      <div className="text-center">¡Gracias por su compra!</div>
    </div>
  )
}
