'use client'

import React from 'react'

const FOTO_BLEND_SMASH =
  'https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1795646129425_09humj.webp'

export default function CartelBlendBurgers({ className = '' }: { className?: string }) {
  return (
    <aside
      aria-label="Información sobre nuestro blend de carne en burgers"
      className={`rounded-2xl border border-white/10 bg-[#161412] p-3.5 sm:p-4 ${className}`}
    >
      <div className="flex items-center gap-3.5 sm:gap-4">
        {/* Foto real del medallón smash */}
        <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black/40">
          <img
            src={FOTO_BLEND_SMASH}
            alt="Medallón smash de tapa de asado y roast beef"
            width={72}
            height={72}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Nota editorial limpia */}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.14em] text-amber-400">
            Nuevo blend propio · Tapa de asado + Roast beef
          </p>
          <p className="text-xs sm:text-[13px] text-stone-300 leading-snug">
            Ahora nuestras burgers salen con medallones elaborados con nuestro blend de{' '}
            <strong className="text-white font-semibold">tapa de asado</strong> y{' '}
            <strong className="text-white font-semibold">roast beef</strong>, hechos al momento en plancha bien caliente.
          </p>
        </div>
      </div>
    </aside>
  )
}
