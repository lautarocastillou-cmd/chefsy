'use client'

import React from 'react'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'

export default function BotonFlotanteWhatsApp() {
  const { configuracion } = usarConfiguracionTienda()

  const rawTel = (configuracion as any)?.telefono_negocio || process.env.NEXT_PUBLIC_WHATSAPP_NEGOCIO || '5493834225445'
  // Limpiar cualquier carácter que no sea número para el link de wa.me
  const telefonoLimpio = rawTel.replace(/\D/g, '')
  const whatsappUrl = `https://wa.me/${telefonoLimpio}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed z-[9990] bottom-20 right-4 md:bottom-8 md:left-8 w-14 h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(37,211,102,0.45)] hover:shadow-[0_8px_32px_rgba(37,211,102,0.6)] active:scale-95 transition-all duration-200 group border border-white/10"
      title="Escríbenos por WhatsApp"
    >
      {/* Ondas pulsantes de fondo */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30 pointer-events-none group-hover:opacity-40 transition-opacity" />
      
      {/* Icono SVG de WhatsApp vectorizado nítido y premium */}
      <svg
        className="w-7 h-7 fill-current group-hover:scale-110 transition-transform duration-200"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12.012 2c-5.506 0-9.988 4.471-9.988 9.972 0 1.764.459 3.486 1.332 5.008L2 22l5.148-1.348c1.472.801 3.125 1.22 4.858 1.22.003 0 .005 0 .008 0 5.504 0 9.986-4.47 9.986-9.971C22 4.471 17.518 2 12.012 2zm6.059 14.162c-.265.748-1.285 1.365-1.782 1.455-.458.082-.958.125-2.734-.593-2.274-.92-3.714-3.21-3.828-3.361-.113-.15-.923-1.217-.923-2.319 0-1.101.579-1.644.825-1.9.245-.255.53-.32.707-.32.176 0 .353.003.504.01.157.008.373-.06.583.438.214.507.733 1.776.797 1.905.064.13.106.279.02.449-.086.17-.129.277-.258.425-.129.15-.27.336-.385.452-.128.13-.263.272-.113.526.15.253.666 1.096 1.428 1.77.983.87 1.81 1.139 2.067 1.267.257.127.406.106.559-.069.153-.175.656-.763.83-1.025.176-.263.351-.219.593-.13.243.089 1.543.723 1.808.855.265.132.441.198.506.31.066.113.066.656-.2 1.404z" />
      </svg>
    </a>
  )
}
