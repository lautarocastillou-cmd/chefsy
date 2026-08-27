'use client'

import React, { useState, useEffect, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { 
  Printer, 
  Sparkles, 
  X, 
  QrCode, 
  Clock,
  FileText,
  Type
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface PlantillaPromo {
  id: string
  nombre: string
  icono: string
  titulo: string
  mensaje: string
  incluirQr: boolean
  qrUrl: string
  qrTexto: string
  validezTipo: 'sin_vencimiento' | 'hoy' | 'dias'
  validezDias: number
  letraChica: string
}

interface ConfigTicketPromo {
  titulo: string
  mensaje: string
  incluirQr: boolean
  qrUrl: string
  qrTexto: string
  validezTipo: 'sin_vencimiento' | 'hoy' | 'dias'
  validezDias: number
  letraChica: string
  anchoPapel: '80mm' | '58mm'
  copias: number
  tamanoFuente?: 'normal' | 'grande' | 'extra_grande'
}

const CONFIG_POR_DEFECTO: ConfigTicketPromo = {
  titulo: '¡REGALO EXCLUSIVO!',
  mensaje: 'Presentá este ticket en tu próximo pedido y llevate un 15% DE DESCUENTO.',
  incluirQr: true,
  qrUrl: 'https://chefsy.xyz/',
  qrTexto: 'Pedí online en chefsy.xyz',
  validezTipo: 'dias',
  validezDias: 7,
  letraChica: 'Válido para consumo en el local o delivery.',
  anchoPapel: '80mm',
  copias: 1,
  tamanoFuente: 'normal'
}

const PLANTILLAS: PlantillaPromo[] = [
  {
    id: 'descuento_7dias',
    nombre: '15% OFF (7 Días)',
    icono: '🎁',
    titulo: '¡REGALO EXCLUSIVO!',
    mensaje: 'Presentá este ticket en tu próximo pedido y llevate un 15% DE DESCUENTO.',
    incluirQr: true,
    qrUrl: 'https://chefsy.xyz/',
    qrTexto: 'Pedí online en chefsy.xyz',
    validezTipo: 'dias',
    validezDias: 7,
    letraChica: 'Válido para consumo en el local o delivery.'
  },
  {
    id: 'descuento_14dias',
    nombre: '10% OFF (14 Días)',
    icono: '🎟️',
    titulo: '¡10% OFF PROMO!',
    mensaje: 'Mostrá este ticket en tu próxima visita y disfrutá de un 10% de descuento en tu cuenta.',
    incluirQr: true,
    qrUrl: 'https://chefsy.xyz/',
    qrTexto: 'Pedí online en chefsy.xyz',
    validezTipo: 'dias',
    validezDias: 14,
    letraChica: '1 canje por ticket. No acumulable.'
  },
  {
    id: 'instagram',
    nombre: 'Seguinos en Instagram',
    icono: '📸',
    titulo: 'SEGUINOS EN INSTAGRAM',
    mensaje: 'Subí una foto de tu pedido, etiquetanos en tus historias y participá por cenas gratis cada semana.',
    incluirQr: true,
    qrUrl: 'https://instagram.com/chefsy_fastfood_',
    qrTexto: '@chefsy_fastfood_ · Seguinos en Instagram',
    validezTipo: 'sin_vencimiento',
    validezDias: 0,
    letraChica: 'Sorteos todos los fines de mes.'
  },
  {
    id: 'resena',
    nombre: 'Reseña Google Maps',
    icono: '⭐',
    titulo: '¿TE GUSTÓ NUESTRA COMIDA?',
    mensaje: 'Dejanos una reseña de 5 estrellas en Google Maps y presentá este cupón para canjear una porción de papas gratis.',
    incluirQr: true,
    qrUrl: 'https://maps.app.goo.gl/By5qrWayRiW2qQu26',
    qrTexto: 'Escaneá para opinar en Google Maps',
    validezTipo: 'dias',
    validezDias: 30,
    letraChica: 'Mostrá la reseña al mozo o por WhatsApp para validar.'
  },
  {
    id: 'whatsapp',
    nombre: 'WhatsApp Directo',
    icono: '💬',
    titulo: 'PEDÍ MÁS RÁPIDO',
    mensaje: 'Agendá nuestro WhatsApp para acceder a promociones relámpago y menú diario exclusivo.',
    incluirQr: true,
    qrUrl: 'https://chefsy.xyz/whatsapp',
    qrTexto: 'Escaneá para chatear directo',
    validezTipo: 'sin_vencimiento',
    validezDias: 0,
    letraChica: 'Atención personalizada todos los días.'
  },
  {
    id: 'personalizado',
    nombre: 'Promo Solo Hoy / Express',
    icono: '⚡',
    titulo: '¡PROMO DEL DÍA!',
    mensaje: '2x1 en postres y bebidas hasta el cierre del servicio.',
    incluirQr: false,
    qrUrl: '',
    qrTexto: '',
    validezTipo: 'hoy',
    validezDias: 0,
    letraChica: 'Hasta agotar stock del día.'
  }
]

function obtenerConfigGuardada(): ConfigTicketPromo {
  if (typeof window === 'undefined') return CONFIG_POR_DEFECTO
  try {
    const raw = localStorage.getItem('chefsy_promo_ticket_config')
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...CONFIG_POR_DEFECTO, ...parsed }
    }
  } catch {
    // silencioso
  }
  return CONFIG_POR_DEFECTO
}

function calcularTextoValidez(tipo: 'sin_vencimiento' | 'hoy' | 'dias', dias: number): string {
  if (tipo === 'sin_vencimiento') return ''
  const hoy = new Date()
  if (tipo === 'hoy') {
    const fechaStr = hoy.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    return `Válido solo por hoy (${fechaStr})`
  }
  if (tipo === 'dias') {
    const fechaVenc = new Date(hoy.getTime() + dias * 24 * 60 * 60 * 1000)
    const fechaStr = fechaVenc.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    if (dias === 1) return `Válido por 24 hs (Hasta mañana ${fechaStr})`
    if (dias === 7) return `Válido por 7 días (Hasta el ${fechaStr})`
    if (dias === 14) return `Válido por 14 días (Hasta el ${fechaStr})`
    if (dias === 30) return `Válido por 30 días (Hasta el ${fechaStr})`
    return `Válido por ${dias} días (Hasta el ${fechaStr})`
  }
  return ''
}

// ── Componente QR Memoizado ultra-eficiente ──
const QrPreview = memo(function QrPreview({ url, texto }: { url: string; texto: string }) {
  if (!url) return null
  return (
    <div className="my-2 flex flex-col items-center">
      <div className="p-1 bg-white border border-slate-300 rounded inline-block">
        <QRCodeCanvas
          id="qr-promo-preview-canvas"
          value={url}
          size={110}
          level="M"
          marginSize={1}
        />
      </div>
      {texto && (
        <div className="text-[8px] font-bold mt-1 text-slate-700 max-w-[200px] truncate">
          {texto}
        </div>
      )}
    </div>
  )
})

// ── Grid de Plantillas Memoizado ──
const PlantillasGrid = memo(function PlantillasGrid({ onSelect }: { onSelect: (p: PlantillaPromo) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
        <Sparkles size={13} className="text-amber-500" />
        <span>Plantillas Rápidas (1 Clic)</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PLANTILLAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 group cursor-pointer"
          >
            <span className="text-base shrink-0">{p.icono}</span>
            <span className="truncate leading-tight text-[11px]">{p.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  )
})

// ── Modal Aislado y Optimizado ──
function ModalPromociones({ onClose }: { onClose: () => void }) {
  // Inicialización directa y sincrónica desde localStorage
  const [configInicial] = useState<ConfigTicketPromo>(obtenerConfigGuardada)

  const [titulo, setTitulo] = useState(configInicial.titulo)
  const [mensaje, setMensaje] = useState(configInicial.mensaje)
  const [incluirQr, setIncluirQr] = useState(configInicial.incluirQr)
  const [qrUrl, setQrUrl] = useState(configInicial.qrUrl)
  const [qrTexto, setQrTexto] = useState(configInicial.qrTexto)
  const [validezTipo, setValidezTipo] = useState<'sin_vencimiento' | 'hoy' | 'dias'>(configInicial.validezTipo || 'dias')
  const [validezDias, setValidezDias] = useState<number>(configInicial.validezDias || 7)
  const [letraChica, setLetraChica] = useState(configInicial.letraChica)
  const [anchoPapel, setAnchoPapel] = useState<'80mm' | '58mm'>(configInicial.anchoPapel)
  const [copias, setCopias] = useState<number>(configInicial.copias)
  const [tamanoFuente, setTamanoFuente] = useState<'normal' | 'grande' | 'extra_grande'>(configInicial.tamanoFuente || 'normal')
  const [imprimiendo, setImprimiendo] = useState(false)

  // Guardar automáticamente en localStorage ante cualquier cambio
  useEffect(() => {
    try {
      const nuevaConfig: ConfigTicketPromo = {
        titulo,
        mensaje,
        incluirQr,
        qrUrl,
        qrTexto,
        validezTipo,
        validezDias,
        letraChica,
        anchoPapel,
        copias,
        tamanoFuente
      }
      localStorage.setItem('chefsy_promo_ticket_config', JSON.stringify(nuevaConfig))
    } catch {
      // silencioso
    }
  }, [titulo, mensaje, incluirQr, qrUrl, qrTexto, validezTipo, validezDias, letraChica, anchoPapel, copias, tamanoFuente])

  // Debounce simple para el QR URL
  const [qrUrlDebounced, setQrUrlDebounced] = useState(qrUrl)
  useEffect(() => {
    const handler = setTimeout(() => {
      setQrUrlDebounced(qrUrl)
    }, 200)
    return () => clearTimeout(handler)
  }, [qrUrl])

  const aplicarPlantilla = useCallback((p: PlantillaPromo) => {
    setTitulo(p.titulo)
    setMensaje(p.mensaje)
    setIncluirQr(p.incluirQr)
    setQrUrl(p.qrUrl)
    setQrTexto(p.qrTexto)
    setValidezTipo(p.validezTipo)
    setValidezDias(p.validezDias)
    setLetraChica(p.letraChica)
    toast.success(`Plantilla "${p.nombre}" cargada`)
  }, [])

  const textoValidez = calcularTextoValidez(validezTipo, validezDias)

  const imprimirTicket = () => {
    setImprimiendo(true)

    // Obtener imagen PNG del canvas QR en el preview
    let qrDataUrl = ''
    if (incluirQr && qrUrl.trim()) {
      const canvas = document.getElementById('qr-promo-preview-canvas') as HTMLCanvasElement
      if (canvas) {
        qrDataUrl = canvas.toDataURL('image/png')
      }
    }

    const fechaHora = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

    // Escalar tamaños de fuente según selección
    const factorEscala = tamanoFuente === 'extra_grande' ? 1.4 : tamanoFuente === 'grande' ? 1.2 : 1.0

    const fBase = anchoPapel === '58mm' ? Math.round(12 * factorEscala) : Math.round(14 * factorEscala)
    const fTitulo = anchoPapel === '58mm' ? Math.round(15 * factorEscala) : Math.round(17 * factorEscala)
    const fMensaje = anchoPapel === '58mm' ? Math.round(12 * factorEscala) : Math.round(13.5 * factorEscala)
    const fValidez = anchoPapel === '58mm' ? Math.round(10 * factorEscala) : Math.round(11.5 * factorEscala)
    const fQrCaption = anchoPapel === '58mm' ? Math.round(9.5 * factorEscala) : Math.round(10.5 * factorEscala)
    const fLetraChica = anchoPapel === '58mm' ? Math.round(9 * factorEscala) : Math.round(9.5 * factorEscala)
    const fFooter = anchoPapel === '58mm' ? Math.round(9.5 * factorEscala) : Math.round(10.5 * factorEscala)
    const fFecha = anchoPapel === '58mm' ? Math.round(9 * factorEscala) : Math.round(9.5 * factorEscala)

    const ticketSingleHtml = `
      <div class="ticket-wrapper">
        <div class="header">
          <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo-chefsy.png" class="brand-logo" alt="CHEFSY" />
          <div class="fecha">${fechaHora}</div>
        </div>

        <div class="sep"></div>

        <div class="titulo-promo">${titulo.toUpperCase()}</div>

        <div class="mensaje">${mensaje.replace(/\n/g, '<br/>')}</div>

        ${textoValidez ? `
          <div class="validez-box">⏳ ${textoValidez.toUpperCase()}</div>
        ` : ''}

        ${incluirQr && qrDataUrl ? `
          <div class="qr-section">
            <img src="${qrDataUrl}" class="qr-img" alt="QR" />
            ${qrTexto ? `<div class="qr-caption">${qrTexto}</div>` : ''}
          </div>
        ` : ''}

        ${letraChica.trim() ? `
          <div class="sep"></div>
          <div class="letra-chica">${letraChica}</div>
        ` : ''}

        <div class="sep"></div>
        <div class="footer">¡Presentá este ticket para canjear tu beneficio!</div>
        <div class="cut-space"></div>
      </div>
    `

    let ticketsHtml = ''
    for (let i = 0; i < copias; i++) {
      ticketsHtml += `<div class="ticket-page">${ticketSingleHtml}</div>`
    }

    const fullHtml = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ticket Promocional</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { margin: 0 !important; size: auto; }
        html, body {
          margin: 0 !important;
          padding: 0 2px !important;
          font-family: monospace;
          font-size: ${fBase}px;
          width: ${anchoPapel};
          color: #000;
          background: #fff;
        }
        .ticket-page {
          page-break-after: always !important;
          break-after: page !important;
          padding: 0 0 8px 0;
          margin: 0;
        }
        .ticket-page:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .ticket-wrapper { padding: 0; margin: 0; }
        .header { text-align: center; margin: 0 0 4px 0; padding-top: 0; }
        .brand-logo {
          width: ${anchoPapel === '58mm' ? '120px' : '150px'};
          max-width: 80%;
          height: auto;
          margin: 0 auto 2px auto;
          display: block;
          filter: grayscale(100%) contrast(150%);
        }
        .fecha { font-size: ${fFecha}px; color: #333; margin-top: 1px; }
        .sep { border-top: 1.5px dashed #000; margin: 4px 0; }
        .titulo-promo {
          font-size: ${fTitulo}px;
          font-weight: 900;
          text-align: center;
          margin: 4px 0 3px 0;
          line-height: 1.2;
        }
        .mensaje {
          font-size: ${fMensaje}px;
          text-align: center;
          margin: 4px 0;
          line-height: 1.35;
          font-weight: 600;
        }
        .validez-box {
          font-size: ${fValidez}px;
          font-weight: 900;
          text-align: center;
          margin: 5px 0 3px 0;
          padding: 3px;
          border: 1.5px solid #000;
          border-radius: 3px;
          background: #f4f4f4;
          text-transform: uppercase;
        }
        .qr-section { text-align: center; margin: 6px 0 3px 0; }
        .qr-img {
          width: ${anchoPapel === '58mm' ? '110px' : '140px'};
          height: ${anchoPapel === '58mm' ? '110px' : '140px'};
          margin: 0 auto;
          display: block;
        }
        .qr-caption { font-size: ${fQrCaption}px; font-weight: bold; margin-top: 3px; text-align: center; }
        .letra-chica { font-size: ${fLetraChica}px; text-align: center; color: #333; line-height: 1.25; margin-top: 3px; }
        .footer { font-size: ${fFooter}px; font-weight: bold; text-align: center; margin-top: 3px; }
        .cut-space { height: 8px; }
        @media print {
          @page { margin: 0 !important; size: auto; }
          html, body { margin: 0 !important; padding: 0 2px !important; }
        }
      </style>
    </head>
    <body>
      ${ticketsHtml}
    </body>
    </html>`

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;top:0;left:0;opacity:0;pointer-events:none'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) {
      setImprimiendo(false)
      return
    }

    doc.open()
    doc.write(fullHtml)
    doc.close()

    iframe.contentWindow?.focus()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
        setImprimiendo(false)
        toast.success(`Ticket impreso (${copias} copia${copias > 1 ? 's' : ''})`)
      }, 1200)
    }, 300)
  }

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 px-6 shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Printer size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Impresora de Promociones & Tickets</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Comandera Térmica
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Diseñá e imprimí cupones, códigos QR y mensajes en segundos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Editor + Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] overflow-y-auto flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
          
          {/* Editor */}
          <div className="p-6 space-y-5">
            
            {/* Plantillas */}
            <PlantillasGrid onSelect={aplicarPlantilla} />

            {/* Textos */}
            <div className="space-y-3.5 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Título Destacado del Ticket
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: ¡REGALO EXCLUSIVO!"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mensaje / Descripción del Beneficio
                </label>
                <textarea
                  rows={3}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Ej: Presentá este ticket en tu próximo pedido y llevate un 15% de descuento..."
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 resize-none font-medium"
                />
              </div>

              {/* Tiempo de Validez */}
              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Tiempo de Validez del Ticket
                    </label>
                  </div>
                  {textoValidez && (
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                      {textoValidez}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setValidezTipo('sin_vencimiento')}
                    className={cn(
                      "py-1.5 px-2 text-[11px] font-bold rounded-xl border transition-colors text-center cursor-pointer",
                      validezTipo === 'sin_vencimiento'
                        ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                    )}
                  >
                    Sin vencimiento
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidezTipo('hoy')}
                    className={cn(
                      "py-1.5 px-2 text-[11px] font-bold rounded-xl border transition-colors text-center cursor-pointer",
                      validezTipo === 'hoy'
                        ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                    )}
                  >
                    Solo por hoy
                  </button>

                  <button
                    type="button"
                    onClick={() => { setValidezTipo('dias'); setValidezDias(7); }}
                    className={cn(
                      "py-1.5 px-2 text-[11px] font-bold rounded-xl border transition-colors text-center cursor-pointer",
                      validezTipo === 'dias' && validezDias === 7
                        ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                    )}
                  >
                    7 Días (1 Sem)
                  </button>

                  <button
                    type="button"
                    onClick={() => { setValidezTipo('dias'); setValidezDias(14); }}
                    className={cn(
                      "py-1.5 px-2 text-[11px] font-bold rounded-xl border transition-colors text-center cursor-pointer",
                      validezTipo === 'dias' && validezDias === 14
                        ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                    )}
                  >
                    14 Días (2 Sem)
                  </button>
                </div>

                {validezTipo === 'dias' && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                      O definir días:
                    </span>
                    <div className="flex items-center gap-1.5 flex-1">
                      {[3, 7, 14, 21, 30].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setValidezDias(d)}
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-bold rounded-lg border cursor-pointer",
                            validezDias === d
                              ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          )}
                        >
                          {d}d
                        </button>
                      ))}
                      <div className="flex items-center gap-1 ml-auto">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={validezDias}
                          onChange={(e) => setValidezDias(Math.max(1, Number(e.target.value) || 1))}
                          className="w-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none text-center"
                        />
                        <span className="text-[10px] text-slate-400">días</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Letra Chica / Condiciones (Opcional)
                </label>
                <input
                  type="text"
                  value={letraChica}
                  onChange={(e) => setLetraChica(e.target.value)}
                  placeholder="Ej: Válido de Martes a Jueves. Vence en 30 días."
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </div>

            {/* Configuración QR */}
            <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode size={18} className="text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Código QR Escaneable
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={incluirQr}
                    onChange={(e) => setIncluirQr(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {incluirQr && (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Enlace o Destino del QR
                    </label>
                    <input
                      type="text"
                      value={qrUrl}
                      onChange={(e) => setQrUrl(e.target.value)}
                      placeholder="https://chefsy.xyz/whatsapp"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Texto debajo del QR
                    </label>
                    <input
                      type="text"
                      value={qrTexto}
                      onChange={(e) => setQrTexto(e.target.value)}
                      placeholder="Escaneá para chatear directo"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Opciones Impresión (Tamaño Fuente, Ancho Papel, Copias) */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Type size={14} className="text-amber-500" />
                  <span>Tamaño de Letra / Fuente del Ticket</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTamanoFuente('normal')}
                    className={cn(
                      "py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center",
                      tamanoFuente === 'normal'
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-600"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    Normal (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTamanoFuente('grande')}
                    className={cn(
                      "py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center",
                      tamanoFuente === 'grande'
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-600"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    Grande (120%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTamanoFuente('extra_grande')}
                    className={cn(
                      "py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center",
                      tamanoFuente === 'extra_grande'
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-600"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    Extra Grande (140%)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Ancho de Papel
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAnchoPapel('80mm')}
                      className={cn(
                        "py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer",
                        anchoPapel === '80mm'
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      80 mm
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnchoPapel('58mm')}
                      className={cn(
                        "py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer",
                        anchoPapel === '58mm'
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      58 mm
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Cantidad de Copias
                  </label>
                  <select
                    value={copias}
                    onChange={(e) => setCopias(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    <option value={1}>1 Copia</option>
                    <option value={2}>2 Copias</option>
                    <option value={3}>3 Copias</option>
                    <option value={5}>5 Copias (Lote)</option>
                    <option value={10}>10 Copias (Tirada grande)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Preview */}
          <div className="p-6 bg-slate-100/70 dark:bg-slate-950/40 flex flex-col justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5 text-center">
                Vista Previa en Vivo (Comandera)
              </p>

              <div 
                className="bg-white text-black p-4 rounded-xl shadow-md border border-slate-200 font-mono text-center max-w-[260px] mx-auto select-none transition-all"
                style={{
                  fontSize: tamanoFuente === 'extra_grande' ? '14px' : tamanoFuente === 'grande' ? '12.5px' : '11px'
                }}
              >
                <div className="flex flex-col items-center justify-center mb-1">
                  <img
                    src="/logo-chefsy.png"
                    alt="Chefsy Fast Food"
                    className="w-28 h-auto object-contain mx-auto mb-1"
                  />
                  <div className="text-[8px] text-slate-500 font-medium">{new Date().toLocaleDateString('es-AR')}</div>
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>

                <div 
                  className="font-black uppercase leading-tight my-1"
                  style={{
                    fontSize: tamanoFuente === 'extra_grande' ? '15px' : tamanoFuente === 'grande' ? '13px' : '11px'
                  }}
                >
                  {titulo || 'TÍTULO DE LA PROMO'}
                </div>

                <div 
                  className="my-2 leading-tight whitespace-pre-line text-slate-800 font-medium"
                  style={{
                    fontSize: tamanoFuente === 'extra_grande' ? '13px' : tamanoFuente === 'grande' ? '11.5px' : '10px'
                  }}
                >
                  {mensaje || 'Escribí aquí el mensaje o descuento.'}
                </div>

                {textoValidez && (
                  <div 
                    className="border border-black rounded px-1.5 py-1 my-1.5 bg-slate-50 font-black uppercase tracking-wide"
                    style={{
                      fontSize: tamanoFuente === 'extra_grande' ? '11px' : tamanoFuente === 'grande' ? '10px' : '9px'
                    }}
                  >
                    ⏳ {textoValidez}
                  </div>
                )}

                {incluirQr && (
                  <QrPreview url={qrUrlDebounced} texto={qrTexto} />
                )}

                {letraChica && (
                  <>
                    <div className="border-t border-dashed border-black my-2"></div>
                    <div 
                      className="text-slate-600 leading-tight"
                      style={{
                        fontSize: tamanoFuente === 'extra_grande' ? '10px' : tamanoFuente === 'grande' ? '9px' : '8px'
                      }}
                    >
                      {letraChica}
                    </div>
                  </>
                )}

                <div className="border-t border-dashed border-black my-2"></div>
                <div 
                  className="font-bold"
                  style={{
                    fontSize: tamanoFuente === 'extra_grande' ? '10px' : tamanoFuente === 'grande' ? '9px' : '8px'
                  }}
                >
                  ¡Presentá este ticket para canjear!
                </div>
              </div>
            </div>

            {/* Botón Imprimir */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={imprimirTicket}
                disabled={imprimiendo}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs sm:text-sm transition-colors shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Printer size={16} />
                <span>{imprimiendo ? 'Imprimiendo...' : `Imprimir ${copias > 1 ? `(${copias} Copias)` : 'Ticket'}`}</span>
              </button>
              <p className="text-[10px] text-slate-400 text-center font-medium">
                Se enviará a la impresora térmica seleccionada
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}

interface Props {
  botonVariante?: 'sidebar' | 'banner' | 'flotante'
}

export default function ImpresorTicketsPromocionales({ botonVariante = 'sidebar' }: Props) {
  const [montado, setMontado] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  const handleClose = useCallback(() => {
    setModalAbierto(false)
  }, [])

  return (
    <>
      {botonVariante === 'banner' && (
        <button
          onClick={() => setModalAbierto(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 font-bold px-4 py-3.5 rounded-2xl text-xs sm:text-sm transition-colors border border-emerald-400/30 active:scale-98 cursor-pointer shadow-sm"
        >
          <Sparkles size={16} className="text-amber-300" />
          <span>Imprimir Promo / QR</span>
        </button>
      )}

      {botonVariante === 'sidebar' && (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Promociones & QR</h3>
              <p className="text-[11px] text-slate-400 font-medium">Impresión de cupones y mensajes</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Imprimí en tu comandera tickets con promociones, tu Instagram, QR de WhatsApp directo o reseñas de Google para tus clientes.
          </p>

          <button
            onClick={() => setModalAbierto(true)}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-2.5 px-4 rounded-2xl text-xs transition-colors shadow-sm shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Sparkles size={14} className="text-amber-200" />
            <span>Crear Ticket Promocional</span>
          </button>
        </div>
      )}

      {modalAbierto && montado && createPortal(
        <ModalPromociones onClose={handleClose} />,
        document.body
      )}
    </>
  )
}
