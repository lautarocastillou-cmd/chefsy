'use client'

import React from 'react'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { Pedido } from '@/tipos'
import { formatearPrecio } from '@/lib/utils'

interface PantallaExitoProps {
  pedido: Pedido
  generarEnlaceWhatsApp: (pedido: Pedido) => string
  onNuevoPedido: () => void
}

export default function PantallaExito({ pedido, generarEnlaceWhatsApp, onNuevoPedido }: PantallaExitoProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors font-sans">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xl rounded-3xl p-6 md:p-8 space-y-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 size={44} className="animate-bounce" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight">
            ¡Pedido Recibido con Éxito!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tu pedido <span className="font-extrabold text-slate-700 dark:text-slate-300">#{pedido.id}</span> ha sido ingresado en nuestra cocina.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-5 space-y-3.5 text-left text-xs text-slate-700 dark:text-slate-350">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
            📋 Resumen de Entrega
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Cliente</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{pedido.cliente}</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Teléfono</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{pedido.telefono}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Destino</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{pedido.direccion}</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Pago</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{pedido.metodoPago}</p>
            </div>
            {pedido.costoEnvio !== undefined && pedido.costoEnvio > 0 && (
              <div>
                <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Envío</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{formatearPrecio(pedido.costoEnvio)}</p>
              </div>
            )}
            <div className={pedido.costoEnvio ? 'col-span-2' : ''}>
              <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider">Total</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatearPrecio(pedido.total)}</p>
            </div>
          </div>

          <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-4 mt-2">
            <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-wider mb-2.5">Tu Pedido</p>
            <ul className="space-y-2">
              {pedido.productos.map((prod) => (
                <li key={prod.id} className="flex justify-between items-start gap-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    <span className="text-emerald-600 dark:text-emerald-500">{prod.cantidad}x</span> {prod.nombre}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 font-bold shrink-0">{formatearPrecio(prod.precio * prod.cantidad)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <a
            href={generarEnlaceWhatsApp(pedido)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-green-500 hover:bg-green-600 active:scale-98 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all cursor-pointer"
          >
            <MessageCircle size={18} />
            Enviar Pedido por WhatsApp
          </a>
          
          <button
            onClick={onNuevoPedido}
            className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold py-3.5 px-4 rounded-xl text-sm transition-all active:scale-98"
          >
            Hacer otro Pedido
          </button>
        </div>
      </div>
    </div>
  )
}
