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
    <div className="min-h-screen bg-[#1c1c1c] flex items-center justify-center p-4 transition-colors font-sans">
      <div className="w-full max-w-lg bg-[#252525] border border-[#3d3d3d] shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-3xl p-6 md:p-8 space-y-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner overflow-hidden animate-logo-bounce bg-white">
          <Image 
            src="/logo.jpg" 
            alt="Chefsy Logo" 
            width={96} 
            height={96} 
            className="w-full h-full object-cover"
            priority
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">
            ¡Pedido Recibido con Éxito!
          </h2>
          <p className="text-sm text-slate-400">
            Tu pedido <span className="font-extrabold text-slate-300">#{pedido.id}</span> ha sido ingresado en nuestra cocina.
          </p>
        </div>

        <div className="bg-[#1c1c1c] border border-[#3d3d3d] rounded-2xl p-5 space-y-4 text-left text-xs text-slate-300 shadow-sm">
          <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm border-b border-[#3d3d3d] pb-2">
            Resumen de Entrega
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Cliente</p>
              <p className="font-semibold text-slate-200">{pedido.cliente}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Teléfono</p>
              <p className="font-semibold text-slate-200">{pedido.telefono}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Destino</p>
              <p className="font-semibold text-slate-200">{pedido.direccion}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Pago</p>
              <p className="font-semibold text-slate-200 capitalize">{pedido.metodoPago.replace('_', ' ')}</p>
            </div>
            {pedido.costoEnvio !== undefined && pedido.costoEnvio > 0 ? (
              <>
                <div className="col-span-2 flex justify-between border-t border-[#3d3d3d] pt-3 mt-1">
                  <p className="text-slate-400 font-semibold">Subtotal</p>
                  <p className="font-semibold text-slate-200">{formatearPrecio(pedido.total - pedido.costoEnvio)}</p>
                </div>
                <div className="col-span-2 flex justify-between">
                  <p className="text-slate-400 font-semibold">Costo de Envío</p>
                  <p className="font-semibold text-slate-200">{formatearPrecio(pedido.costoEnvio)}</p>
                </div>
              </>
            ) : null}
            <div className="col-span-2 flex justify-between bg-[#252525] p-3 rounded-xl mt-1 border border-[#3d3d3d]">
              <p className="text-slate-300 font-bold uppercase tracking-wider">Total Final</p>
              <p className="font-black text-emerald-400 text-lg leading-none">{formatearPrecio(pedido.total)}</p>
            </div>
          </div>

          <div className="border-t border-[#3d3d3d] pt-4 mt-2">
            <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider mb-2.5">Tu Pedido</p>
            <ul className="space-y-2">
              {pedido.productos.map((prod) => (
                <li key={prod.id} className="flex justify-between items-start gap-3">
                  <span className="font-semibold text-slate-200 leading-tight">
                    <span className="text-emerald-500">{prod.cantidad}x</span> {prod.nombre}
                  </span>
                  <span className="text-slate-400 font-bold shrink-0">{formatearPrecio(prod.precio * prod.cantidad)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">

          <div className="pt-2 flex flex-col items-center gap-1 animate-bounce">
            <span className="text-emerald-400 font-extrabold text-sm sm:text-base tracking-wide uppercase drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              Ahora, por favor 👇
            </span>
          </div>
          <a
            href={generarEnlaceWhatsApp(pedido)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-green-500 hover:bg-green-600 active:scale-98 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all cursor-pointer"
          >
            <MessageCircle size={18} />
            CONFIRMAR PEDIDO POR WHATSAPP
          </a>

          {/* Botón Seguir mi Pedido — solo si hay pedido activo en localStorage */}
          {leerPedidoActivo()?.id === pedido.id && (
            <a
              href={`/cadete-en-vivo/${pedido.id}`}
              className="w-full bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-black py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.98] border border-emerald-500/30"
            >
              <MapPin size={18} />
              SEGUIR MI PEDIDO EN VIVO
            </a>
          )}
          
          <button
            onClick={onNuevoPedido}
            className="w-full bg-[#1c1c1c] hover:bg-[#2f2f2f] text-slate-300 font-bold py-3.5 px-4 rounded-xl text-sm transition-all active:scale-98 border border-[#3d3d3d]"
          >
            Hacer otro pedido
          </button>
        </div>
      </div>
    </div>
  )
}
