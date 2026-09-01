'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { CategoriaCatalogo } from '@/tipos/catalogo'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'
import { usarCarrito } from '@/contexto/CarritoContexto'
import { leerTodosPedidosActivos } from '@/components/tienda/BotonPedidoFlotante'
import {
  X,
  MapPin,
  Clock,
  MessageCircle,
  Instagram,
  Bike,
  ChevronRight,
  Info,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Botón Hamburguesa Animado que se transforma en X ────────────────────────
interface BotonHamburguesaProps {
  abierto: boolean
  onClick: () => void
  className?: string
}

export function BotonHamburguesa({ abierto, onClick, className = '' }: BotonHamburguesaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
      className={cn(
        'relative w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/10 shrink-0 select-none z-[110]',
        abierto && 'bg-white/20 border-white/20',
        className
      )}
    >
      {/* Línea Superior */}
      <span
        className={cn(
          'w-5 h-[2.5px] bg-white rounded-full transition-all duration-300 ease-in-out origin-center',
          abierto && 'translate-y-[8.5px] rotate-45 bg-emerald-400'
        )}
      />
      {/* Línea Central */}
      <span
        className={cn(
          'w-5 h-[2.5px] bg-white rounded-full transition-all duration-300 ease-in-out',
          abierto && 'opacity-0 scale-x-0'
        )}
      />
      {/* Línea Inferior */}
      <span
        className={cn(
          'w-5 h-[2.5px] bg-white rounded-full transition-all duration-300 ease-in-out origin-center',
          abierto && '-translate-y-[8.5px] -rotate-45 bg-emerald-400'
        )}
      />
    </button>
  )
}

// ── Componente Principal SidebarTienda ───────────────────────────────────────
interface SidebarTiendaProps {
  abierto: boolean
  onCerrar: () => void
  categorias: CategoriaCatalogo[]
  categoriaSeleccionada: string | null
  onSeleccionarCategoria: (id: string | null) => void
}

export default function SidebarTienda({
  abierto,
  onCerrar,
  categorias,
  categoriaSeleccionada,
  onSeleccionarCategoria,
}: SidebarTiendaProps) {
  const { configuracion } = usarConfiguracionTienda()
  const { turnoActivo, esDomingoCerrado } = usarCarrito()
  const [pedidosActivos, setPedidosActivos] = useState<any[]>([])
  const [mostrarQuienesSomosModal, setMostrarQuienesSomosModal] = useState(false)

  // Cargar pedidos activos del cliente para acceso rápido de rastreo
  useEffect(() => {
    if (abierto) {
      const activos = leerTodosPedidosActivos()
      setPedidosActivos(activos)
    }
  }, [abierto])

  // Bloquear scroll de fondo cuando el sidebar está abierto
  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [abierto])

  const handleElegirCategoria = (id: string | null) => {
    onSeleccionarCategoria(id)
    onCerrar()
  }

  const rawTel = (configuracion as any)?.telefono_negocio || '5493834225445'
  const telLimpio = rawTel.toString().replace(/\D/g, '') || '5493834225445'
  const whatsappUrl = `https://wa.me/${telLimpio}?text=${encodeURIComponent('¡Hola Chefsy! Tengo una consulta.')}`
  const instagramUrl = (configuracion as any)?.instagram_url || 'https://instagram.com/chefsy'

  return (
    <>
      {/* Overlay Oscuro de Fondo (Sin backdrop-blur para máxima fluidez) */}
      <div
        className={cn(
          'fixed inset-0 bg-black/80 z-[190] transition-opacity duration-300 ease-in-out',
          abierto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onCerrar}
      />

      {/* Panel Lateral Deslizable (Sidebar) */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-[#141414] text-white z-[200] shadow-2xl border-r border-white/10 flex flex-col justify-between transition-transform duration-300 ease-out overflow-hidden',
          abierto ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Encabezado del Sidebar */}
        <div className="p-4 border-b border-white/10 bg-[#181818] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden relative shadow-md border border-white/15 shrink-0">
              <Image
                src={configuracion?.logo_url || '/logo.jpg'}
                alt="Logo Chefsy"
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
            <div>
              <span className="font-bebas text-2xl text-white tracking-wider block leading-none">
                CHEFSY
              </span>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full inline-block animate-pulse',
                    turnoActivo && !esDomingoCerrado ? 'bg-emerald-400' : 'bg-rose-500'
                  )}
                />
                {turnoActivo && !esDomingoCerrado ? 'Cocina Abierta' : 'Local Cerrado'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido Scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          {/* SECCIÓN 1: Pedidos Activos (si hay alguno en camino) */}
          {pedidosActivos.length > 0 && (
            <div>
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider block mb-2 px-1">
                🛵 Tu Pedido en Curso
              </span>
              <div className="space-y-2">
                {pedidosActivos.map((p) => (
                  <a
                    key={p.id}
                    href={`/cadete-en-vivo/${p.id}`}
                    className="p-3 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-2.5 transition-all shadow-md active:scale-98"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Bike size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-emerald-200 block truncate">
                          Seguir pedido #{p.id.slice(0, 5).toUpperCase()}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-400 capitalize">
                          Estado: {p.estado || 'En camino'}
                        </span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-emerald-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN 2: Menú y Categorías */}
          <div>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-2 px-1">
              🍽️ Menú & Categorías
            </span>
            <div className="space-y-1">
              {/* Opción Todos */}
              <button
                type="button"
                onClick={() => handleElegirCategoria(null)}
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer',
                  !categoriaSeleccionada
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🍴</span>
                  <span>Ver todo el menú</span>
                </div>
                {!categoriaSeleccionada && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>

              {/* Categorías Dinámicas */}
              {categorias.map((cat) => {
                const seleccionada = categoriaSeleccionada === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleElegirCategoria(cat.id)}
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer',
                      seleccionada
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-sm shrink-0">
                        {cat.nombre.toLowerCase().includes('burger')
                          ? '🍔'
                          : cat.nombre.toLowerCase().includes('lomo')
                          ? '🥪'
                          : cat.nombre.toLowerCase().includes('pizza')
                          ? '🍕'
                          : cat.nombre.toLowerCase().includes('mila')
                          ? '🥩'
                          : cat.nombre.toLowerCase().includes('papa')
                          ? '🍟'
                          : cat.nombre.toLowerCase().includes('bebida')
                          ? '🥤'
                          : cat.nombre.toLowerCase().includes('promo')
                          ? '🏷️'
                          : '🍽️'}
                      </span>
                      <span className="truncate">{cat.nombre}</span>
                    </div>
                    {seleccionada ? (
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-500 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* SECCIÓN 3: Información & Institucional */}
          <div>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-2 px-1">
              ✨ Sobre Nosotros
            </span>
            <div className="space-y-1">
              {/* Botón ¿Quiénes somos? */}
              <button
                type="button"
                onClick={() => setMostrarQuienesSomosModal(true)}
                className="w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Info size={16} className="text-amber-400 shrink-0" />
                  <span>¿Quiénes somos?</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Info
                </span>
              </button>

              {/* Botón Ubicación del Local */}
              <a
                href="https://maps.google.com/?q=Chefsy+Catamarca"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin size={16} className="text-rose-400 shrink-0" />
                  <span>¿Dónde estamos?</span>
                </div>
                <span className="text-[10px] text-slate-400">Ver mapa</span>
              </a>

              {/* Horarios */}
              <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1 text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Clock size={15} className="text-emerald-400 shrink-0" />
                  <span>Horarios de Atención</span>
                </div>
                <p className="text-[11px] text-slate-400 pl-6 leading-tight">
                  Lun a Sáb: 11:30 a 14:00 • 20:30 a 01:00 hs
                </p>
                <p className="text-[11px] text-rose-400/90 pl-6">
                  Domingos: Cerrado
                </p>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: Contacto & Redes */}
          <div>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-2 px-1">
              💬 Contacto & Soporte
            </span>
            <div className="space-y-1.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <MessageCircle size={16} className="text-emerald-400 shrink-0" />
                  <span>Escribinos al WhatsApp</span>
                </div>
                <ArrowRight size={14} />
              </a>

              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-3.5 py-2.5 rounded-xl bg-pink-600/10 hover:bg-pink-600/20 text-pink-300 border border-pink-500/20 text-xs font-bold flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Instagram size={16} className="text-pink-400 shrink-0" />
                  <span>Seguinos en Instagram</span>
                </div>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* Footer del Sidebar */}
        <div className="p-3.5 border-t border-white/10 bg-[#121212] text-center text-slate-500 text-[10px] font-semibold shrink-0">
          <p>Chefsy • Catamarca, Argentina</p>
          <p className="text-white/30 text-[9px] mt-0.5">Sabor inigualable & entrega rápida</p>
        </div>
      </aside>

      {/* Modal "¿Quiénes somos?" informativo */}
      {mostrarQuienesSomosModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/85 animate-in fade-in duration-200">
          <div className="bg-[#1c1c1c] border border-white/15 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setMostrarQuienesSomosModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl">
              👨‍🍳
            </div>

            <div>
              <h3 className="text-lg font-black text-white">¿Quiénes somos?</h3>
              <p className="text-xs text-amber-400 font-bold mt-0.5">Pasión por la buena comida</p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              En <strong>Chefsy</strong> preparamos las mejores hamburguesas, lomos, pizzas y milanesas de Catamarca. Seleccionamos ingredientes frescos todos los días para brindarte una experiencia gastronómica rápida, deliciosa y al mejor precio.
            </p>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setMostrarQuienesSomosModal(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
