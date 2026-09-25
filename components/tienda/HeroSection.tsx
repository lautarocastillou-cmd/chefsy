'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, Search, LogOut, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { CategoriaCatalogo } from '@/tipos/catalogo'
import SelectorCategorias from '@/components/tienda/SelectorCategorias'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'
import dynamic from 'next/dynamic'
import BotonUbicacionLocal from '@/components/tienda/BotonUbicacionLocal'
import BotonWhatsAppHeader from '@/components/tienda/BotonWhatsAppHeader'
import SidebarTienda, { BotonHamburguesa } from '@/components/tienda/SidebarTienda'

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
  const [mostrarLogin, setMostrarLogin] = useState(false)
  const [mostrarConfirmLogout, setMostrarConfirmLogout] = useState(false)
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [mostrarPerfil, setMostrarPerfil] = useState(false)
  const [sidebarAbierto, setSidebarAbierto] = useState(false)
  const toastActivoRef = useRef(false)
  const timerToastRef = useRef<NodeJS.Timeout | null>(null)

  const mostrarToastProximamente = () => {
    // Si ya está en pantalla y vuelven a tocar -> descartar inmediatamente (cerrar)
    if (toastActivoRef.current) {
      toast.dismiss('toast-perfil-proximamente')
      toastActivoRef.current = false
      if (timerToastRef.current) clearTimeout(timerToastRef.current)
      return
    }

    // Mostrar con duración rápida (1.2s) e ID único (imposible de spamear)
    toastActivoRef.current = true
    toast('Próximamente disponible', {
      id: 'toast-perfil-proximamente',
      icon: '🚀',
      duration: 1200,
    })

    if (timerToastRef.current) clearTimeout(timerToastRef.current)
    timerToastRef.current = setTimeout(() => {
      toastActivoRef.current = false
    }, 1200)
  }

  return (
    <>
      {/* --- CABECERA DE LA TIENDA --- */}
      <header className="bg-transparent px-4 py-6 relative z-[100] border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <BotonHamburguesa
              abierto={sidebarAbierto}
              onClick={() => setSidebarAbierto(!sidebarAbierto)}
            />
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl overflow-hidden relative shadow-md border border-white/10 shrink-0">
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

          <div className="flex items-center gap-2.5">
            <BotonUbicacionLocal />
            <BotonWhatsAppHeader />
            <button
              onClick={mostrarToastProximamente}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-colors cursor-pointer border border-white/10 shrink-0"
              title="Próximamente disponible"
            >
              <User size={18} className="text-slate-300" />
            </button>
          </div>
        </div>
      </header>

      {/* --- RENDERIZADO DINÁMICO DEL HERO SEGÚN EL LAYOUT SELECCIONADO --- */}
      <HeroManager {...props} />

      {/* Barra Lateral (Sidebar) Desktop & Mobile */}
      <SidebarTienda
        abierto={sidebarAbierto}
        onCerrar={() => setSidebarAbierto(false)}
        categorias={props.categoriasActivas}
        categoriaSeleccionada={props.categoriaSeleccionada}
        onSeleccionarCategoria={(id) => {
          props.onSeleccionarCategoria(id)
          if (id && props.busqueda) props.onBusquedaChange('')
        }}
        onAbrirPerfil={mostrarToastProximamente}
        onAbrirLogin={mostrarToastProximamente}
        onAbrirHistorial={() => setMostrarHistorial(true)}
      />

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

