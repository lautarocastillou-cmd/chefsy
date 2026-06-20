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
  const [configuracion, setConfiguracion] = useState<ConfiguracionTienda | null>(null)
  const [cargando, setCargando] = useState(true)

  // Cargar desde DB al iniciar
  useEffect(() => {
    async function cargarConfiguracion() {
      try {
        const configDB = await obtenerConfiguracionTienda()
        setConfiguracion(configDB)
      } catch (error) {
        console.error('Error cargando configuracion:', error)
      } finally {
        setCargando(false)
      }
    }
    cargarConfiguracion()
  }, [])

  // Inyectar el color primario dinámicamente en el documento cuando cambia la configuración
  useEffect(() => {
    if (configuracion?.color_principal) {
      document.documentElement.style.setProperty('--chefsy-main', configuracion.color_principal)
    }
  }, [configuracion?.color_principal])

  return (
    <ConfiguracionContext.Provider value={{ configuracion, setConfiguracion, cargando }}>
      {children}
    </ConfiguracionContext.Provider>
  )
}
