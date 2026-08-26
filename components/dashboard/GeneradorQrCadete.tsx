'use client'

import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, X, Copy, Check, Sparkles, Smartphone, ArrowRight, Loader2 } from 'lucide-react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import toast from 'react-hot-toast'

export default function GeneradorQrCadete() {
  const { cadetes } = usarPedidos()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cadeteSeleccionado, setCadeteSeleccionado] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [cargando, setCargando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const handleGenerarQR = async () => {
    if (!cadeteSeleccionado) return

    const cadete = cadetes.find(c => c.id === cadeteSeleccionado)
    if (!cadete) return

    setCargando(true)
    try {
      const res = await fetch('/api/admin/generar-qr-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: cadete.id, nombre: cadete.nombre })
      })
      const data = await res.json()

      if (data.token) {
        const urlOrigen = typeof window !== 'undefined' ? window.location.origin : ''
        const url = `${urlOrigen}/api/auth/qr?token=${data.token}`
        setQrUrl(url)
        setModalAbierto(true)
      } else {
        toast.error(data.error || 'No se pudo generar el token de acceso.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error de conexión al generar QR.')
    } finally {
      setCargando(false)
    }
  }

  const copiarEnlace = () => {
    navigator.clipboard.writeText(qrUrl)
    setCopiado(true)
    toast.success('Enlace copiado al portapapeles')
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <QrCode size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Acceso Rápido Cadetes</h3>
            <p className="text-[11px] text-slate-400 font-medium">Login express vía código QR</p>
          </div>
        </div>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Generá un QR para que un cadete inicie sesión automáticamente en la app por 72hs.
        </p>

        <div className="space-y-2.5">
          <select
            value={cadeteSeleccionado}
            onChange={(e) => setCadeteSeleccionado(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer"
          >
            <option value="">Seleccionar cadete...</option>
            {cadetes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          
          <button
            onClick={handleGenerarQR}
            disabled={!cadeteSeleccionado || cargando}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-2.5 px-4 rounded-2xl text-xs transition-all shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            {cargando ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <QrCode size={14} />
                <span>Generar Código QR</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal del QR */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => { setModalAbierto(false); setQrUrl('') }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X size={20} />
            </button>
            
            <div className="mb-5 mt-1">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3">
                <Smartphone size={24} />
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Código de Acceso</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Escaneá este código con la App de Cadete. Válido por 72 horas.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-inner inline-block mb-5">
              <QRCodeSVG value={qrUrl} size={200} />
            </div>

            <div className="flex gap-2">
              <button
                onClick={copiarEnlace}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {copiado ? (
                  <>
                    <Check size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <span>¡Enlace Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    <span>Copiar Enlace Directo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
