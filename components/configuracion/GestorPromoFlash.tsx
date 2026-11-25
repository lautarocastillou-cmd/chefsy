'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Calendar, Flame, Loader2, Power, RefreshCw, Save, ShieldCheck, Sparkles } from 'lucide-react'
import { notificarError, notificarExito } from '@/lib/notificaciones'
import {
  crearConfiguracionPromoFlashDefault,
  obtenerFechaHoyArgentinaSimple,
  type ConfiguracionPromoFlash,
  type EstadoPromoFlash,
} from '@/lib/promo-flash'
import { formatearPrecio } from '@/lib/utils'

const PRESETS_LIMITE = [15, 25, 30, 50, 80, 100]

export default function GestorPromoFlash() {
  const [estado, setEstado] = useState<EstadoPromoFlash | null>(null)
  const [form, setForm] = useState<ConfiguracionPromoFlash>(() =>
    crearConfiguracionPromoFlashDefault()
  )
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const cargarEstado = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/admin/promo-flash', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.estado) {
        throw new Error(data?.error || 'No se pudo cargar la promo flash.')
      }
      setEstado(data.estado as EstadoPromoFlash)
      setForm(data.estado.config as ConfiguracionPromoFlash)
    } catch (err: any) {
      notificarError(err?.message || 'Error al cargar la Promo Flash.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargarEstado()
  }, [cargarEstado])

  const guardar = async (override?: Partial<ConfiguracionPromoFlash>, msgExito?: string) => {
    setGuardando(true)
    try {
      const payload = { ...form, ...override }
      const res = await fetch('/api/admin/promo-flash', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.estado) {
        throw new Error(data?.error || 'No se pudo guardar la configuración.')
      }
      setEstado(data.estado as EstadoPromoFlash)
      setForm(data.estado.config as ConfiguracionPromoFlash)
      notificarExito(msgExito || 'Promo Flash actualizada en la tienda.')
    } catch (err: any) {
      notificarError(err?.message || 'Error al guardar la Promo Flash.')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex items-center justify-center gap-2.5 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin text-amber-500" />
        <span>Cargando Promo Flash...</span>
      </div>
    )
  }

  const vendidas = estado?.vendidas ?? 0
  const restantes = estado?.restantes ?? 0
  const porcentaje = estado?.porcentajeConsumido ?? 0
  const fechaHoy = estado?.fechaHoy || obtenerFechaHoyArgentinaSimple()

  const badgeEstado = (() => {
    if (!estado) return { texto: 'Cargando', clases: 'bg-slate-100 text-slate-600' }
    if (estado.disponible) {
      return {
        texto: 'ACTIVA EN TIENDA',
        clases: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      }
    }
    if (estado.motivo === 'agotada') {
      return {
        texto: 'AGOTADA AUTOMÁTICAMENTE',
        clases: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
      }
    }
    if (estado.motivo === 'vencida') {
      return {
        texto: 'VENCIDA (OTRA FECHA)',
        clases: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      }
    }
    return {
      texto: 'PAUSADA',
      clases: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    }
  })()

  return (
    <div className="space-y-6">
      {/* Cabecera de estado en vivo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <Flame size={18} />
            </span>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Promo Flash · Burger Cheese a {formatearPrecio(form.precioPromo)}
            </h2>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${badgeEstado.clases}`}>
              {badgeEstado.texto}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rige únicamente para la fecha configurada y se <strong>desactiva sola</strong> en cuanto el sistema registra el límite de hamburguesas vendidas.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void cargarEstado()}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Actualizar contador</span>
          </button>

          <button
            type="button"
            disabled={guardando}
            onClick={() =>
              void guardar(
                { activa: !form.activa, fechaVigencia: !form.activa ? fechaHoy : form.fechaVigencia },
                form.activa ? 'Promo Flash pausada.' : 'Promo Flash activada para hoy.'
              )
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-50 ${
              form.activa
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-chefsy hover:bg-chefsy-700 text-white'
            }`}
          >
            <Power size={14} />
            <span>{form.activa ? 'Pausar promo' : 'Activar hoy'}</span>
          </button>
        </div>
      </div>

      {/* Tarjeta de contador en vivo */}
      <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Cupo consumido ({form.fechaVigencia})
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {vendidas} <span className="text-sm font-bold text-slate-400">/ {form.limiteTotal} hamburguesas</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Disponibles ahora
            </p>
            <p className={`text-2xl font-black tabular-nums ${restantes > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {restantes}
            </p>
          </div>
        </div>

        <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            style={{ width: `${porcentaje}%` }}
            className={`h-full rounded-full transition-all duration-300 ${
              porcentaje >= 100
                ? 'bg-rose-500'
                : porcentaje >= 75
                  ? 'bg-orange-500'
                  : 'bg-amber-400'
            }`}
          />
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
          <span>
            Cuenta pedidos reales de tienda online y mostrador/POS (ignora cancelados y pedidos de prueba). Al llegar a {form.limiteTotal}, el servidor rechaza compras nuevas y la apaga sola.
          </span>
        </p>
      </div>

      {/* Formulario de configuración */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Límite total */}
          <div className="space-y-2">
            <label htmlFor="promo-limite" className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              Límite total de hamburguesas
            </label>
            <input
              id="promo-limite"
              type="number"
              min={1}
              max={1000}
              value={form.limiteTotal}
              onChange={(e) => setForm((prev) => ({ ...prev, limiteTotal: Math.max(1, Number(e.target.value) || 1) }))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-black tabular-nums outline-none focus:ring-2 focus:ring-amber-400/50"
            />
            <div className="flex flex-wrap gap-1.5">
              {PRESETS_LIMITE.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, limiteTotal: n }))}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    form.limiteTotal === n
                      ? 'bg-amber-400 text-stone-950'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Máximo por pedido */}
          <div className="space-y-2">
            <label htmlFor="promo-max-pedido" className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              Máximo por pedido
            </label>
            <input
              id="promo-max-pedido"
              type="number"
              min={1}
              max={20}
              value={form.maxPorPedido}
              onChange={(e) => setForm((prev) => ({ ...prev, maxPorPedido: Math.max(1, Number(e.target.value) || 1) }))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-black tabular-nums outline-none focus:ring-2 focus:ring-amber-400/50"
            />
            <p className="text-[11px] text-slate-400">
              Evita que una sola persona se lleve todo el cupo en un pedido.
            </p>
          </div>

          {/* Fecha de vigencia (Solo por hoy) */}
          <div className="space-y-2">
            <label htmlFor="promo-fecha" className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              Fecha de vigencia (Solo por hoy)
            </label>
            <div className="flex gap-1.5">
              <input
                id="promo-fecha"
                type="date"
                value={form.fechaVigencia}
                onChange={(e) => setForm((prev) => ({ ...prev, fechaVigencia: e.target.value }))}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-400/50"
              />
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, fechaVigencia: fechaHoy }))}
                title="Establecer fecha de hoy"
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Calendar size={13} />
                <span>Hoy</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Hoy negocio: <span className="font-mono font-semibold">{fechaHoy}</span>
            </p>
          </div>
        </div>

        {/* Precios y textos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="promo-precio" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Precio promo ($)
              </label>
              <input
                id="promo-precio"
                type="number"
                min={500}
                step={100}
                value={form.precioPromo}
                onChange={(e) => setForm((prev) => ({ ...prev, precioPromo: Math.max(500, Number(e.target.value) || 5000) }))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-black tabular-nums outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div>
              <label htmlFor="promo-regular" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Precio tachado ($)
              </label>
              <input
                id="promo-regular"
                type="number"
                min={500}
                step={100}
                value={form.precioRegular}
                onChange={(e) => setForm((prev) => ({ ...prev, precioRegular: Math.max(500, Number(e.target.value) || 8500) }))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="promo-subtitulo" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Frase divertida en el cartel
            </label>
            <input
              id="promo-subtitulo"
              type="text"
              maxLength={180}
              value={form.subtitulo}
              onChange={(e) => setForm((prev) => ({ ...prev, subtitulo: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-400/50"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="text-[11px] text-slate-400 inline-flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-500" />
            Los cambios se reflejan en vivo en <strong>/tienda</strong>.
          </span>

          <button
            type="button"
            disabled={guardando}
            onClick={() => void guardar()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-chefsy hover:bg-chefsy-700 text-white text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-50"
          >
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{guardando ? 'Guardando...' : 'Guardar configuración'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
