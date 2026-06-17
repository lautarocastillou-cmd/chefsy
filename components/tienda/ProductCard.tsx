'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'

interface ProductCardProps {
  prod: any
  meta: any
  detalles: any
  agotado: boolean
  imagenFinal: string
  index: number
  onAbrirModal: (prod: any) => void
}

function ProductCard({
  prod,
  meta,
  detalles,
  agotado,
  imagenFinal,
  index,
  onAbrirModal
}: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: (index % 6) * 0.1, ease: "easeOut" }}
      onClick={() => !agotado && onAbrirModal(prod)}
      className={`bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/30 hover:bg-white/[0.06] rounded-[2rem] overflow-hidden transition-all duration-300 group flex flex-col justify-between cursor-pointer shadow-2xl shadow-black/50 ${
        agotado ? 'opacity-50 grayscale' : ''
      }`}
    >
      <div>
        <div className="relative h-64 w-full overflow-hidden bg-black/20">
          <Image
            src={imagenFinal}
            alt={prod.nombre}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03] opacity-90 group-hover:opacity-100"
          />
          {prod.esCombo && (
            <span className="absolute top-4 left-4 text-[10px] font-black bg-chefsy text-white px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
              Combo
            </span>
          )}
          {agotado && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <span className="bg-red-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl uppercase tracking-wider shadow-lg">
                Agotado
              </span>
            </div>
          )}
          {!agotado && (
            <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-black/40 backdrop-blur-md p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
              <Plus size={20} className="text-white" />
            </div>
          )}
        </div>

        <div className="p-6 space-y-3 text-left">
          <div className="flex justify-between items-start gap-4">
            <h4 className="font-sans font-medium text-lg text-white leading-tight tracking-tight">
              {prod.nombre}
            </h4>
            <span className="font-sans font-light text-base text-slate-300 shrink-0">
              {formatearPrecio(prod.precio)}
            </span>
          </div>
          
          <p className="text-sm text-slate-400 font-light leading-relaxed line-clamp-2">
            {meta?.descripcion_publica || detalles.desc}
          </p>
        </div>
      </div>

      <div className="px-6 pb-6 pt-0 text-left opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
        <div className="text-xs text-white font-medium tracking-wide flex items-center gap-2">
          Añadir a la orden <Plus size={14} />
        </div>
      </div>
    </motion.div>
  )
}

// React.memo previene que las tarjetas de productos se re-rendericen innecesariamente
// cuando cambia el estado del carrito u otros estados de page.tsx
export default React.memo(ProductCard, (prevProps, nextProps) => {
  return (
    prevProps.prod.id === nextProps.prod.id &&
    prevProps.agotado === nextProps.agotado &&
    prevProps.imagenFinal === nextProps.imagenFinal
  )
})
