'use client'

// ─────────────────────────────────────────────────────
// contexto/AuthContexto.tsx
// Contexto global de autenticación. Ahora utiliza
// la API del servidor (/api/auth/login y /api/auth/logout)
// para gestionar sesiones seguras con cookies HttpOnly.
// La interfaz pública (usarAuth, ProveedorAuth) es idéntica
// a la versión anterior para mantener compatibilidad total.
// ─────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { setCache, getCache, removeCache } from '@/lib/localCache'

// TTL de la sesión del admin: 8 horas (un turno de trabajo).
// Si la cookie del servidor expira, el caché local tampoco sobrevive.
const TTL_ADMIN_HS = 8

export interface Usuario {
  usuario: string
  nombre:  string
  rol:     'admin' | 'cadete'
}

interface ValorContextoAuth {
  usuarioActivo:  Usuario | null
  estaListoAuth:  boolean
  iniciarSesion:  (usuario: string, clave: string) => Promise<string | null>
  cerrarSesion:   () => Promise<void>
}

const ContextoAuth = createContext<ValorContextoAuth | undefined>(undefined)

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [usuarioActivo, setUsuarioActivo] = useState<Usuario | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return getCache<Usuario>('chefsy_admin_sesion_cache', TTL_ADMIN_HS)
      } catch {}
    }
    return null
  })
  const [estaListoAuth, setEstaListoAuth] = useState(false)

  // Al montar: intentar recuperar la sesión activa consultando el servidor
  useEffect(() => {
    async function restaurarSesion() {
      try {
        const res = await fetch('/api/auth/sesion', { credentials: 'same-origin' })
        if (res.ok) {
          const data = await res.json()
          if (data.usuario) {
            const sesionData = {
              usuario: data.usuario,
              nombre:  data.nombre,
              rol:     data.rol,
            }
            setUsuarioActivo(sesionData)
            try { setCache('chefsy_admin_sesion_cache', sesionData) } catch {}
          } else {
            // El servidor confirma que no hay sesión activa -> limpiar caché
            setUsuarioActivo(null)
            try { removeCache('chefsy_admin_sesion_cache') } catch {}
          }
        }
      } catch {
        // Sin conectividad o timeout — mantener la sesión que se haya cargado de caché offline
      } finally {
        setEstaListoAuth(true)
      }
    }
    restaurarSesion()
  }, [])

  /**
   * Inicia sesión llamando al endpoint del servidor.
   * Retorna true si las credenciales son válidas, false en caso contrario.
   */
  const iniciarSesion = async (usuario: string, clave: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/login', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body:        JSON.stringify({ usuario, clave }),
      })

      if (!res.ok) return null

      const data = await res.json()
      if (data.ok && data.usuario) {
        const sesionData = {
          usuario: data.usuario,
          nombre:  data.nombre,
          rol:     data.rol,
        }
        setUsuarioActivo(sesionData)
        try { setCache('chefsy_admin_sesion_cache', sesionData) } catch {}
        return data.rol
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Cierra la sesión del usuario llamando al endpoint del servidor,
   * que invalida la cookie HttpOnly.
   */
  const cerrarSesion = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method:      'POST',
        credentials: 'same-origin',
      })
    } catch {
      // Continuar aunque falle la llamada
    } finally {
      setUsuarioActivo(null)
      try { removeCache('chefsy_admin_sesion_cache') } catch {}
    }
  }

  return (
    <ContextoAuth.Provider value={{ usuarioActivo, estaListoAuth, iniciarSesion, cerrarSesion }}>
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
