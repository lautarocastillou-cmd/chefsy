'use client'

import React from 'react'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'

interface BotonWhatsAppHeaderProps {
  size?: 'sm' | 'md'
}

export default function BotonWhatsAppHeader({ size = 'md' }: BotonWhatsAppHeaderProps) {
  const { configuracion } = usarConfiguracionTienda()

  const rawTel = (configuracion as any)?.telefono_negocio || process.env.NEXT_PUBLIC_WHATSAPP_NEGOCIO || '5493834225445'
  const telefonoLimpio = rawTel.replace(/\D/g, '')
  const whatsappUrl = `https://wa.me/${telefonoLimpio}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className={`group flex items-center gap-1.5 bg-white/10 hover:bg-emerald-500/20 text-white/90 hover:text-white border border-white/20 hover:border-emerald-500/40 rounded-full transition-all duration-200 active:scale-95 shadow-sm ${
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs font-semibold'
      }`}
    >
      {/* Icono de WhatsApp en verde */}
      <svg
        className="fill-current text-[#25D366] group-hover:scale-110 transition-transform duration-200 shrink-0"
        style={{ width: size === 'sm' ? '13px' : '15px', height: size === 'sm' ? '13px' : '15px' }}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12.012 2c-5.506 0-9.988 4.471-9.988 9.972 0 1.764.459 3.486 1.332 5.008L2 22l5.148-1.348c1.472.801 3.125 1.22 4.858 1.22.003 0 .005 0 .008 0 5.504 0 9.986-4.47 9.986-9.971C22 4.471 17.518 2 12.012 2zm6.059 14.162c-.265.748-1.285 1.365-1.782 1.455-.458.082-.958.125-2.734-.593-2.274-.92-3.714-3.21-3.828-3.361-.113-.15-.923-1.217-.923-2.319 0-1.101.579-1.644.825-1.9.245-.255.53-.32.707-.32.176 0 .353.003.504.01.157.008.373-.06.583.438.214.507.733 1.776.797 1.905.064.13.106.279.02.449-.086.17-.129.277-.258.425-.129.15-.27.336-.385.452-.128.13-.263.272-.113.526.15.253.666 1.096 1.428 1.77.983.87 1.81 1.139 2.067 1.267.257.127.406.106.559-.069.153-.175.656-.763.83-1.025.176-.263.351-.219.593-.13.243.089 1.543.723 1.808.855.265.132.441.198.506.31.066.113.066.656-.2 1.404z" />
      </svg>
      <span className="font-semibold tracking-tight whitespace-nowrap">WhatsApp</span>
    </a>
  )
}
