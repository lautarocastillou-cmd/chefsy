// ─────────────────────────────────────────────────────
// lib/telegram-alertas.ts
// Servicio para despacho de alertas a Telegram
// Captura fallos de servidor, caídas de host y errores de clientes.
// ─────────────────────────────────────────────────────

export interface ParametrosAlertaTelegram {
  titulo: string
  mensaje: string
  modulo?: string
  severidad?: 'critico' | 'error' | 'advertencia' | 'info'
  url?: string
  stack?: string
  usuario?: string
  contexto?: Record<string, unknown>
}

// Control anti-spam en memoria para no saturar Telegram si un error entra en bucle
const registroAlertasRecientes = new Map<string, number>()
const VENTANA_ANTI_SPAM_MS = 60 * 1000 // 1 minuto por error idéntico

/**
 * Limpia caracteres peligrosos para HTML de Telegram
 */
function escaparHtmlTelegram(texto: string): string {
  if (!texto) return ''
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Envía una notificación de error o caída al canal de Telegram configurado
 */
export async function enviarAlertaTelegram(alerta: ParametrosAlertaTelegram): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()

  // Si no están configuradas las variables, salimos silenciosamente
  if (!token || !chatId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Telegram Alertas] TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados.')
    }
    return false
  }

  // Clave única para evitar spam de errores idénticos
  const claveHash = `${alerta.modulo || 'general'}_${alerta.mensaje.slice(0, 100)}`
  const ahora = Date.now()
  const ultimaVez = registroAlertasRecientes.get(claveHash) || 0

  if (ahora - ultimaVez < VENTANA_ANTI_SPAM_MS) {
    return false // Silenciado por anti-spam temporal
  }
  registroAlertasRecientes.set(claveHash, ahora)

  // Limpieza periódica de caché para evitar consumo de memoria
  if (registroAlertasRecientes.size > 200) {
    for (const [k, ts] of registroAlertasRecientes.entries()) {
      if (ahora - ts > VENTANA_ANTI_SPAM_MS * 5) {
        registroAlertasRecientes.delete(k)
      }
    }
  }

  // Icono según severidad
  const icono = {
    critico: '🚨 <b>[CHEFSY CRÍTICO]</b>',
    error: '⚠️ <b>[CHEFSY ERROR]</b>',
    advertencia: '🟡 <b>[CHEFSY ALERTA]</b>',
    info: 'ℹ️ <b>[CHEFSY INFO]</b>',
  }[alerta.severidad || 'error']

  const fechaHora = new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
    timeStyle: 'medium',
  })

  // Construcción del mensaje HTML estructurado
  let mensajeHtml = `${icono} <b>${escaparHtmlTelegram(alerta.titulo)}</b>\n\n`
  mensajeHtml += `📅 <b>Hora:</b> ${fechaHora}\n`
  if (alerta.modulo) {
    mensajeHtml += `🧩 <b>Módulo:</b> <code>${escaparHtmlTelegram(alerta.modulo)}</code>\n`
  }
  if (alerta.url) {
    mensajeHtml += `🌐 <b>Ruta / URL:</b> <code>${escaparHtmlTelegram(alerta.url)}</code>\n`
  }
  if (alerta.usuario) {
    mensajeHtml += `👤 <b>Usuario:</b> ${escaparHtmlTelegram(alerta.usuario)}\n`
  }

  mensajeHtml += `\n💬 <b>Detalle:</b>\n<pre>${escaparHtmlTelegram(alerta.mensaje.slice(0, 1000))}</pre>\n`

  if (alerta.stack) {
    // Truncar stack trace a máximo 600 caracteres para legibilidad móvil
    const stackLimpio = alerta.stack.slice(0, 600)
    mensajeHtml += `\n🔍 <b>Stack Trace:</b>\n<pre>${escaparHtmlTelegram(stackLimpio)}</pre>\n`
  }

  if (alerta.contexto && Object.keys(alerta.contexto).length > 0) {
    try {
      const contextoJson = JSON.stringify(alerta.contexto, null, 2).slice(0, 400)
      mensajeHtml += `\n📦 <b>Contexto:</b>\n<pre>${escaparHtmlTelegram(contextoJson)}</pre>`
    } catch {
      // Ignorar si no se puede serializar
    }
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: mensajeHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })

    if (!res.ok) {
      const errTexto = await res.text()
      console.error('[Telegram Alertas] Error en respuesta de Telegram:', errTexto)
      return false
    }

    return true
  } catch (error) {
    console.error('[Telegram Alertas] Error al despachar mensaje:', error)
    return false
  }
}
