'use client'

import { useState } from 'react'
import { usarMalu } from '../contexto'
import ListaClientas from './ListaClientas'
import DetalleClienta from './DetalleClienta'
import ModalNuevaClienta from './ModalNuevaClienta'
import ListaProductos from './ListaProductos'
import ListaVentasDiarias from './ListaVentasDiarias'
import WelcomeScreen from './WelcomeScreen'
import CalculadoraFlotanteMalu from './CalculadoraFlotanteMalu'
import NotitaFlotanteMalu from './NotitaFlotanteMalu'
import ModalVentaMostrador from './ModalVentaMostrador'
import ModalScannerMalu from './ModalScannerMalu'
import AsistenteMalu from './AsistenteMalu'
import type { ProductoMalu } from '../tipos'

function formatearPeso(monto: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

export default function AppMalu() {
  const { cerrarSesion, clientas, obtenerClientasConSaldo, productos } = usarMalu()
  const [clientaId, setClientaId] = useState<string | null>(null)
  const [modalNuevaClienta, setModalNuevaClienta] = useState(false)
  const [modalRegistrarVenta, setModalRegistrarVenta] = useState(false)
  const [modalScanner, setModalScanner] = useState(false)
  const [productoScanner, setProductoScanner] = useState<ProductoMalu | null>(null)
  const [seccion, setSeccion] = useState<'clientas' | 'stock' | 'ventas'>('clientas')
  const [mostrarBienvenida, setMostrarBienvenida] = useState(true)

  const conSaldo = obtenerClientasConSaldo()
  const totalDeuda = conSaldo.reduce((a, c) => a + (c.deudaTotal ?? 0), 0)
  const capitalStock = productos.reduce((sum, p) => sum + (p.precio * (p.stock || 0)), 0)
  const capitalCalle = totalDeuda

  return (
    <div
      className="min-h-screen relative overflow-hidden text-neutral-200"
      style={{ background: 'linear-gradient(160deg, #070707 0%, #0f0f0f 100%)', color: '#e5e5e5' }}
    >
      {/* Orbes decorativos suavizados en Champagne Gold */}
      <div className="absolute top-[-10%] left-[20%] w-[350px] h-[350px] rounded-full opacity-[0.03] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #E5D3B3, transparent 70%)', filter: 'blur(50px)' }}
      />
      <div className="absolute bottom-[20%] right-[-10%] w-[300px] h-[300px] rounded-full opacity-[0.02] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #E5D3B3, transparent 70%)', filter: 'blur(50px)' }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 py-3.5 flex items-center justify-between"
        style={{
          background: 'rgba(7,7,7,0.75)',
          borderBottom: '1px solid rgba(229,211,179,0.08)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          {clientaId ? (
            <button
              onClick={() => setClientaId(null)}
              className="p-1.5 rounded-lg transition-colors border border-white/5"
              style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)' }}
            >
              ←
            </button>
          ) : (
            <img
              src="/malu-logo.png"
              alt="Malú"
              className="w-8 h-8 rounded-full object-cover"
              style={{ border: '1px solid rgba(229,211,179,0.25)' }}
            />
          )}
          <div>
            <span
              className="text-sm font-bold tracking-wide font-serif-elegant"
              style={{ color: '#E5D3B3' }}
            >
              {clientaId ? 'Cuenta Corriente' : 'Malú Clothing'}
            </span>
            {!clientaId && (
              <p className="text-[10px] leading-none mt-0.5" style={{ color: 'rgba(229,211,179,0.4)' }}>
                Boutique de Moda
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!clientaId && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setModalScanner(true)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all select-none shadow-sm hover:opacity-90 active:scale-[0.98] border border-neutral-800 bg-neutral-900/60"
                style={{ color: '#E5D3B3' }}
              >
                📷 Escanear
              </button>
              <button
                onClick={() => setModalRegistrarVenta(true)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all select-none shadow-sm hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #E5D3B3, #C9B497)',
                  color: '#0a0a0a',
                  boxShadow: '0 2px 8px rgba(229,211,179,0.15)',
                }}
              >
                + Registrar Venta
              </button>
            </div>
          )}
          {!clientaId && totalDeuda > 0 && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
              Saldo en la calle: ${totalDeuda.toLocaleString('es-AR')}
            </div>
          )}
          <button
            onClick={cerrarSesion}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#f87171'
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.15)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
            }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-xl mx-auto px-4 pt-8 pb-8 relative z-10">
        
        {/* Bienvenida personalizada para Abril con Serif */}
        {!clientaId && (
          <div 
            className="rounded-2xl p-4 mb-7 flex flex-col justify-center" 
            style={{ 
              background: 'linear-gradient(135deg, rgba(229,211,179,0.04) 0%, rgba(229,211,179,0.01) 100%)', 
              border: '1px solid rgba(229,211,179,0.12)',
              backdropFilter: 'blur(5px)',
            }}
          >
            <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2 font-serif-elegant">
              <span>¡Hola, Abril!</span> <span className="animate-bounce text-base">👋</span>
            </h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Bienvenida al panel de administración y boutique de tu marca.
            </p>
          </div>
        )}

        {/* Tarjetas de Salud Financiera con Glassmorphism */}
        {!clientaId && (
          <div className="grid grid-cols-2 gap-3 mb-7">
            <div 
              className="rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:scale-[1.01]"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(229, 211, 179, 0.12)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div>
                <p className="text-[9px] uppercase tracking-widest font-semibold text-neutral-400">Capital en Stock 📦</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Mercadería en local</p>
              </div>
              <p className="text-xl font-bold mt-3 font-mono" style={{ color: '#E5D3B3' }}>
                {formatearPeso(capitalStock)}
              </p>
            </div>
            <div 
              className="rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:scale-[1.01]"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(239, 68, 68, 0.12)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div>
                <p className="text-[9px] uppercase tracking-widest font-semibold text-neutral-400">Capital en la Calle 💸</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Dinero a cobrar</p>
              </div>
              <p className="text-xl font-bold mt-3 font-mono text-red-400">
                {formatearPeso(capitalCalle)}
              </p>
            </div>
          </div>
        )}

        {/* Selector de Sección (Pestañas) con Serif y Champagne Gold */}
        {!clientaId && (
          <div 
            className="flex rounded-2xl p-1 mb-8" 
            style={{ 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid rgba(229,211,179,0.08)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <button
              onClick={() => setSeccion('clientas')}
              className="flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-150 font-serif-elegant"
              style={{
                background: seccion === 'clientas' ? 'rgba(229,211,179,0.12)' : 'transparent',
                color: seccion === 'clientas' ? '#E5D3B3' : 'rgba(255,255,255,0.45)',
                border: seccion === 'clientas' ? '1px solid rgba(229,211,179,0.15)' : '1px solid transparent',
              }}
            >
              👥 Clientas
            </button>
            <button
              onClick={() => setSeccion('stock')}
              className="flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-150 font-serif-elegant"
              style={{
                background: seccion === 'stock' ? 'rgba(229,211,179,0.12)' : 'transparent',
                color: seccion === 'stock' ? '#E5D3B3' : 'rgba(255,255,255,0.45)',
                border: seccion === 'stock' ? '1px solid rgba(229,211,179,0.15)' : '1px solid transparent',
              }}
            >
              📦 Stock
            </button>
            <button
              onClick={() => setSeccion('ventas')}
              className="flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-150 font-serif-elegant"
              style={{
                background: seccion === 'ventas' ? 'rgba(229,211,179,0.12)' : 'transparent',
                color: seccion === 'ventas' ? '#E5D3B3' : 'rgba(255,255,255,0.45)',
                border: seccion === 'ventas' ? '1px solid rgba(229,211,179,0.15)' : '1px solid transparent',
              }}
            >
              💰 Ventas
            </button>
          </div>
        )}

        {clientaId ? (
          <DetalleClienta
            clientaId={clientaId}
            onVolver={() => setClientaId(null)}
          />
        ) : seccion === 'stock' ? (
          <ListaProductos />
        ) : seccion === 'ventas' ? (
          <ListaVentasDiarias />
        ) : (
          <ListaClientas
            onVerDetalle={id => setClientaId(id)}
            onNuevaClienta={() => setModalNuevaClienta(true)}
          />
        )}
      </main>

      {modalNuevaClienta && (
        <ModalNuevaClienta onCerrar={() => setModalNuevaClienta(false)} />
      )}

      {modalRegistrarVenta && (
        <ModalVentaMostrador onCerrar={() => setModalRegistrarVenta(false)} />
      )}

      {modalScanner && (
        <ModalScannerMalu
          onCerrar={() => setModalScanner(false)}
          onEscanear={(p) => {
            setModalScanner(false)
            setProductoScanner(p)
          }}
        />
      )}

      {productoScanner && (
        <ModalVentaMostrador
          producto={productoScanner}
          onCerrar={() => setProductoScanner(null)}
        />
      )}

      {mostrarBienvenida && (
        <WelcomeScreen onCompletado={() => setMostrarBienvenida(false)} />
      )}

      {!mostrarBienvenida && (
        <>
          <CalculadoraFlotanteMalu />
          <NotitaFlotanteMalu />
          <AsistenteMalu />
        </>
      )}
    </div>
  )
}
