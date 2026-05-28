'use client'

// ─────────────────────────────────────────────────────
// modules/malu/componentes/AsistenteMalu.tsx
// Componente de Asistente de IA Premium para Malú Clothing.
// Conexión con Gemini 2.5 Flash y Cloudinary para edición de imágenes.
// ─────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { usarMalu, obtenerFechaNegocioMalu } from '../contexto'
import { Send, Paperclip, Sparkles, Trash2, Download, Image, Loader2, Wand2, X } from 'lucide-react'

interface Mensaje {
  role: 'user' | 'assistant'
  parts: string
  imagenUrl?: string
}

function formatearPeso(monto: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

export default function AsistenteMalu() {
  const { productos, ventasMostrador, clientas, pagos, ventas, gastos } = usarMalu()
  
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      role: 'assistant',
      parts: 'Hola Abril, bienvenida a tu Asistente Personal de Malú. ¿En qué puedo ayudarte hoy? Puedo analizar el stock, darte resúmenes financieros o ayudarte a editar y describir prendas para tus redes.'
    }
  ])
  const [input, setInput] = useState('')
  const [imagenBase64, setImagenBase64] = useState<string | null>(null)
  const [imagenUrlEditada, setImagenUrlEditada] = useState<string | null>(null)
  const [procesandoImagen, setProcesandoImagen] = useState(false)
  const [enviandoMensaje, setEnviandoMensaje] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Recolección de datos en tiempo real (Contexto Oculto)
  const capitalStock = productos.reduce((sum, p) => sum + (p.precio * (p.stock || 0)), 0)
  const totalPrendasStock = productos.reduce((sum, p) => sum + (p.stock || 0), 0)
  const hoyStr = obtenerFechaNegocioMalu()

  const ventasHoy = ventasMostrador.filter(v => v.fecha === hoyStr)
  const totalRecaudadoHoy = ventasHoy.reduce((sum, v) => sum + v.monto, 0)
  const efectivoHoy = ventasHoy.filter(v => v.metodo === 'efectivo').reduce((sum, v) => sum + v.monto, 0)
  const transferenciaHoy = ventasHoy.filter(v => v.metodo === 'transferencia').reduce((sum, v) => sum + v.monto, 0)

  const gastosHoy = (gastos || []).filter(g => g.fecha === hoyStr)
  const totalGastosHoy = gastosHoy.reduce((sum, g) => sum + g.monto, 0)
  const cajaNetaHoy = totalRecaudadoHoy - totalGastosHoy

  const deudaTotal = clientas.reduce((sum, c) => {
    const vClienta = ventas.filter(v => v.clienta_id === c.id).reduce((a, v) => a + v.monto, 0)
    const pClienta = pagos.filter(p => p.clienta_id === c.id).reduce((a, p) => a + p.monto, 0)
    const saldo = vClienta - pClienta
    return sum + (saldo > 0 ? saldo : 0)
  }, 0)

  const clientasActivas = clientas.length

  const contextoInyectado = `
Resumen de Métricas de hoy (${hoyStr}) para Malú Clothing:
- Total prendas en stock: ${totalPrendasStock} unidades
- Capital total en stock: ${formatearPeso(capitalStock)}
- Total de clientas registradas: ${clientasActivas}
- Deuda total acumulada de clientas: ${formatearPeso(deudaTotal)}
- Total ventas de hoy: ${formatearPeso(totalRecaudadoHoy)} (Efectivo: ${formatearPeso(efectivoHoy)}, Transferencia: ${formatearPeso(transferenciaHoy)})
- Gastos de hoy: ${formatearPeso(totalGastosHoy)}
- Caja Neta de hoy: ${formatearPeso(cajaNetaHoy)}
`

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [isOpen])

  // Manejar adjuntar imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagenBase64(reader.result as string)
      setImagenUrlEditada(null)
    }
    reader.readAsDataURL(file)
  }

  // Eliminar imagen seleccionada
  const handleRemoveImage = () => {
    setImagenBase64(null)
    setImagenUrlEditada(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Editar imagen con Cloudinary
  const aplicarTransformacionImagen = async (transformacion: 'eliminar_fondo' | 'mejorar_iluminacion') => {
    if (!imagenBase64) return
    setProcesandoImagen(true)
    try {
      const pass = typeof window !== 'undefined' ? localStorage.getItem('malu-sesion-pass') : null
      const res = await fetch('/api/malu/cloudinary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pass ? { 'x-malu-auth': pass } : {})
        },
        body: JSON.stringify({
          imagen: imagenBase64,
          transformacion
        })
      })

      if (!res.ok) {
        throw new Error('Error al procesar la imagen.')
      }

      const data = await res.json()
      if (data.urlTransformada) {
        setImagenUrlEditada(data.urlTransformada)
        // Para enviar a Gemini, usamos el URL editado en lugar de la imagen original en base64 si es posible,
        // o si es modo demo / base64 directo, mantenemos la referencia.
      }
      if (data.modoDemo && data.mensaje) {
        alert(data.mensaje)
      }
    } catch (err) {
      alert('Ocurrió un error al editar la imagen.')
    } finally {
      setProcesandoImagen(false)
    }
  }

  // Enviar mensaje a Gemini
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && !imagenBase64) return

    const mensajeAbril = input
    const imgParaEnviar = imagenUrlEditada || imagenBase64 // Prefiere la editada si existe
    
    // Agregar el mensaje del usuario al chat visual
    const nuevosMensajes: Mensaje[] = [
      ...mensajes,
      {
        role: 'user',
        parts: mensajeAbril,
        imagenUrl: imgParaEnviar || undefined
      }
    ]
    setMensajes(nuevosMensajes)
    setInput('')
    setImagenBase64(null)
    setImagenUrlEditada(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setEnviandoMensaje(true)

    try {
      // Mapear historial omitiendo el sistema interno o formateándolo
      const historialFiltrado = nuevosMensajes.slice(0, nuevosMensajes.length - 1).map(m => ({
        role: m.role,
        parts: m.parts
      }))

      const pass = typeof window !== 'undefined' ? localStorage.getItem('malu-sesion-pass') : null
      const res = await fetch('/api/malu/asistente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pass ? { 'x-malu-auth': pass } : {})
        },
        body: JSON.stringify({
          mensaje: mensajeAbril,
          historial: historialFiltrado,
          contexto: contextoInyectado,
          imagenDataUrl: imgParaEnviar
        })
      })

      if (!res.ok) {
        throw new Error('Error de conexión con el Asistente.')
      }

      const data = await res.json()
      setMensajes(prev => [
        ...prev,
        {
          role: 'assistant',
          parts: data.respuesta
        }
      ])
    } catch (err: any) {
      setMensajes(prev => [
        ...prev,
        {
          role: 'assistant',
          parts: 'Lo liento, Abril. Ocurrió un error al intentar conectarme con mi servicio de inteligencia artificial. Comprobá las variables de entorno o reintentá en un momento.'
        }
      ])
    } finally {
      setEnviandoMensaje(false)
    }
  }

  return (
    <>
      {/* Botón Lanzador Flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 border group"
        style={{
          background: 'rgba(15, 15, 15, 0.85)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(229, 211, 179, 0.25)',
          color: '#E5D3B3',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
        }}
        title="Asistente Malú"
      >
        <Sparkles className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
        {/* Indicador de notificación discreto si el asistente tiene mensajes y está cerrado */}
        {!isOpen && mensajes.length > 1 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E5D3B3] rounded-full border border-[#0a0a0a]" />
        )}
      </button>

      {/* Ventana de Chat Flotante */}
      <div 
        className={`fixed bottom-20 right-6 w-[calc(100vw-3rem)] sm:w-[380px] h-[500px] max-h-[70vh] z-50 rounded-2xl overflow-hidden flex flex-col border transition-all duration-300 transform origin-bottom-right ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto shadow-2xl' 
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
        style={{
          background: 'rgba(15, 15, 15, 0.9)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(229, 211, 179, 0.15)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Header del Chat */}
        <div 
          className="px-5 py-3 flex items-center justify-between border-b shrink-0"
          style={{ borderColor: 'rgba(229, 211, 179, 0.1)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#E5D3B3]/80" />
            <div>
              <h3 className="text-xs font-bold text-neutral-200 font-serif-elegant tracking-wide">
                Asistente Malú
              </h3>
              <p className="text-[9px] text-neutral-400 font-medium uppercase tracking-wider flex items-center gap-1 mt-0.5">
                <span className="w-1 h-1 rounded-full bg-emerald-500/80 inline-block"></span>
                IA Activa
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors hover:bg-white/5"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      {/* Historial de Mensajes */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
        {mensajes.map((m, index) => {
          const esAsistente = m.role === 'assistant'
          return (
            <div 
              key={index}
              className={`flex ${esAsistente ? 'justify-start' : 'justify-end'} animate-fade-in`}
            >
              <div 
                className={`max-w-[80%] rounded-2xl p-4 space-y-2 border transition-all ${
                  esAsistente 
                    ? 'bg-neutral-900/50 text-neutral-300 font-light' 
                    : 'text-neutral-900 font-semibold'
                }`}
                style={{
                  borderColor: esAsistente ? 'rgba(255,255,255,0.05)' : 'transparent',
                  background: esAsistente 
                    ? 'rgba(255, 255, 255, 0.01)'
                    : 'linear-gradient(135deg, #E5D3B3, #C9B497)',
                  boxShadow: esAsistente ? 'none' : '0 4px 15px rgba(229,211,179,0.1)'
                }}
              >
                {/* Si el mensaje tiene imagen */}
                {m.imagenUrl && (
                  <div className="relative rounded-lg overflow-hidden border border-white/10 max-h-48 mb-2">
                    <img 
                      src={m.imagenUrl} 
                      alt="Imagen enviada" 
                      className="object-cover w-full h-full max-h-48 rounded-lg"
                    />
                  </div>
                )}
                {/* Texto del mensaje */}
                <p className={`text-xs leading-relaxed whitespace-pre-wrap ${esAsistente ? 'font-serif-elegant' : 'font-sans'}`}>
                  {m.parts}
                </p>
              </div>
            </div>
          )
        })}
        {enviandoMensaje && (
          <div className="flex justify-start animate-fade-in">
            <div 
              className="rounded-2xl p-4 border flex items-center gap-2"
              style={{
                borderColor: 'rgba(255,255,255,0.05)',
                background: 'rgba(255, 255, 255, 0.01)',
                color: '#E5D3B3'
              }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-[11px] font-medium font-serif-elegant">El asistente está pensando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Previsualización de Imagen Adjunta */}
      {imagenBase64 && (
        <div 
          className="px-6 py-3 border-t flex items-center justify-between gap-4 animate-slide-up"
          style={{ 
            borderColor: 'rgba(229, 211, 179, 0.1)',
            background: 'rgba(229, 211, 179, 0.02)'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg border border-white/10 overflow-hidden relative bg-neutral-900 flex items-center justify-center shrink-0">
              <img 
                src={imagenUrlEditada || imagenBase64} 
                alt="Miniatura" 
                className="object-cover w-full h-full"
              />
              {procesandoImagen && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-[#E5D3B3] animate-spin" />
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                {imagenUrlEditada ? 'Prenda editada' : 'Imagen cargada'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => aplicarTransformacionImagen('eliminar_fondo')}
                  disabled={procesandoImagen}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-bold border flex items-center gap-1 transition-all hover:bg-[#E5D3B3]/10"
                  style={{
                    borderColor: 'rgba(229, 211, 179, 0.25)',
                    color: '#E5D3B3'
                  }}
                >
                  <Wand2 className="w-2.5 h-2.5" />
                  Eliminar Fondo (IA)
                </button>
                <button
                  type="button"
                  onClick={() => aplicarTransformacionImagen('mejorar_iluminacion')}
                  disabled={procesandoImagen}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-bold border flex items-center gap-1 transition-all hover:bg-[#E5D3B3]/10"
                  style={{
                    borderColor: 'rgba(229, 211, 179, 0.25)',
                    color: '#E5D3B3'
                  }}
                >
                  <Wand2 className="w-2.5 h-2.5" />
                  Mejorar Iluminación
                </button>
                {imagenUrlEditada && (
                  <a
                    href={imagenUrlEditada}
                    target="_blank"
                    rel="noreferrer"
                    download="prenda_editada.png"
                    className="px-2.5 py-1 rounded-lg text-[9px] font-bold border flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/25 transition-all hover:bg-emerald-500/20"
                  >
                    <Download className="w-2.5 h-2.5" />
                    Descargar
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={procesandoImagen}
            className="p-2 rounded-full hover:bg-red-500/10 text-red-400 border border-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input de Mensajes */}
      <form 
        onSubmit={handleSend}
        className="p-4 border-t flex gap-2 items-center"
        style={{ borderColor: 'rgba(229, 211, 179, 0.1)' }}
      >
        <input 
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={enviandoMensaje}
          className="p-3 rounded-xl transition-colors hover:bg-white/5 border border-white/5 flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(255,255,255,0.02)',
            color: '#E5D3B3'
          }}
          title="Adjuntar imagen de prenda"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={imagenBase64 ? "Escribí tu consulta sobre esta prenda..." : "Conversá con el Asistente Malú..."}
          disabled={enviandoMensaje}
          className="flex-1 px-4 py-3 rounded-xl text-xs outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#f5f5f5'
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(229, 211, 179, 0.3)'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
        />

        <button
          type="submit"
          disabled={enviandoMensaje || (!input.trim() && !imagenBase64)}
          className="p-3 rounded-xl transition-all flex items-center justify-center text-neutral-900 shrink-0 hover:opacity-95 disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #E5D3B3, #C9B497)'
          }}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
    </>
  )
}
