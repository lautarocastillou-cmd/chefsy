'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, Search, LogOut, User } from 'lucide-react'
import { CategoriaCatalogo } from '@/tipos/catalogo'
import SelectorCategorias from '@/components/tienda/SelectorCategorias'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'
import dynamic from 'next/dynamic'
import BotonUbicacionLocal from '@/components/tienda/BotonUbicacionLocal'
import BotonWhatsAppHeader from '@/components/tienda/BotonWhatsAppHeader'

const ModalLoginCliente = dynamic(() => import('@/components/auth/ModalLoginCliente'), { ssr: false })
const ModalLogout = dynamic(() => import('@/components/auth/ModalLogout'), { ssr: false })
const ModalHistorialPedidos = dynamic(() => import('@/components/tienda/ModalHistorialPedidos'), { ssr: false })
const ModalPerfilCliente = dynamic(() => import('@/components/tienda/ModalPerfilCliente'), { ssr: false })

import HeroManager from '@/components/tienda/hero/HeroManager'

interface HeroSectionProps {
  categoriasActivas: CategoriaCatalogo[]
  categoriaSeleccionada: string | null
  busqueda: string
  sugerenciaBusqueda?: string | null
  selectorAbierto: boolean
  animatedWordIndex: number
  animatedWords: string[]
  onBusquedaChange: (valor: string) => void
  onToggleSelector: () => void
  onSeleccionarCategoria: (id: string | null) => void
}

export default function HeroSection(props: HeroSectionProps) {
  const { configuracion } = usarConfiguracionTienda()
  const { usuario, perfil, cerrarSesion } = usarClienteAuth()
  const [mostrarLogin, setMostrarLogin] = React.useState(false)
  const [mostrarConfirmLogout, setMostrarConfirmLogout] = React.useState(false)
  const [mostrarHistorial, setMostrarHistorial] = React.useState(false)
  const [mostrarPerfil, setMostrarPerfil] = React.useState(false)

  return (
    <>
      {/* --- CABECERA DE LA TIENDA --- */}
      <header className="bg-transparent px-4 py-6 relative z-[100] border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl overflow-hidden relative shadow-md border border-white/10">
              <Image 
                src={configuracion?.logo_url || "/logo.jpg"} 
                alt="Chefsy" 
                fill
                priority
                sizes="(max-width: 768px) 40px, 48px"
                className="object-cover"
              />
            </div>
            <span className="font-bebas text-2xl md:text-3xl text-white tracking-wider">CHEFSY</span>
          </div>

          <div className="flex items-center gap-3">
            <BotonUbicacionLocal />
            <BotonWhatsAppHeader />

            {usuario ? (
              <button
                onClick={() => setMostrarPerfil(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-chefsy-500/30 flex items-center justify-center text-chefsy-400">
                  <User size={12} />
                </div>
                <span className="max-w-[120px] truncate">{perfil?.nombre || usuario.telefono || 'Mi Cuenta'}</span>
              </button>
            ) : (
              <button
                onClick={() => setMostrarLogin(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-chefsy-600 hover:bg-chefsy-500 text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <User size={13} />
                <span>Ingresar / Mi Cuenta</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* --- RENDERIZADO DINÁMICO DEL HERO SEGÚN EL LAYOUT SELECCIONADO --- */}
      <HeroManager {...props} />

      {mostrarLogin && (
        <ModalLoginCliente 
          onCerrar={() => setMostrarLogin(false)} 
        />
      )}

      {mostrarConfirmLogout && (
        <ModalLogout
          onCancel={() => setMostrarConfirmLogout(false)}
          onConfirm={async () => {
            await cerrarSesion()
            setMostrarConfirmLogout(false)
          }}
        />
      )}

      {mostrarHistorial && (
        <ModalHistorialPedidos
          abierto={mostrarHistorial}
          onCerrar={() => setMostrarHistorial(false)}
        />
      )}

      {mostrarPerfil && (
        <ModalPerfilCliente
          abierto={mostrarPerfil}
          onCerrar={() => setMostrarPerfil(false)}
          onAbrirHistorial={() => {
            setMostrarPerfil(false)
            setMostrarHistorial(true)
          }}
        />
      )}
    </>
  )
}
