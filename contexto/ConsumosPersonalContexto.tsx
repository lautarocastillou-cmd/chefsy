'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ConsumoPersonal, NuevoConsumoPayload } from '@/tipos/consumo'
import { usarCatalogo } from './CatalogoContexto'
import { getCache, setCache } from '@/lib/localCache'
import { toast } from 'react-hot-toast'

// ─────────────────────────────────────────────────────
// contexto/ConsumosPersonalContexto.tsx
// Gestión del estado de consumos internos del personal y deudas de sueldo.
// ─────────────────────────────────────────────────────

const CACHE_KEY_CONSUMOS = 'chefsy-consumos-personal-v1'
const TTL_HS = 24 * 30 // 30 días en caché local

interface ValorContextoConsumos {
  consumos: ConsumoPersonal[]
  cargando: boolean
  registrarConsumo: (payload: NuevoConsumoPayload) => Promise<boolean>
  marcarSaldado: (id: string, saldado: boolean) => Promise<void>
  saldarPersona: (personaNombre: string) => Promise<void>
  eliminarConsumo: (id: string) => Promise<void>
  refrescarConsumos: () => Promise<void>
  totalDeudaPendiente: number
  totalPagadoMomento: number
  deudasPorPersona: Array<{ persona: string; deuda: number; cantidadConsumos: number }>
}

const ContextoConsumos = createContext<ValorContextoConsumos | undefined>(undefined)

export function ProveedorConsumosPersonal({ children }: { children: React.ReactNode }) {
  const [consumos, setConsumos] = useState<ConsumoPersonal[]>([])
  const [cargando, setCargando] = useState(true)
  const { descontarStockProducto } = usarCatalogo()

  // Cargar consumos iniciales
  const refrescarConsumos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/consumos-personal')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setConsumos(data)
          setCache(CACHE_KEY_CONSUMOS, data)
        }
      }
    } catch (err) {
      console.error('[Consumos] Error cargando desde servidor:', err)
      const cached = getCache<ConsumoPersonal[]>(CACHE_KEY_CONSUMOS, TTL_HS)
      if (cached) setConsumos(cached)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    const cached = getCache<ConsumoPersonal[]>(CACHE_KEY_CONSUMOS, TTL_HS)
    if (cached) {
      setConsumos(cached)
      setCargando(false)
    }
    refrescarConsumos()
  }, [refrescarConsumos])

  // 1. Registrar un nuevo consumo interno
  const registrarConsumo = async (payload: NuevoConsumoPayload): Promise<boolean> => {
    try {
      // Descontar stock inmediatamente si corresponde
      if (payload.descontar_stock !== false && payload.producto_id) {
        descontarStockProducto(payload.producto_id, payload.cantidad || 1)
      }

      const res = await fetch('/api/admin/consumos-personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'crear', consumo: payload }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al registrar consumo')
      }

      const data = await res.json()
      if (data.consumo) {
        setConsumos((prev) => {
          const nuevos = [data.consumo, ...prev]
          setCache(CACHE_KEY_CONSUMOS, nuevos)
          return nuevos
        })
      }

      toast.success(
        payload.tipo_pago === 'anotado'
          ? `📝 Consumo anotado a ${payload.persona_nombre} ($${(payload.precio * payload.cantidad).toLocaleString('es-AR')})`
          : `💵 Consumo de ${payload.persona_nombre} registrado (Pagado)`,
        { icon: '🥤' }
      )
      return true
    } catch (error: any) {
      console.error('[Consumos] Error al registrar:', error)
      toast.error(error.message || 'No se pudo registrar el consumo')
      return false
    }
  }

  // 2. Marcar un consumo como saldado
  const marcarSaldado = async (id: string, saldado: boolean) => {
    // Optimista
    setConsumos((prev) => {
      const actualizados = prev.map((c) => (c.id === id ? { ...c, saldado } : c))
      setCache(CACHE_KEY_CONSUMOS, actualizados)
      return actualizados
    })

    try {
      await fetch('/api/admin/consumos-personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'marcar_saldado', id, saldado }),
      })
      toast.success(saldado ? '✅ Marcado como saldado' : '↩️ Marcado como pendiente')
    } catch (err) {
      console.error('[Consumos] Error al saldar:', err)
      refrescarConsumos()
    }
  }

  // 3. Saldar todos los consumos pendientes de una persona (ej: al pagar el sueldo)
  const saldarPersona = async (personaNombre: string) => {
    setConsumos((prev) => {
      const actualizados = prev.map((c) =>
        c.persona_nombre.toLowerCase() === personaNombre.toLowerCase() && c.tipo_pago === 'anotado'
          ? { ...c, saldado: true }
          : c
      )
      setCache(CACHE_KEY_CONSUMOS, actualizados)
      return actualizados
    })

    try {
      await fetch('/api/admin/consumos-personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'saldar_persona', persona_nombre: personaNombre }),
      })
      toast.success(`🎉 Se saldaron todos los consumos anotados de ${personaNombre}`)
    } catch (err) {
      console.error('[Consumos] Error al saldar persona:', err)
      refrescarConsumos()
    }
  }

  // 4. Eliminar registro de consumo
  const eliminarConsumo = async (id: string) => {
    setConsumos((prev) => {
      const actualizados = prev.filter((c) => c.id !== id)
      setCache(CACHE_KEY_CONSUMOS, actualizados)
      return actualizados
    })

    try {
      await fetch('/api/admin/consumos-personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'eliminar', id }),
      })
      toast.success('🗑️ Registro de consumo eliminado')
    } catch (err) {
      console.error('[Consumos] Error al eliminar:', err)
      refrescarConsumos()
    }
  }

  // Cálculos agregados
  const totalDeudaPendiente = useMemo(() => {
    return consumos
      .filter((c) => c.tipo_pago === 'anotado' && !c.saldado)
      .reduce((acc, c) => acc + (c.total || c.precio * c.cantidad), 0)
  }, [consumos])

  const totalPagadoMomento = useMemo(() => {
    return consumos
      .filter((c) => c.tipo_pago === 'pagado')
      .reduce((acc, c) => acc + (c.total || c.precio * c.cantidad), 0)
  }, [consumos])

  const deudasPorPersona = useMemo(() => {
    const mapa: Record<string, { deuda: number; cantidadConsumos: number }> = {}
    consumos.forEach((c) => {
      const nombre = c.persona_nombre.trim()
      if (!mapa[nombre]) {
        mapa[nombre] = { deuda: 0, cantidadConsumos: 0 }
      }
      if (c.tipo_pago === 'anotado' && !c.saldado) {
        mapa[nombre].deuda += c.total || c.precio * c.cantidad
        mapa[nombre].cantidadConsumos += 1
      }
    })

    return Object.entries(mapa)
      .map(([persona, datos]) => ({
        persona,
        deuda: datos.deuda,
        cantidadConsumos: datos.cantidadConsumos,
      }))
      .filter((d) => d.deuda > 0)
      .sort((a, b) => b.deuda - a.deuda)
  }, [consumos])

  return (
    <ContextoConsumos.Provider
      value={{
        consumos,
        cargando,
        registrarConsumo,
        marcarSaldado,
        saldarPersona,
        eliminarConsumo,
        refrescarConsumos,
        totalDeudaPendiente,
        totalPagadoMomento,
        deudasPorPersona,
      }}
    >
      {children}
    </ContextoConsumos.Provider>
  )
}

export function usarConsumosPersonal(): ValorContextoConsumos {
  const contexto = useContext(ContextoConsumos)
  if (!contexto) {
    throw new Error('usarConsumosPersonal debe usarse dentro de un ProveedorConsumosPersonal')
  }
  return contexto
}
