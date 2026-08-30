'use client'

import React from 'react'
import { X, Sparkles, Check, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface Props {
  abierto: boolean
  texturaActual?: string
  onCerrar: () => void
  onSeleccionarTextura: (url: string) => void
}

export interface TexturaItem {
  id: string
  nombre: string
  categoria: string
  url: string
  previewUrl: string
  descripcion: string
}

export const TEXTURAS_PRESET: TexturaItem[] = [
  {
    id: 'madera-oscura',
    nombre: 'Madera Ahumada Negra',
    categoria: 'Rústico / Parrilla',
    url: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=1600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=300&q=70',
    descripcion: 'Vetas de madera quemada ideales para hamburguesas y parrillas.',
  },
  {
    id: 'cemento-carbon',
    nombre: 'Cemento Carbón Urbano',
    categoria: 'Industrial / Smash',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=70',
    descripcion: 'Fondo de hormigón oscuro y moderno de alto contraste.',
  },
  {
    id: 'pizarra-tiza',
    nombre: 'Pizarra de Tiza Bistró',
    categoria: 'Bistró / Pizzería',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=70',
    descripcion: 'Pizarra oscura mate con textura de tiza sutil.',
  },
  {
    id: 'marmol-negro',
    nombre: 'Mármol Negro Imperial',
    categoria: 'Gourmet / Elegante',
    url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=300&q=70',
    descripcion: 'Vetas doradas y blancas sobre fondo negro para restaurantes de autor.',
  },
  {
    id: 'papel-kraft',
    nombre: 'Papel Kraft Vintage',
    categoria: 'Cafetería / Bakery',
    url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=300&q=70',
    descripcion: 'Papel artesanal texturado para una estética cálida y cercana.',
  },
  {
    id: 'humo-fuego',
    nombre: 'Humo y Brasas Tenues',
    categoria: 'Fuego / Carnes',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=70',
    descripcion: 'Ambiente de cocina con calor y destellos sutiles.',
  },
]

export default function BancoTexturasModal({
  abierto,
  texturaActual,
  onCerrar,
  onSeleccionarTextura,
}: Props) {
  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Banco de Texturas HD</h3>
              <p className="text-xs text-slate-400">Fondos gastronómicos optimizados en alta definición</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Grilla de Texturas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
          
          {/* Opción Sin Textura */}
          <button
            type="button"
            onClick={() => {
              onSeleccionarTextura('')
              onCerrar()
            }}
            className={cn(
              'p-3 rounded-2xl border text-left transition-all cursor-pointer select-none flex flex-col justify-between h-36',
              !texturaActual
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                : 'bg-zinc-900 border-slate-800 hover:border-slate-700'
            )}
          >
            <div className="w-full h-16 rounded-xl bg-black border border-white/10 flex items-center justify-center text-slate-500 text-xs font-bold">
              🚫 Sin Textura (Color Puro)
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-slate-200">Fondo Plano</div>
              <div className="text-[10px] text-slate-400">Usa solo el color de marca</div>
            </div>
          </button>

          {/* Texturas Presets */}
          {TEXTURAS_PRESET.map((t) => {
            const seleccionada = texturaActual === t.url
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onSeleccionarTextura(t.url)
                  onCerrar()
                }}
                className={cn(
                  'p-3 rounded-2xl border text-left transition-all cursor-pointer select-none flex flex-col justify-between h-36 relative overflow-hidden group',
                  seleccionada
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-zinc-900 border-slate-800 hover:border-slate-700'
                )}
              >
                <div className="w-full h-16 rounded-xl relative overflow-hidden border border-white/10">
                  <Image
                    src={t.previewUrl}
                    alt={t.nombre}
                    fill
                    sizes="200px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {seleccionada && (
                    <div className="absolute top-1 right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-md">
                      <Check size={12} className="stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-slate-200 truncate">{t.nombre}</div>
                  <div className="text-[10px] text-slate-400 truncate">{t.categoria}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  )
}
