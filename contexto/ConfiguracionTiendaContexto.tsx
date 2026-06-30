'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { ConfiguracionTienda, obtenerConfiguracionTienda } from '@/servicios/supabase/configuracion'

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
      try {
        const cache = localStorage.getItem('chefsy_configuracion_cache')
        if (cache) return JSON.parse(cache)
      } catch (e) {}
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
          try {
            localStorage.setItem('chefsy_configuracion_cache', JSON.stringify(configDB))
          } catch (e) {}
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
        document.documentElement.style.setProperty('--chefsy-main', configuracion.color_principal)
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('chefsy_configuracion_cache', JSON.stringify(configuracion))
        } catch (e) {}
      }
    }
  }, [configuracion])

  return (
    <ConfiguracionContext.Provider value={{ configuracion, setConfiguracion, cargando }}>
      {children}
    </ConfiguracionContext.Provider>
  )
}
