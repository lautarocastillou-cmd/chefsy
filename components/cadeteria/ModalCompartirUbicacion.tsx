'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { usarAuth } from '@/contexto/AuthContexto'
import {
  X,
  Share2,
  Copy,
  Check,
  Radio,
  ExternalLink,
  MessageCircle,
  QrCode,
  Bike,
  LocateFixed,
  AlertTriangle,
  RefreshCw,
  Power,
  ShieldCheck,
  Signal
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ModalCompartirUbicacionProps {
  abierto: boolean
  onClose: () => void
}

export default function ModalCompartirUbicacion({ abierto, onClose }: ModalCompartirUbicacionProps) {
  const { cadetes } = usarPedidos()
  const { usuarioActivo } = usarAuth()
  const [montado, setMontado] = useState(false)

  // Cadete seleccionado (por defecto 'lauta' o el usuario actual si es cadete)
  const [cadeteId, setCadeteId] = useState<string>('')
  const [copiado, setCopiado] = useState(false)
  const [mostrarQR, setMostrarQR] = useState(false)

  // ── Transmisión de GPS directo desde el navegador ────────────────────────────
  const [transmitiendoGps, setTransmitiendoGps] = useState(false)
  const [precisiónGps, setPrecisiónGps] = useState<number | null>(null)
  const [coordsGps, setCoordsGps] = useState<{ lat: number; lng: number } | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const wakeLockRef = useRef<any>(null)

  useEffect(() => {
    setMontado(true)
  }, [])

  // Inicializar selección de cadete
  useEffect(() => {
    if (!cadeteId && cadetes && cadetes.length > 0) {
      // Priorizar 'lauta' o el usuario activo
      const esLauta = cadetes.find(c => c.id.toLowerCase().includes('lauta') || c.nombre.toLowerCase().includes('lauta'))
      const esPropio = cadetes.find(c => c.id.toLowerCase() === usuarioActivo?.usuario.toLowerCase())
      
      if (esPropio) {
        setCadeteId(esPropio.id)
      } else if (esLauta) {
        setCadeteId(esLauta.id)
      } else {
        setCadeteId(cadetes[0].id)
      }
    }
  }, [cadetes, usuarioActivo, cadeteId])

  const cadeteActual = useMemo(() => {
    return cadetes.find(c => c.id === cadeteId) || cadetes[0] || null
  }, [cadetes, cadeteId])

  const urlBase = typeof window !== 'undefined' ? window.location.origin : 'https://chefsy.xyz'
  const urlCompartir = `${urlBase}/ubicacion/${cadeteActual?.id || cadeteId}`

  // ── Iniciar / Detener transmisión GPS del navegador ─────────────────────────
  const toggleTransmitirGps = async () => {
    if (transmitiendoGps) {
      // Detener
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }

      setTransmitiendoGps(false)
      setCoordsGps(null)
      setPrecisiónGps(null)

      try {
        await fetch('/api/admin/cadetes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gps_activo: false })
        })
      } catch (_) {}

      toast.success('Transmisión de GPS detenida.')
    } else {
      // Iniciar
      if (!('geolocation' in navigator)) {
        toast.error('Tu navegador no soporta geolocalización.')
        return
      }

      // Pedir WakeLock para que no se apague la pantalla
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        }
      } catch (_) {}

      toast.loading('Obteniendo señal GPS...', { id: 'gps-init' })

      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          toast.dismiss('gps-init')
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          const accuracy = position.coords.accuracy

          setCoordsGps({ lat, lng })
          setPrecisiónGps(Math.round(accuracy))
          setTransmitiendoGps(true)

          try {
            await fetch('/api/admin/cadetes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat,
                lng,
                gps_activo: true,
                speed: position.coords.speed,
                heading: position.coords.heading,
                accuracy: accuracy
              })
            })
          } catch (err) {
            console.error('Error al enviar ping GPS:', err)
          }
        },
        (error) => {
          toast.dismiss('gps-init')
          console.error('Error GPS:', error)
          toast.error('Permiso de GPS denegado o señal no disponible.')
          setTransmitiendoGps(false)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000,
        }
      )

      watchIdRef.current = watchId
    }
  }

  // Limpiar watcher al desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
      }
    }
  }, [])

  const copiarEnlace = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(urlCompartir)
      setCopiado(true)
      toast.success('¡Enlace de ubicación copiado!')
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  const compartirWhatsApp = () => {
    const nombre = cadeteActual?.nombre || 'mi cadete'
    const texto = `¡Hola! Podés ver mi ubicación en tiempo real en el mapa acá:\n${urlCompartir}`
    const enlaceWa = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(enlaceWa, '_blank')
  }

  const abrirMapaEnVivo = () => {
    window.open(urlCompartir, '_blank')
  }

  if (!abierto || !montado || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 animate-in fade-in duration-150 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150"
      >
        {/* Encabezado */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Compartir Ubicación en Vivo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cualquiera con el link podrá ver la posición GPS sin iniciar sesión
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido Scrollable */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          
          {/* 1. Selector de Cadete */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Cadete a compartir:</span>
              <span className="text-[11px] font-normal text-slate-400">
                {cadetes.length} cadete(s) registrado(s)
              </span>
            </label>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {cadetes.map((c) => {
                const seleccionado = c.id === cadeteId
                const online = (c as any).online ?? c.gps_activo ?? false
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCadeteId(c.id)}
                    className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      seleccionado
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                      <Bike size={16} className={seleccionado ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold truncate">{c.nombre}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span className="text-[10px] text-slate-400 capitalize truncate">
                          {online ? 'Con señal' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Opción de Transmisión Directa desde este Dispositivo (Navegador) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <LocateFixed size={14} className="text-emerald-500" />
                  Transmitir GPS desde este dispositivo
                </span>
                {transmitiendoGps && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold animate-pulse">
                    EN VIVO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {transmitiendoGps 
                  ? `Transmitiendo coordenadas con precisión de ±${precisiónGps ?? 5}m`
                  : 'Emití tu ubicación en tiempo real directamente desde este navegador web sin necesidad de la APK.'}
              </p>
            </div>

            <button
              type="button"
              onClick={toggleTransmitirGps}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm ${
                transmitiendoGps
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20'
              }`}
            >
              <Power size={13} />
              <span>{transmitiendoGps ? 'Detener' : 'Activar GPS'}</span>
            </button>
          </div>

          {/* 3. Tarjeta del Enlace Público */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Enlace de seguimiento en tiempo real:
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">URL</span>
                <span className="truncate flex-1 select-all">{urlCompartir}</span>
              </div>

              <button
                type="button"
                onClick={copiarEnlace}
                className="p-2.5 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/20 active:scale-95 cursor-pointer shrink-0"
              >
                {copiado ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiado ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* 4. Botones de Acción Rápida (WhatsApp, Abrir Mapa, Ver QR) */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={compartirWhatsApp}
              className="py-2.5 px-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-green-900/20 active:scale-95 cursor-pointer"
            >
              <MessageCircle size={15} />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={abrirMapaEnVivo}
              className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-700/60 active:scale-95 cursor-pointer"
            >
              <ExternalLink size={15} />
              <span>Ver Mapa</span>
            </button>

            <button
              type="button"
              onClick={() => setMostrarQR(!mostrarQR)}
              className={`py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border active:scale-95 cursor-pointer ${
                mostrarQR
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <QrCode size={15} />
              <span>{mostrarQR ? 'Ocultar QR' : 'Código QR'}</span>
            </button>
          </div>

          {/* 5. Vista del Código QR Expandible */}
          {mostrarQR && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2 animate-in zoom-in-95 duration-150">
              <QRCodeSVG
                value={urlCompartir}
                size={160}
                level="M"
                includeMargin={true}
              />
              <p className="text-[11px] text-slate-500 text-center font-medium">
                Escaneá este código con cualquier celular para abrir la ubicación en vivo
              </p>
            </div>
          )}

          {/* 6. Nota de Privacidad y Acceso */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
              <span>Acceso directo y seguro</span>
            </div>
            <p>
              La persona que reciba este link podrá ver únicamente el mapa con el movimiento del cadete. No tiene acceso a tus pedidos, montos ni datos privados del negocio.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
