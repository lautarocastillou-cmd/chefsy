'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Usuario {
  usuario: string
  nombre: string
  rol: 'admin' | 'cadete'
}

interface ValorContextoAuth {
  usuarioActivo: Usuario | null
  estaListoAuth: boolean
  iniciarSesion: (usuario: string, clave: string) => boolean
  cerrarSesion: () => void
}

const ContextoAuth = createContext<ValorContextoAuth | undefined>(undefined)

const USUARIOS_MOCK: Record<string, { clave: string; nombre: string; rol: 'admin' | 'cadete' }> = {
  admin: { clave: 'admin', nombre: 'Administrador Chefsy', rol: 'admin' },
  cadete: { clave: 'cadete', nombre: 'Delivery Cadete', rol: 'cadete' },
}

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [usuarioActivo, setUsuarioActivo] = useState<Usuario | null>(null)
  const [estaListoAuth, setEstaListoAuth] = useState(false)

  // Cargar sesión guardada al iniciar
  useEffect(() => {
    const sesionGuardada = localStorage.getItem('chefsy-usuario-activo')
    if (sesionGuardada) {
      try {
        setUsuarioActivo(JSON.parse(sesionGuardada))
      } catch {
        localStorage.removeItem('chefsy-usuario-activo')
      }
    }
    setEstaListoAuth(true)
  }, [])

  const iniciarSesion = (usuario: string, clave: string): boolean => {
    const uLimpio = usuario.trim().toLowerCase()
    const match = USUARIOS_MOCK[uLimpio]

    if (match && match.clave === clave) {
      const datosUsuario: Usuario = {
        usuario: uLimpio,
        nombre: match.nombre,
        rol: match.rol,
      }
      setUsuarioActivo(datosUsuario)
      localStorage.setItem('chefsy-usuario-activo', JSON.stringify(datosUsuario))
      return true
    }
    return false
  }

  const cerrarSesion = () => {
    setUsuarioActivo(null)
    localStorage.removeItem('chefsy-usuario-activo')
  }

  return (
    <ContextoAuth.Provider
      value={{
        usuarioActivo,
        estaListoAuth,
        iniciarSesion,
        cerrarSesion,
      }}
    >
      {children}
    </ContextoAuth.Provider>
  )
}

export function usarAuth(): ValorContextoAuth {
  const contexto = useContext(ContextoAuth)
  if (!contexto) {
    throw new Error('usarAuth debe usarse dentro de un ProveedorAuth')
  }
  return contexto
}
