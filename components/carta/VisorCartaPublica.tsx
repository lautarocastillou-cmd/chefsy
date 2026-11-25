'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Store, FileText, ArrowUp, WifiOff } from 'lucide-react'
import BannerTituloCarta from '@/components/carta/BannerTituloCarta'
import ImagenHojaCarta from '@/components/carta/ImagenHojaCarta'
import {
  construirEnlaceWhatsAppCarta,
  detectarConexionLentaCarta,
  formatearFechaActualizacionCarta,
  obtenerSiguienteImagen,
  type ConfiguracionCarta,
  type HojaCarta,
  type InfoConexionRedCarta,
} from '@/lib/carta-digital'
import type { EstadoHorarioCarta } from '@/lib/carta-digital-servidor'

interface PropsVisorCartaPublica {
  config: ConfiguracionCarta
  hojas: HojaCarta[]
  estadoHorario: EstadoHorarioCarta
}

export default function VisorCartaPublica({
  config,
  hojas,
  estadoHorario,
}: PropsVisorCartaPublica) {
  const [indiceActivo, setIndiceActivo] = useState(0)
  const [mostrarSubir, setMostrarSubir] = useState(false)
  const [sinConexion, setSinConexion] = useState(false)
  const [ahorroDatos, setAhorroDatos] = useState(false)
  const hojasRefs = useRef<Array<HTMLElement | null>>([])
  const chipsContainerRef = useRef<HTMLDivElement | null>(null)

  const urlsImagenesActivas = useMemo(
    () =>
      hojas
        .filter((h) => h.tipo !== 'titulo' && Boolean(h.imagenUrl))
        .map((h) => h.imagenUrl),
    [hojas]
  )

  const urlsImagenesRetener = useMemo(() => {
    const lista: string[] = []
    for (const h of hojas) {
      if (h.tipo === 'titulo') continue
      if (h.imagenUrl) lista.push(h.imagenUrl)
      if (h.imagenFallbackUrl) lista.push(h.imagenFallbackUrl)
    }
    return lista
  }, [hojas])

  const whatsappUrl = useMemo(() => construirEnlaceWhatsAppCarta(config), [config])
  const fechaActualizacion = useMemo(
    () => formatearFechaActualizacionCarta(config.updatedAt),
    [config.updatedAt]
  )

  // Índice de chips: si hay títulos separadores o láminas con título, mostramos solo esos saltos limpios
  const chipsSecciones = useMemo(() => {
    const conTitulo = hojas
      .map((hoja, idx) => ({ hoja, idx, etiqueta: hoja.titulo.trim() }))
      .filter((item) => Boolean(item.etiqueta))
    if (conTitulo.length < 2 && !(conTitulo.length === 1 && hojas.length > 1)) {
      return []
    }
    return conTitulo
  }, [hojas])

  const tieneIndiceTitulos = chipsSecciones.length > 0

  // Contador de hojas de imagen (excluyendo separadores de título para que "2 / 6" cuente páginas reales)
  const infoPaginasImagen = useMemo(() => {
    const indicesImagen: number[] = []
    hojas.forEach((h, idx) => {
      if (h.tipo !== 'titulo') indicesImagen.push(idx)
    })
    const total = indicesImagen.length
    if (total === 0) return { actual: 0, total: 0 }
    // Encontrar la página de imagen actual o más cercana hacia atrás/adelante
    let actualPos = indicesImagen.findIndex((idx) => idx === indiceActivo)
    if (actualPos === -1) {
      // Si el elemento activo es un título, apuntamos a la primera imagen que viene después (o la última anterior)
      const siguienteIdx = indicesImagen.findIndex((idx) => idx > indiceActivo)
      actualPos = siguienteIdx !== -1 ? siguienteIdx : total - 1
    }
    return { actual: actualPos + 1, total }
  }, [hojas, indiceActivo])

  // Chip activo: el último chip cuyo índice sea <= indiceActivo
  const chipActivoIdx = useMemo(() => {
    if (!tieneIndiceTitulos) return -1
    let elegido = chipsSecciones[0].idx
    for (const chip of chipsSecciones) {
      if (chip.idx <= indiceActivo) {
        elegido = chip.idx
      } else {
        break
      }
    }
    return elegido
  }, [chipsSecciones, indiceActivo, tieneIndiceTitulos])

  // Índice de la primera imagen real para priorizar LCP
  const indicePrimeraImagen = useMemo(
    () => hojas.findIndex((h) => h.tipo !== 'titulo'),
    [hojas]
  )

  // ── Modo offline exclusivo de /carta (Service Worker + ahorro de datos 2G) ──
  useEffect(() => {
    if (typeof window === 'undefined') return

    const nav = window.navigator as Navigator & {
      connection?: InfoConexionRedCarta & {
        addEventListener?: (type: string, cb: () => void) => void
        removeEventListener?: (type: string, cb: () => void) => void
      }
    }

    const actualizarEstadoRed = () => {
      setSinConexion(!window.navigator.onLine)
      const info = detectarConexionLentaCarta(nav.connection)
      setAhorroDatos(info.ahorroDatos)
    }
    actualizarEstadoRed()
    window.addEventListener('online', actualizarEstadoRed)
    window.addEventListener('offline', actualizarEstadoRed)
    nav.connection?.addEventListener?.('change', actualizarEstadoRed)

    let cancelado = false
    const enviarAssetsAlSw = (sw: ServiceWorker | null | undefined) => {
      if (!sw || urlsImagenesActivas.length === 0) return
      const { ahorroDatos: esLenta } = detectarConexionLentaCarta(nav.connection)
      try {
        sw.postMessage({
          type: 'SYNC_CARTA_ASSETS',
          urls: urlsImagenesActivas,
          urlsRetener: urlsImagenesRetener,
          // En 2G o Ahorro de datos evitamos precargar todas las hojas de golpe
          // para no saturar la descarga de la hoja que el cliente está viendo.
          soloLimpiar: esLenta,
        })
      } catch {
        // Ignorar si el worker está cerrándose
      }
    }

    if ('serviceWorker' in window.navigator) {
      window.navigator.serviceWorker
        .register('/carta/sw.js', { scope: '/carta' })
        .then((registro) => {
          if (cancelado) return
          const activo = registro.active || registro.waiting || registro.installing
          if (activo) {
            if (activo.state === 'activated') {
              enviarAssetsAlSw(activo)
            } else {
              activo.addEventListener('statechange', () => {
                if (activo.state === 'activated') {
                  enviarAssetsAlSw(activo)
                }
              })
            }
          }
          return window.navigator.serviceWorker.ready
        })
        .then((registroListo) => {
          if (!cancelado && registroListo?.active) {
            enviarAssetsAlSw(registroListo.active)
          }
        })
        .catch(() => {
          // En entornos sin HTTPS o con SW deshabilitado, /carta sigue funcionando online normal
        })
    }

    return () => {
      cancelado = true
      window.removeEventListener('online', actualizarEstadoRed)
      window.removeEventListener('offline', actualizarEstadoRed)
      nav.connection?.removeEventListener?.('change', actualizarEstadoRed)
    }
  }, [urlsImagenesActivas, urlsImagenesRetener])

  // ── Bloqueo estricto de zoom (pinch iOS/Android, doble toque y Ctrl+rueda) ──
  // Evita que personas mayores queden "perdidas" con la pantalla ampliada.
  useEffect(() => {
    let ultimoTouchEnd = 0

    const bloquearGestoSafari = (e: Event) => {
      e.preventDefault()
    }

    const bloquearMultiTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    const bloquearDobleTapZoom = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('a, button, input, textarea, select')) {
        ultimoTouchEnd = 0
        return
      }
      const ahora = Date.now()
      if (ahora - ultimoTouchEnd <= 320) {
        e.preventDefault()
      }
      ultimoTouchEnd = ahora
    }

    const bloquearRuedaZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }

    const bloquearTecladoZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '_', '0'].includes(e.key)) {
        e.preventDefault()
      }
    }

    document.addEventListener('gesturestart', bloquearGestoSafari, { passive: false })
    document.addEventListener('gesturechange', bloquearGestoSafari, { passive: false })
    document.addEventListener('gestureend', bloquearGestoSafari, { passive: false })
    document.addEventListener('touchstart', bloquearMultiTouch, { passive: false })
    document.addEventListener('touchmove', bloquearMultiTouch, { passive: false })
    document.addEventListener('touchend', bloquearDobleTapZoom, { passive: false })
    window.addEventListener('wheel', bloquearRuedaZoom, { passive: false })
    window.addEventListener('keydown', bloquearTecladoZoom)

    return () => {
      document.removeEventListener('gesturestart', bloquearGestoSafari)
      document.removeEventListener('gesturechange', bloquearGestoSafari)
      document.removeEventListener('gestureend', bloquearGestoSafari)
      document.removeEventListener('touchstart', bloquearMultiTouch)
      document.removeEventListener('touchmove', bloquearMultiTouch)
      document.removeEventListener('touchend', bloquearDobleTapZoom)
      window.removeEventListener('wheel', bloquearRuedaZoom)
      window.removeEventListener('keydown', bloquearTecladoZoom)
    }
  }, [])

  // ── Seguimiento de sección/página actual al hacer scroll ───────────────────
  useEffect(() => {
    if (hojas.length <= 1) return

    const ratios = new Map<number, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.hojaIndex)
          if (!Number.isNaN(idx)) {
            ratios.set(idx, entry.intersectionRatio)
          }
        }
        let mejorIndice = -1
        let mejorRatio = 0
        ratios.forEach((ratio, idx) => {
          if (ratio > mejorRatio) {
            mejorRatio = ratio
            mejorIndice = idx
          }
        })
        if (mejorIndice >= 0) {
          setIndiceActivo(mejorIndice)
        }
      },
      {
        rootMargin: '-15% 0px -35% 0px',
        threshold: [0, 0.15, 0.35, 0.6, 0.85, 1],
      }
    )

    hojasRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    const onScroll = () => {
      setMostrarSubir(window.scrollY > 480)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [hojas.length])

  // Mantener visible el chip activo dentro de la barra horizontal
  useEffect(() => {
    if (!tieneIndiceTitulos || !chipsContainerRef.current || chipActivoIdx < 0) return
    const chipActivo = chipsContainerRef.current.querySelector(
      `[data-chip-index="${chipActivoIdx}"]`
    ) as HTMLElement | null
    if (chipActivo) {
      chipActivo.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [chipActivoIdx, tieneIndiceTitulos])

  const irAHoja = (indice: number) => {
    const el = hojasRefs.current[indice]
    if (!el) return
    const offset = tieneIndiceTitulos ? 104 : 62
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    setIndiceActivo(indice)
  }

  return (
    <div className="min-h-dvh bg-[#efede8] text-stone-900 select-none touch-pan-y [-webkit-touch-callout:none] flex flex-col">
      {/* ── Cabecera sticky sobria estilo visor de documento ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-stone-200/90">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.jpg"
              alt="Chefsy"
              width={34}
              height={34}
              draggable={false}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-contain bg-white border border-stone-200 shrink-0"
            />
            <div className="min-w-0 leading-tight">
              <h1 className="text-sm sm:text-[15px] font-bold tracking-tight text-stone-900 truncate">
                {config.titulo}
              </h1>
              {sinConexion ? (
                <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5 truncate mt-0.5">
                  <WifiOff size={11} className="shrink-0" />
                  <span>Sin conexión · Carta guardada</span>
                </p>
              ) : (
                config.mostrarEstadoHorario && (
                  <p className="text-[11px] font-medium text-stone-500 flex items-center gap-1.5 truncate mt-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        estadoHorario.abierto ? 'bg-[#2A6348]' : 'bg-stone-400'
                      }`}
                    />
                    <span className={estadoHorario.abierto ? 'text-[#2A6348] font-semibold' : ''}>
                      {estadoHorario.etiquetaCorta}
                    </span>
                  </p>
                )
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {ahorroDatos && !sinConexion && (
              <span
                title="Conexión lenta o ahorro de datos: cargamos cada hoja a medida que bajás"
                className="text-[10px] font-bold text-stone-600 bg-stone-100 border border-stone-200/80 px-2 py-1 rounded-full"
              >
                Ahorro
              </span>
            )}
            {infoPaginasImagen.total > 1 && (
              <span
                aria-live="polite"
                className="text-[11px] font-semibold tabular-nums text-stone-600 bg-stone-100 border border-stone-200/80 px-2.5 py-1 rounded-full"
              >
                {infoPaginasImagen.actual} / {infoPaginasImagen.total}
              </span>
            )}

            {config.mostrarLinkTienda && (
              <Link
                href="/tienda"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200/80 border border-stone-200/90 px-2.5 sm:px-3 py-1.5 rounded-full transition-colors"
              >
                <Store size={13} className="text-[#2A6348]" />
                <span>Tienda</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── Índice rápido por secciones (títulos separadores o hojas nombradas) ── */}
        {tieneIndiceTitulos && (
          <nav
            aria-label="Secciones de la carta"
            ref={chipsContainerRef}
            className="max-w-3xl mx-auto px-3 sm:px-4 pb-2.5 pt-0.5 flex items-center gap-1.5 overflow-x-auto scrollbar-hide touch-pan-x"
          >
            {chipsSecciones.map(({ hoja, idx, etiqueta }) => {
              const activa = chipActivoIdx === idx
              return (
                <button
                  key={hoja.id}
                  type="button"
                  data-chip-index={idx}
                  onClick={() => irAHoja(idx)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    activa
                      ? 'bg-[#2A6348] text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
                  }`}
                >
                  {etiqueta}
                </button>
              )
            })}
          </nav>
        )}
      </header>

      {/* ── Cuerpo del visor estilo PDF ── */}
      <main className="flex-1 w-full max-w-[780px] mx-auto px-0 sm:px-4 py-2 sm:py-6 pb-28 sm:pb-24">
        {hojas.length === 0 ? (
          <div className="mx-4 my-12 bg-white border border-stone-200 rounded-2xl p-8 text-center max-w-md sm:mx-auto space-y-4">
            <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
              <FileText size={22} />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-stone-900">Carta en actualización</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                Estamos cargando las hojas nuevas de nuestra carta. Mientras tanto podés pedir por WhatsApp o ver la tienda online.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 justify-center">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#2A6348] hover:bg-[#22503a] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
              >
                <MessageCircle size={16} />
                <span>Escribir por WhatsApp</span>
              </a>
              {config.mostrarLinkTienda && (
                <Link
                  href="/tienda"
                  className="inline-flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
                >
                  <Store size={16} />
                  <span>Ver tienda online</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 sm:gap-5">
            {hojas.map((hoja, idx) => {
              if (hoja.tipo === 'titulo') {
                const siguienteImagen = obtenerSiguienteImagen(hojas, idx)
                return (
                  <section
                    key={hoja.id}
                    data-hoja-index={idx}
                    ref={(el) => {
                      hojasRefs.current[idx] = el
                    }}
                    className="w-full sm:rounded-md sm:border sm:border-stone-300/60 sm:shadow-[0_2px_12px_rgba(24,24,20,0.06)] overflow-hidden"
                  >
                    <BannerTituloCarta hoja={hoja} siguienteImagen={siguienteImagen} />
                  </section>
                )
              }

              const esLcp = idx === indicePrimeraImagen
              const numeroHojaImagen =
                hojas.slice(0, idx + 1).filter((h) => h.tipo !== 'titulo').length || idx + 1
              return (
                <article
                  key={hoja.id}
                  data-hoja-index={idx}
                  ref={(el) => {
                    hojasRefs.current[idx] = el
                  }}
                  className="w-full bg-white sm:rounded-md sm:border sm:border-stone-300/70 sm:shadow-[0_2px_14px_rgba(24,24,20,0.08)] overflow-hidden"
                >
                  <ImagenHojaCarta
                    hoja={hoja}
                    esLcp={esLcp}
                    numeroHoja={numeroHojaImagen}
                    alt={
                      hoja.titulo.trim()
                        ? `${config.titulo} — ${hoja.titulo.trim()}`
                        : `${config.titulo} — hoja ${numeroHojaImagen}`
                    }
                  />
                </article>
              )
            })}
          </div>
        )}

        {/* ── Pie editorial discreto ── */}
        {hojas.length > 0 && (
          <footer className="mt-8 px-4 text-center space-y-2 text-xs text-stone-500">
            {fechaActualizacion && (
              <p>Carta actualizada el {fechaActualizacion}</p>
            )}
            <p className="text-[11px] text-stone-400">
              {estadoHorario.detalle}
            </p>
          </footer>
        )}
      </main>

      {/* ── Botón discreto volver arriba (solo tras scrollear) ── */}
      {mostrarSubir && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Volver arriba"
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 sm:bottom-6 sm:left-6 z-30 w-10 h-10 rounded-full bg-white/95 border border-stone-300/90 text-stone-700 hover:text-stone-950 shadow-sm flex items-center justify-center transition-colors cursor-pointer"
        >
          <ArrowUp size={17} />
        </button>
      )}

      {/* ── Botón flotante para pedir por WhatsApp ── */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 sm:bottom-6 sm:right-6 z-30 inline-flex items-center gap-2 h-12 px-5 rounded-full bg-[#2A6348] hover:bg-[#22503a] active:bg-[#1b402e] text-white text-sm font-semibold shadow-[0_6px_20px_rgba(20,52,37,0.3)] transition-colors"
      >
        <MessageCircle size={18} strokeWidth={2.2} />
        <span>Pedir por WhatsApp</span>
      </a>
    </div>
  )
}
