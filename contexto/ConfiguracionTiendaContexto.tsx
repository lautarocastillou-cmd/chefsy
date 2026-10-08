'use client'

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { ConfiguracionTienda, obtenerConfiguracionTienda } from '@/servicios/supabase/configuracion'
import { setCache, getCache } from '@/lib/localCache'

// TTL de la configuración de tienda: 1 hora.
// Si cambiás el logo, color o banner, los clientes lo verán en máximo 1 hora.
const TTL_CONFIG_HS = 1

interface ConfiguracionContextType {
  configuracion: ConfiguracionTienda | null
  setConfiguracion: React.Dispatch<React.SetStateAction<ConfiguracionTienda | null>>
  cargando: boolean
}

export const ConfiguracionContext = createContext<ConfiguracionContextType>({
  configuracion: null,
  setConfiguracion: () => {},
  cargando: true,
})

export const usarConfiguracionTienda = () => useContext(ConfiguracionContext)

export const ConfiguracionTiendaProvider = ({ children }: { children: React.ReactNode }) => {
  // Inicializar en null garantiza coincidencia estricta 1:1 entre SSR y el primer render del cliente (evita error #418)
  const [configuracion, setConfiguracion] = useState<ConfiguracionTienda | null>(null)
  const [cargando, setCargando] = useState(true)

  // Cargar desde DB y caché local al montar en cliente
  useEffect(() => {
    // 1. Restaurar de caché local inmediatamente tras montar en cliente sin desfase de hidratación
    const cacheLocal = getCache<ConfiguracionTienda>('chefsy_configuracion_cache', TTL_CONFIG_HS)
    if (cacheLocal) {
      setConfiguracion(cacheLocal)
    }

    async function cargarConfiguracion() {
      try {
        const configDB = await obtenerConfiguracionTienda()
        if (configDB) {
          setConfiguracion(configDB)
          if (typeof window !== 'undefined') {
            setCache('chefsy_configuracion_cache', configDB)
          }
        }
      } catch (error) {
        console.error('Error cargando configuracion:', error)
      } finally {
        setCargando(false)
      }
    }
    cargarConfiguracion()

    // 2. Sincronizar en tiempo real si el editor guarda cambios
    const handleCambio = (e: any) => {
      if (e.detail) {
        setConfiguracion(e.detail)
      }
    }
    window.addEventListener('chefsy_configuracion_cambiada', handleCambio)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('chefsy_canal_configuracion')
      bc.onmessage = (event) => {
        if (event.data?.tipo === 'configuracion_actualizada' && event.data.data) {
          setConfiguracion(event.data.data)
        }
      }
    } catch {}

    return () => {
      window.removeEventListener('chefsy_configuracion_cambiada', handleCambio)
      if (bc) bc.close()
    }
  }, [])

  // Inyectar el color y guardar en caché local dinámicamente cuando cambia la configuración
  useEffect(() => {
    if (configuracion) {
      if (configuracion.color_principal) {
        const parts = configuracion.color_principal.split('|')
        const brandColor = parts[0] || '#2A6348'
        const textHero1 = parts[1] || '#ffffff'
        const textHero2 = parts[2] || brandColor
        const textMenu = parts[3] || '#ffffff'

        document.documentElement.style.setProperty('--chefsy-main', brandColor)
        document.documentElement.style.setProperty('--chefsy-text-hero-1', textHero1)
        document.documentElement.style.setProperty('--chefsy-text-hero-2', textHero2)
        document.documentElement.style.setProperty('--chefsy-text-menu', textMenu)
      }
      if (typeof window !== 'undefined') {
        setCache('chefsy_configuracion_cache', configuracion)
      }
    }
  }, [configuracion])

  // Memorizado: sin esto el objeto de valor se crea nuevo en cada render y
  // React redibuja a todos los consumidores aunque no haya cambiado nada.
  const valor = useMemo(
    () => ({ configuracion, setConfiguracion, cargando }),
    [configuracion, cargando]
  )

  return (
    <ConfiguracionContext.Provider value={valor}>
      {children}
    </ConfiguracionContext.Provider>
  )
}
