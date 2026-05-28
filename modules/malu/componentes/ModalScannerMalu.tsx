'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { usarMalu } from '../contexto'
import type { ProductoMalu } from '../tipos'

interface Props {
  onCerrar: () => void
  onEscanear: (producto: ProductoMalu) => void
}

export default function ModalScannerMalu({ onCerrar, onEscanear }: Props) {
  const { productos } = usarMalu()
  const [errorLocal, setErrorLocal] = useState('')
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
  const scannerId = 'malu-qr-reader-el'

  useEffect(() => {
    const html5Qrcode = new Html5Qrcode(scannerId)
    html5QrcodeRef.current = html5Qrcode

    const startScanner = async () => {
      try {
        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 230, height: 230 }
          },
          (decodedText) => {
            const found = productos.find(p => p.id === decodedText || (p.codigo && p.codigo === decodedText))
            if (found) {
              detenerLector().then(() => {
                onEscanear(found)
              })
            } else {
              setErrorLocal('El código escaneado no corresponde a ningún producto.')
              setTimeout(() => setErrorLocal(''), 4000)
            }
          },
          () => {
            // Ignorar errores de escaneo por frame
          }
        )
      } catch (err: any) {
        console.error('Error starting scanner:', err)
        setErrorLocal('No se pudo acceder a la cámara. Verificá los permisos del navegador.')
      }
    }

    startScanner()

    return () => {
      detenerLector()
    }
  }, [productos, onEscanear])

  const detenerLector = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 text-center space-y-4 animate-[slideIn_0.2s_ease-out]"
        style={{
          background: '#161616',
          border: '1px solid rgba(229, 211, 179, 0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h3 className="text-sm font-bold text-neutral-200 font-serif-elegant">Lector de Etiquetas QR</h3>
          <button
            onClick={onCerrar}
            className="text-xs p-1 px-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/5">
          <div id={scannerId} className="w-full aspect-square" />
          
          {/* Guía visual de escaneo */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-[#E5D3B3]/40 rounded-xl relative flex flex-col justify-between p-2">
              <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#E5D3B3]" />
              <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#E5D3B3]" />
              <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#E5D3B3]" />
              <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#E5D3B3]" />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-neutral-400">
            Alineá el código QR del producto dentro del recuadro para escanearlo.
          </p>
          {errorLocal && (
            <p className="text-xs text-red-400 p-2.5 bg-red-500/10 rounded-xl border border-red-500/20 animate-pulse mt-2 text-center">
              {errorLocal}
            </p>
          )}
        </div>

        <button
          onClick={onCerrar}
          className="w-full py-2.5 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
        >
          Cancelar Escaneo
        </button>
      </div>
    </div>
  )
}
