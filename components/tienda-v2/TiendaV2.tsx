'use client'

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import Fuse from 'fuse.js'
import {
  Search,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react'

import { usarCatalogo } from '@/contexto/CatalogoContexto'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'
import { usarCarrito } from '@/contexto/CarritoContexto'
import { ProductoCatalogo, MetaProducto, ModificadorCatalogo } from '@/tipos/catalogo'
import { Pedido } from '@/tipos'
import { formatearPrecio, cn } from '@/lib/utils'
import { metadataRespaldo } from '@/datos/productos'
import { OBTENER_DETALLES_COMPLEMENTARIOS } from '@/lib/tienda-helpers'

// Componentes V2 y Tienda
import BannerGigantePromos from './BannerGigantePromos'
import CatalogoProductos from '@/components/tienda/CatalogoProductos'
import FooterTienda from '@/components/tienda/FooterTienda'
import BotonPedidoFlotante from '@/components/tienda/BotonPedidoFlotante'
import BotonUbicacionLocal from '@/components/tienda/BotonUbicacionLocal'
import BotonWhatsAppHeader from '@/components/tienda/BotonWhatsAppHeader'

// Dynamic components
const CartDrawer = dynamic(() => import('@/components/tienda/CartDrawer'), { ssr: false })
const ModalPersonalizacion = dynamic(() => import('@/components/tienda/ModalPersonalizacion'), { ssr: false })
const PantallaExito = dynamic(() => import('@/components/tienda/PantallaExito'), { ssr: false })

export default function TiendaV2() {
  const { productos, categorias, modificadores } = usarCatalogo()
  const { configuracion } = usarConfiguracionTienda()

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [metadata, setMetadata] = useState<Record<string, MetaProducto>>(metadataRespaldo as Record<string, MetaProducto>)

  const {
    cartAbierto,
    setCartAbierto,
    productoAPersonalizar,
    modsSeleccionados,
    cantidadModal,
    notaPersonalizacion,
    setProductoAPersonalizar,
    setCantidadModal,
    setNotaPersonalizacion,
    abrirModalPersonalizacion,
    alternarModificador,
    calcularPrecioUnitarioModal,
    agregarAlCarritoDesdeModal,
    totalProductosCarrito,
    subtotalCarrito,
    pedidoCompletado,
    setPedidoCompletado,
  } = usarCarrito()

  // Cargar metadatos públicos de productos
  useEffect(() => {
    let cancelado = false
    const cargarMetadata = async () => {
      try {
        const res = await fetch('/api/tienda-metadata')
        if (!res.ok) return
        const data = await res.json()
        if (data && typeof data === 'object' && !cancelado) {
          setMetadata(data)
        }
      } catch {}
    }
    cargarMetadata()
    return () => { cancelado = true }
  }, [])

  // Filtrado de categorías activas
  const categoriasActivas = useMemo(() => {
    return categorias.filter((c) => c.activa !== false)
  }, [categorias])

  // Filtrado de productos por categoría y búsqueda
  const productosFiltrados = useMemo(() => {
    let resultado = productos.filter((p) => p.activo !== false)

    if (categoriaSeleccionada) {
      resultado = resultado.filter((p) => p.categoriaId === categoriaSeleccionada)
    }

    if (!busqueda.trim()) return resultado

    const fuse = new Fuse(resultado, {
      keys: ['nombre', 'descripcion', 'categoriaId'],
      threshold: 0.35,
      ignoreLocation: true,
    })

    return fuse.search(busqueda).map((res) => res.item)
  }, [productos, categoriaSeleccionada, busqueda])

  const generarEnlaceWhatsApp = useCallback(
    (pedido: Pedido): string => {
      const rawTel =
        (configuracion as any)?.telefono_negocio ||
        process.env.NEXT_PUBLIC_WHATSAPP_NEGOCIO ||
        '5493834225445'
      const telLimpio = rawTel.toString().replace(/\D/g, '')

      let mensaje = configuracion?.whatsapp_mensaje
        ? `${configuracion.whatsapp_mensaje}\n\n`
        : `¡Hola Chefsy! Hice un pedido desde la tienda nueva:\n\n`

      mensaje += `Nombre: ${pedido.cliente}\n`
      mensaje += `Teléfono: ${pedido.telefono}\n`
      mensaje += `Entrega: ${pedido.tipoEntrega === 'delivery' ? pedido.direccion || 'Delivery' : 'Retiro por local'}\n`
      mensaje += `Método de pago: ${pedido.metodoPago?.toUpperCase() || 'NO ESPECIFICADO'}\n`
      if (pedido.observaciones) {
        mensaje += `Notas: ${pedido.observaciones}\n`
      }

      mensaje += `\n--------------------------------\n\n`
      mensaje += `Detalle del pedido: \n`

      pedido.productos.forEach((p) => {
        mensaje += `• ${p.cantidad}x ${p.nombre} - ${formatearPrecio(p.precio * p.cantidad)}\n`
      })

      if (pedido.tipoEntrega === 'delivery') {
        const costo = pedido.costoEnvio || 0
        mensaje += costo === 0 ? `• Costo de envío - ¡GRATIS!\n` : `• Costo de envío - ${formatearPrecio(costo)}\n`
      }

      const subtotal = pedido.total - (pedido.costoEnvio || 0)
      mensaje += `\nSubtotal: ${formatearPrecio(subtotal)}\n`
      mensaje += `Total: ${formatearPrecio(pedido.total)}\n`

      return `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje)}`
    },
    [configuracion]
  )

  if (pedidoCompletado) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <PantallaExito
          pedido={pedidoCompletado}
          generarEnlaceWhatsApp={generarEnlaceWhatsApp}
          onNuevoPedido={() => setPedidoCompletado(null)}
        />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans selection:bg-amber-500 selection:text-black">
      {/* ── Banner de Modo Laboratorio (Informativo para el Admin) ───────── */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-bold text-amber-300 flex items-center justify-center gap-2">
        <Sparkles size={14} className="text-amber-400" />
        <span>Estás en el <strong>Laboratorio V2</strong> (Esta página no afecta la tienda pública de los clientes)</span>
      </div>

      {/* ── Cabecera Principal Moderna ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#07090E]/90 backdrop-blur-md border-b border-white/5 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          {/* Logo y Nombre */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden relative border border-white/10 shadow-lg shrink-0">
              <Image
                src={configuracion?.logo_url || '/logo.jpg'}
                alt="Chefsy"
                fill
                priority
                sizes="(max-width: 768px) 40px, 48px"
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bebas text-2xl sm:text-3xl text-white tracking-wider leading-none">
                  CHEFSY
                </span>
                <span className="hidden sm:inline-flex text-[10px] bg-emerald-500/15 text-emerald-400 font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ABIERTO
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-400 font-medium">
                Las mejores burgers & lomos de Catamarca
              </p>
            </div>
          </div>

          {/* Buscador Integrado en Header (Desktop y Tablet) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar hamburguesas, lomos, papas, bebidas..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Acciones del Header: Ubicación, WhatsApp y Carrito */}
          <div className="flex items-center gap-2 sm:gap-3">
            <BotonUbicacionLocal />
            <BotonWhatsAppHeader />

            {/* Botón Carrito */}
            <button
              type="button"
              onClick={() => setCartAbierto(true)}
              className="relative bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <ShoppingCart size={17} />
              <span className="hidden sm:inline font-bold">
                {subtotalCarrito > 0 ? formatearPrecio(subtotalCarrito) : 'Carrito'}
              </span>
              {totalProductosCarrito > 0 && (
                <span className="bg-white text-emerald-800 text-[11px] font-black rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-xs">
                  {totalProductosCarrito}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Buscador para móvil debajo de la barra */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar platos o bebidas..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── BANNER GIGANTE DE PROMOS (Limpio, sin textos invasivos) ─────── */}
      <main className="pb-32">
        <BannerGigantePromos
          onSeleccionarCategoria={(catId) => setCategoriaSeleccionada(catId)}
        />

        {/* ── Catálogo de Productos ────────────────────────────────────────── */}
        <section id="catalogo-productos" className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                {categoriaSeleccionada
                  ? categoriasActivas.find((c) => c.id === categoriaSeleccionada)?.nombre || 'Productos'
                  : 'Carta Completa'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {productosFiltrados.length} opciones listas para disfrutar
              </p>
            </div>
          </div>

          <CatalogoProductos
            categoriasActivas={categoriasActivas}
            productosFiltrados={productosFiltrados}
            categoriaSeleccionada={categoriaSeleccionada}
            busqueda={busqueda}
            metadata={metadata}
            onAbrirModal={abrirModalPersonalizacion}
          />
        </section>

        <FooterTienda />
      </main>

      {/* Botón flotante para ver pedido en móvil */}
      <BotonPedidoFlotante />

      {/* Drawer del Carrito */}
      {cartAbierto && (
        <Suspense fallback={null}>
          <CartDrawer />
        </Suspense>
      )}

      {/* Modal de Personalización (Medallones, salsas, etc.) */}
      {productoAPersonalizar && (
        <Suspense fallback={null}>
          <ModalPersonalizacion
            producto={productoAPersonalizar}
            imagenFinal={(() => {
              const url = metadata[productoAPersonalizar.id]?.imagen_url
              const fallback = OBTENER_DETALLES_COMPLEMENTARIOS(
                productoAPersonalizar.categoriaId,
                productoAPersonalizar.nombre,
                productoAPersonalizar.id
              ).img
              if (!url || url.startsWith('data:')) return fallback
              return url
            })()}
            modificadoresDisponibles={
              (productoAPersonalizar.modificadoresIds ?? [])
                .map((id) => modificadores.find((m) => m.id === id))
                .filter(Boolean) as ModificadorCatalogo[]
            }
            modsSeleccionados={modsSeleccionados}
            cantidadModal={cantidadModal}
            notaPersonalizacion={notaPersonalizacion}
            precioUnitarioTotal={calcularPrecioUnitarioModal()}
            onCerrar={() => setProductoAPersonalizar(null)}
            onAlternarModificador={alternarModificador}
            onSetCantidad={setCantidadModal}
            onSetNota={setNotaPersonalizacion}
            onAgregar={agregarAlCarritoDesdeModal}
          />
        </Suspense>
      )}
    </div>
  )
}
