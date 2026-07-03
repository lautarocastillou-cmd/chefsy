'use client'

import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, X, Copy, Check } from 'lucide-react'
import { usarPedidos } from '@/contexto/PedidosContexto'

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
        // La URL de escaneo debe apuntar a la ruta que configuramos
        const urlOrigen = typeof window !== 'undefined' ? window.location.origin : ''
        const url = `${urlOrigen}/api/auth/qr?token=${data.token}`
        setQrUrl(url)
        setModalAbierto(true)
      } else {
        alert('Error: ' + (data.error || 'No se pudo generar el token'))
      }
    } catch (err) {
      console.error(err)
      alert('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  const copiarEnlace = () => {
    navigator.clipboard.writeText(qrUrl)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-chefsy-100 dark:bg-chefsy-900/30 text-chefsy-600 rounded-xl">
            <QrCode size={20} />
          </div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100">Acceso Rápido Cadetes</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Generá un código QR para que un cadete inicie sesión automáticamente por 72hs.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={cadeteSeleccionado}
            onChange={(e) => setCadeteSeleccionado(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-100 outline-none"
          >
            <option value="">Seleccionar cadete...</option>
            {cadetes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <button
            onClick={handleGenerarQR}
            disabled={!cadeteSeleccionado || cargando}
            className="bg-chefsy hover:bg-chefsy-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {cargando ? 'Generando...' : 'Generar QR'}
          </button>
        </div>
      </div>

      {/* Modal del QR */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 transition-opacity duration-200 will-change-opacity animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center relative will-change-transform">
            <button
              onClick={() => { setModalAbierto(false); setQrUrl('') }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
            
            <div className="mb-6 mt-2">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">Código de Acceso</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Escaneá este código con el celular del cadete. Válido por 72hs.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border-4 border-slate-100 dark:border-slate-800 inline-block mb-6">
              <QRCodeSVG value={qrUrl} size={220} />
            </div>

            <div className="flex gap-2">
              <button
                onClick={copiarEnlace}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 font-medium py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {copiado ? <><Check size={16} className="text-green-500" /> Copiado</> : <><Copy size={16} /> Copiar Link</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
