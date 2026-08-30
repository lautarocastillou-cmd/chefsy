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
            <BotonUbicacionLocal />
            <BotonWhatsAppHeader />
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
