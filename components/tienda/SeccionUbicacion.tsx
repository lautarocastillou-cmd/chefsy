'use client'

import React from 'react'
import { MapPin, Navigation } from 'lucide-react'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'

export default function SeccionUbicacion() {
  const { configuracion } = usarConfiguracionTienda()
  
  const googleMapsUrl = 'https://www.google.com/maps?q=-28.462809031658047,-65.77850065400358'

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-12 md:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-[#181b22]/70 border border-white/10 rounded-[2.5rem] p-6 sm:p-10 backdrop-blur-lg shadow-2xl relative overflow-hidden">
        
        {/* Glow de fondo decorativo */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-chefsy-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Columna de Texto */}
        <div className="lg:col-span-5 space-y-6 text-left relative z-10">
          <div className="space-y-3">
            <span className="text-xs font-black text-chefsy-400 uppercase tracking-widest bg-chefsy-500/10 px-3 py-1.5 rounded-full border border-chefsy-500/20 inline-block">
              Visítanos
            </span>
            <h2 className="font-bebas text-5xl sm:text-6xl text-white tracking-wide leading-none uppercase drop-shadow-sm">
              ¿Dónde estamos <span className="text-chefsy-300">ubicados?</span>
            </h2>
            <p className="text-slate-300 text-sm sm:text-base font-semibold leading-relaxed">
              Nuestro local está ubicado en Rivadavia 195, antes de Almagro.
            </p>
          </div>

          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Te esperamos para disfrutar de las mejores hamburguesas, lomos y pizzas en el local, o para pasar a retirar tu pedido caliente y al toque.
          </p>

          <div className="pt-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex bg-gradient-to-r from-emerald-500 to-chefsy-600 hover:from-emerald-400 hover:to-chefsy-500 active:scale-[0.98] text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all duration-200 items-center justify-center gap-2 border border-emerald-400/20 group cursor-pointer"
            >
              <Navigation size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              CÓMO LLEGAR EN GOOGLE MAPS
            </a>
          </div>
        </div>

        {/* Columna del Mapa (Imagen) */}
        <div className="lg:col-span-7 relative z-10 w-full">
          <a 
            href={googleMapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl hover:border-chefsy-500/30 transition-all duration-300 group cursor-pointer"
          >
            {/* Overlay hover effect */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300 z-10 flex items-center justify-center">
              <div className="bg-[#111111]/80 border border-white/20 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-90 group-hover:scale-100 backdrop-blur-sm">
                <MapPin size={16} className="text-chefsy-400 animate-bounce" />
                <span className="text-xs font-black text-white tracking-wider uppercase">Ver en Google Maps</span>
              </div>
            </div>
            
            {/* Imagen del mapa */}
            <img 
              src="/ubicacion-chefsy.png" 
              alt="Chefsy Ubicación" 
              className="w-full h-auto object-cover min-h-[220px] max-h-[380px] group-hover:scale-[1.02] transition-transform duration-500 rounded-3xl"
            />
          </a>
        </div>
      </div>
    </section>
  )
}
