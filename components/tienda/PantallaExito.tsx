'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2, MessageCircle, BellRing, MapPin } from 'lucide-react'
import Image from 'next/image'
import { Pedido } from '@/tipos'
import { formatearPrecio } from '@/lib/utils'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'
import { leerPedidoActivo } from '@/components/tienda/BotonPedidoFlotante'

interface PantallaExitoProps {
  pedido: Pedido
  generarEnlaceWhatsApp: (pedido: Pedido) => string
  onNuevoPedido: () => void
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PantallaExito({ pedido, generarEnlaceWhatsApp, onNuevoPedido }: PantallaExitoProps) {
  const [suscribiendo, setSuscribiendo] = useState(false)
  const [suscrito, setSuscrito] = useState(false)
  const { usuario } = usarClienteAuth()

  useEffect(() => {
    window.history.pushState({ pantallaExito: true }, '', window.location.href)

    const handlePopState = () => {
      onNuevoPedido()
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [onNuevoPedido])

  const habilitarNotificaciones = async () => {
    try {
      setSuscribiendo(true)
      
      // Validar si soporta Service Workers y Push
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Tu navegador no soporta notificaciones push. Probá con Chrome o Safari actualizado.')
        setSuscribiendo(false)
        return
      }

      // Pedir permiso
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') {
        alert('Tenés que permitir las notificaciones en tu navegador para que te avisemos.')
        setSuscribiendo(false)
        return
      }

      // Registrar o obtener el Service Worker
      const registro = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Obtener clave pública
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        throw new Error('VAPID Key no configurada')
      }

      // Crear suscripción
      const subscription = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // Guardar en backend
      const res = await fetch('/api/webpush/suscribir-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedido_id: pedido.id,
          subscription: subscription
        })
      })

      if (!res.ok) throw new Error('Error guardando suscripción')

      setSuscrito(true)
    } catch (err) {
      console.error('Error al suscribir', err)
      alert('Hubo un problema al activar las notificaciones.')
    } finally {
      setSuscribiendo(false)
    }
  }
  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 transition-colors font-sans relative overflow-hidden">
      {/* Resplandor ambiental de fondo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-lg bg-[#1e1e1e]/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(16,185,129,0.1)] rounded-3xl p-6 md:p-8 space-y-6 text-center animate-in zoom-in-95 duration-300">
        
        {/* Logo con aura verde */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-full border-2 border-emerald-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.3)] overflow-hidden bg-white p-0.5">
            <Image 
              src="/logo.jpg" 
              alt="Chefsy Logo" 
              width={96} 
              height={96} 
              className="w-full h-full object-cover rounded-full"
              priority
            />
          </div>
        </div>

        {/* Título y Subtítulo solicitados */}
        <div className="space-y-2.5">
          <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">
            ¡Casi listo!
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            Para ingresar tu pedido <span className="inline-block font-mono font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-xs">#{pedido.id}</span> a la cocina, envianos la orden por WhatsApp.
          </p>
        </div>

        {/* Resumen del pedido en tarjeta glassmorphism */}
        <div className="bg-[#141414]/90 border border-white/10 rounded-2xl p-5 space-y-4 text-left text-xs text-slate-300 shadow-inner">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-extrabold text-slate-100 uppercase tracking-wider text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Resumen de Entrega
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/5">
              {pedido.tipoEntrega === 'delivery' ? '🛵 Delivery' : '🏪 Retiro'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Cliente</p>
              <p className="font-bold text-slate-100 text-sm truncate">{pedido.cliente}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Teléfono</p>
              <p className="font-bold text-slate-100 text-sm truncate">{pedido.telefono}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Destino</p>
              <p className="font-semibold text-slate-200 text-xs leading-snug">{pedido.direccion}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Método de Pago</p>
              <p className="font-bold text-emerald-400 capitalize text-xs">
                {pedido.metodoPago === 'efectivo' ? '💵 Efectivo' : pedido.metodoPago === 'tarjeta' ? '💳 Tarjeta' : pedido.metodoPago === 'transferencia' ? '📲 Transferencia' : pedido.metodoPago.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Desglose de Productos */}
          <div className="border-t border-white/10 pt-3.5 mt-2 space-y-2">
            <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Productos</p>
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {pedido.productos.map((prod) => (
                <li key={prod.id} className="flex justify-between items-center gap-3 text-xs">
                  <span className="font-medium text-slate-200 truncate">
                    <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px] mr-1.5">{prod.cantidad}x</span>
                    {prod.nombre}
                  </span>
                  <span className="text-slate-300 font-bold shrink-0 font-mono">{formatearPrecio(prod.precio * prod.cantidad)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Total */}
          <div className="col-span-2 flex items-center justify-between bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-500/20 mt-2">
            <p className="text-slate-200 font-extrabold uppercase tracking-wider text-xs">Total a Abonar</p>
            <p className="font-black text-emerald-400 text-xl font-mono leading-none drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{formatearPrecio(pedido.total)}</p>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col items-center gap-1">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-black text-xs uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-bounce">
              Ahora, por favor 👇
            </span>
          </div>

          <a
            href={generarEnlaceWhatsApp(pedido)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black py-4 px-5 rounded-2xl text-sm flex items-center justify-center gap-2.5 shadow-[0_10px_25px_rgba(34,197,94,0.35)] hover:shadow-[0_12px_30px_rgba(34,197,94,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer uppercase tracking-wider"
          >
            <MessageCircle size={20} className="fill-white/20" />
            CONFIRMAR PEDIDO POR WHATSAPP
          </a>

          {/* Botón Seguir mi Pedido — solo si hay pedido activo en localStorage */}
          {leerPedidoActivo()?.id === pedido.id && (
            <a
              href={`/cadete-en-vivo/${pedido.id}`}
              className="w-full bg-[#181818] hover:bg-[#222222] text-emerald-400 hover:text-emerald-300 font-extrabold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-emerald-500/30 shadow-md"
            >
              <MapPin size={16} />
              SEGUIR MI PEDIDO EN VIVO
            </a>
          )}
          
          <button
            onClick={onNuevoPedido}
            className="w-full bg-[#161616] hover:bg-[#222222] text-slate-400 hover:text-slate-200 font-bold py-3.5 px-4 rounded-2xl text-xs transition-all active:scale-[0.98] border border-white/10"
          >
            Hacer otro pedido
          </button>
        </div>

      </div>
    </div>
  )
}
