'use client'

import React from 'react'
import Link from 'next/link'
import { MapPin, Navigation, Instagram } from 'lucide-react'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'

export default function FooterTienda() {
  const { configuracion } = usarConfiguracionTienda()
  const googleMapsUrl = 'https://maps.app.goo.gl/TRGjNnbVmeAABR3t8'

  return (
    <footer className="mt-16 mb-24 w-full border-t border-white/10 pt-10 pb-8 px-4 max-w-5xl mx-auto">
      {/* Grid principal */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start text-left">
        
        {/* Info de ubicación + Mapa (Columna Izquierda) */}
        <div className="md:col-span-7 space-y-4">
          <div className="space-y-2">
            <h4 className="text-white text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={16} className="text-chefsy-400" />
              ¿Dónde estamos ubicados?
            </h4>
            <p className="text-slate-400 text-xs font-semibold leading-relaxed">
              Nuestro local está ubicado en Rivadavia 195, antes de Almagro. Atendemos de Lunes a Sábado de 11:30hs a 14:00hs y 20:30hs a 01:00hs. ¡Domingo cerrado!
            </p>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-chefsy-400 hover:text-chefsy-300 text-xs font-extrabold transition-colors cursor-pointer group pt-1"
            >
              <Navigation size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              CÓMO LLEGAR EN GOOGLE MAPS
            </a>
          </div>

          {/* Mapa más grande debajo */}
          <div className="pt-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-full max-w-sm h-48 sm:h-56 rounded-2xl overflow-hidden border border-white/10 shadow-xl hover:border-chefsy-500/40 transition-all duration-300 group cursor-pointer block"
            >
              <img
                src="/ubicacion-chefsy.png"
                alt="Chefsy Mapa"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              <div className="absolute bottom-3 right-3 bg-black/85 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                <MapPin size={12} className="text-chefsy-400" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Ver en Google Maps</span>
              </div>
            </a>
          </div>
        </div>

        {/* Redes y enlaces legales (Columna Derecha) */}
        <div className="md:col-span-5 flex flex-col items-start md:items-end gap-6 pt-1">
          {/* Redes Sociales */}
          {(configuracion?.link_instagram || configuracion?.link_tiktok) && (
            <div className="flex items-center gap-4">
              {configuracion?.link_instagram && (
                <a href={configuracion.link_instagram} target="_blank" rel="noreferrer" className="bg-white/5 hover:bg-chefsy-500 hover:text-black text-white p-2 rounded-full transition-all border border-white/10 hover:scale-105">
                  <Instagram size={18} />
                </a>
              )}
              {configuracion?.link_tiktok && (
                <a href={configuracion.link_tiktok} target="_blank" rel="noreferrer" className="bg-white/5 hover:bg-chefsy-500 hover:text-black text-white p-2 rounded-full transition-all border border-white/10 hover:scale-105">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.68a6.34 6.34 0 0 0 10.86 4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.54z"/>
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* Enlaces Legales */}
          <div className="flex flex-col items-start md:items-end gap-3">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <Link href="/privacidad" className="hover:text-chefsy-400 transition-colors">Privacidad</Link>
              <span className="text-slate-700">•</span>
              <Link href="/terminos" className="hover:text-chefsy-400 transition-colors">Términos</Link>
            </div>

            <p className="text-[11px] text-slate-600 font-medium">&copy; {new Date().getFullYear()} Chefsy. Todos los derechos reservados.</p>
          </div>
        </div>

      </div>
    </footer>
  )
}
