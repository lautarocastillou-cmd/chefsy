'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Send,
} from 'lucide-react'
import { ProductoCatalogo } from '@/tipos/catalogo'
import { formatearPrecio, generarSlug } from '@/lib/utils'

interface ModalCompartirProductoProps {
  producto: ProductoCatalogo
  categoriaNombre?: string
  onClose: () => void
}

export default function ModalCompartirProducto({
  producto,
  categoriaNombre,
  onClose,
}: ModalCompartirProductoProps) {
  const [copiadoCorto, setCopiadoCorto] = useState(false)
  const [copiadoDirecto, setCopiadoDirecto] = useState(false)
  const [usarSlug, setUsarSlug] = useState(false)

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const origin = useMemo(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin
    }
    return 'https://chefsy.xyz'
  }, [])

  const idOParam = usarSlug ? generarSlug(producto.nombre) : producto.id
  const enlaceCorto = `${origin}/p/${encodeURIComponent(idOParam)}`
  const enlaceDirecto = `${origin}/tienda?p=${encodeURIComponent(idOParam)}`

  const copiarTexto = async (texto: string, tipo: 'corto' | 'directo') => {
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = texto
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    if (tipo === 'corto') {
      setCopiadoCorto(true)
      setTimeout(() => setCopiadoCorto(false), 2200)
    } else {
      setCopiadoDirecto(true)
      setTimeout(() => setCopiadoDirecto(false), 2200)
    }
  }

  const mensajeWhatsApp = useMemo(() => {
    const precio = formatearPrecio(producto.precio)
    return encodeURIComponent(
      `¡Mirá esta promo en Chefsy! 🍔🔥\n${producto.nombre} a ${precio}\nPedilo directo acá: ${enlaceCorto}`
    )
  }, [producto.nombre, producto.precio, enlaceCorto])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                Generar enlace directo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Para Instagram Stories, Bio, Anuncios o WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Resumen del producto seleccionado */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  {categoriaNombre || 'Producto'}
                </span>
                {producto.activo ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ● Activo en tienda
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400">
                    ○ Inactivo
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                {producto.nombre}
              </h4>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Precio base</span>
              <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                {formatearPrecio(producto.precio)}
              </span>
            </div>
          </div>

          {/* Toggle Slug vs ID */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Formato de identificador en la URL:
            </span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setUsarSlug(false)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  !usarSlug
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                ID oficial
              </button>
              <button
                type="button"
                onClick={() => setUsarSlug(true)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  usarSlug
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Slug amigable
              </button>
            </div>
          </div>

          {/* Enlace Corto */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Smartphone size={14} className="text-amber-500" />
                <span>Enlace Corto (Recomendado para Instagram y WhatsApp)</span>
              </label>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Con vista previa enriquecida
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={enlaceCorto}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-700 dark:text-slate-200 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copiarTexto(enlaceCorto, 'corto')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiadoCorto
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                }`}
              >
                {copiadoCorto ? (
                  <>
                    <Check size={14} /> ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Enlace Directo a Tienda */}
          <div className="space-y-1.5">
            <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ExternalLink size={14} className="text-slate-400" />
              <span>Enlace Directo a la Tienda Web</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={enlaceDirecto}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-600 dark:text-slate-300 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copiarTexto(enlaceDirecto, 'directo')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiadoDirecto
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {copiadoDirecto ? (
                  <>
                    <Check size={14} /> ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Botones de acción rápida */}
          <div className="flex items-center gap-3 pt-1">
            <a
              href={`https://api.whatsapp.com/send?text=${mensajeWhatsApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Send size={14} />
              <span>Compartir en WhatsApp</span>
            </a>
            <a
              href={enlaceCorto}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            >
              <ExternalLink size={14} />
              <span>Probar enlace</span>
            </a>
          </div>

          {/* Banner de Seguridad & Blindaje de Precios */}
          <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-3.5 flex items-start gap-2.5 text-left">
            <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed">
              <span className="font-bold">Seguridad y Precio 100% Blindado:</span> El enlace únicamente
              transporta el código del producto. Al abrirse, la tienda carga y valida el precio directamente
              desde la base de datos oficial de Supabase. Ningún usuario puede alterar el precio editando el link.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}
