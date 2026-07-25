'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
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
  const [configuracion, setConfiguracion] = useState<ConfiguracionTienda | null>(() => {
    if (typeof window !== 'undefined') {
      return getCache<ConfiguracionTienda>('chefsy_configuracion_cache', TTL_CONFIG_HS)
    }
    return null
  })
  const [cargando, setCargando] = useState(true)

  // Cargar desde DB al iniciar
  useEffect(() => {
    async function cargarConfiguracion() {
      try {
        const configDB = await obtenerConfiguracionTienda()
        setConfiguracion(configDB)
        if (typeof window !== 'undefined' && configDB) {
          setCache('chefsy_configuracion_cache', configDB)
        }
      } catch (error) {
        console.error('Error cargando configuracion:', error)
      } finally {
        setCargando(false)
      }
    }
    cargarConfiguracion()
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

  return (
    <ConfiguracionContext.Provider value={{ configuracion, setConfiguracion, cargando }}>
      {children}
    </ConfiguracionContext.Provider>
  )
}
