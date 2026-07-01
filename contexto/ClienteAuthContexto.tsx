'use client'

// ─────────────────────────────────────────────────────
// contexto/ClienteAuthContexto.tsx
// Autenticación de clientes de la tienda.
// - Sistema propio: nombre + teléfono + contraseña (JWT HttpOnly cookie)
// - Google OAuth como opción alternativa (Supabase Auth)
// ─────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export interface PerfilCliente {
  id:              string
  nombre:          string | null
  telefono:        string | null
  puntos_actuales: number
}

// Fuente de la sesión: sistema propio vs Google
type FuenteSesion = 'propio' | 'google' | null

interface ValorContextoClienteAuth {
  perfil:         PerfilCliente | null
  estaListo:      boolean
  fuenteSesion:   FuenteSesion
  // Sistema propio
  registrar:      (nombre: string, telefono: string, clave: string) => Promise<{ error: string | null }>
  iniciarSesion:  (telefono: string, clave: string) => Promise<{ error: string | null }>
  // Google OAuth (alternativa)
  iniciarSesionGoogle: () => Promise<void>
  // Común
  cerrarSesion:   () => Promise<void>
  // Alias de conveniencia (algunos componentes usan `usuario`)
  usuario:        PerfilCliente | null
}

const ContextoClienteAuth = createContext<ValorContextoClienteAuth | undefined>(undefined)

export function ProveedorClienteAuth({ children }: { children: ReactNode }) {
  const [perfil,       setPerfil]       = useState<PerfilCliente | null>(null)
  const [estaListo,    setEstaListo]    = useState(false)
  const [fuenteSesion, setFuenteSesion] = useState<FuenteSesion>(null)

  // ── Restaurar sesión al montar ─────────────────────────────────────────
  useEffect(() => {
    let cancelado = false
    // Flag que indica si el sistema propio ya determinó el estado (con o sin sesión)
    let resolucionPropiaCompletada = false

    const restaurar = async () => {
      // 1. Intentar sesión del sistema propio (cookie HttpOnly)
      try {
        const res = await fetch('/api/clientes/sesion', { credentials: 'same-origin', cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.perfil && !cancelado) {
            setPerfil(data.perfil)
            setFuenteSesion('propio')
            setEstaListo(true)
            resolucionPropiaCompletada = true
            return
          }
        }
      } catch { /* sin conexión — continuar */ }

      // 2. No hay sesión propia. Ahora sí delegamos a Supabase/Google.
      resolucionPropiaCompletada = true

      // Verificar sesión de Google directamente
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && !cancelado) {
          await cargarPerfilGoogle(session.user.id, session.user)
        }
      } catch { /* continuar */ }

      if (!cancelado) setEstaListo(true)
    }

    // Registrar onAuthStateChange. Solo actúa sobre eventos DESPUÉS de que la
    // sesión propia fue descartada, para evitar conflictos entre sistemas.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelado) return
      // Si la sesión propia aún está siendo verificada, ignorar todos los eventos
      if (!resolucionPropiaCompletada) return

      if (session?.user) {
        await cargarPerfilGoogle(session.user.id, session.user)
        setEstaListo(true)
      } else if (event === 'SIGNED_OUT') {
        setPerfil(null)
        setFuenteSesion(null)
        setEstaListo(true)
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No hay sesión de Google ni propia
        setEstaListo(true)
      }
    })

    restaurar()

    return () => {
      cancelado = true
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Cargar perfil de Google desde la tabla clientes ────────────────────
  const cargarPerfilGoogle = async (uid: string, user: { user_metadata?: any; email?: string; phone?: string }) => {
    const fallback: PerfilCliente = {
      id:              uid,
      nombre:          user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
      telefono:        user.phone || null,
      puntos_actuales: 0,
    }

    try {
      const { data } = await supabase
        .from('clientes')
        .select('id, nombre, telefono, puntos_actuales')
        .eq('id', uid)
        .maybeSingle()

      if (data) {
        setPerfil(data as PerfilCliente)
      } else {
        // Crear registro en tabla clientes para este usuario de Google
        const { error: insertErr } = await supabase
          .from('clientes')
          .upsert({ id: uid, nombre: fallback.nombre, telefono: fallback.telefono, puntos_actuales: 0 })
        setPerfil(fallback)
        if (insertErr) console.warn('[ClienteAuth] No se pudo insertar perfil Google:', insertErr.message)
      }
    } catch {
      setPerfil(fallback)
    }
    setFuenteSesion('google')
  }

  // ── Sistema Propio: Registrar ──────────────────────────────────────────
  const registrar = useCallback(async (
    nombre:   string,
    telefono: string,
    clave:    string
  ): Promise<{ error: string | null }> => {
    try {
      const res = await fetch('/api/clientes/registro', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body:        JSON.stringify({ nombre, telefono, clave }),
      })
      const data = await res.json()
      if (!res.ok) return { error: data.error || 'Error al registrarse.' }
      setPerfil(data.perfil)
      setFuenteSesion('propio')
      return { error: null }
    } catch {
      return { error: 'Error de conexión. Verificá tu internet.' }
    }
  }, [])

  // ── Sistema Propio: Iniciar sesión ─────────────────────────────────────
  const iniciarSesion = useCallback(async (
    telefono: string,
    clave:    string
  ): Promise<{ error: string | null }> => {
    try {
      const res = await fetch('/api/clientes/login', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body:        JSON.stringify({ telefono, clave }),
      })
      const data = await res.json()
      if (!res.ok) return { error: data.error || 'Credenciales incorrectas.' }
      setPerfil(data.perfil)
      setFuenteSesion('propio')
      return { error: null }
    } catch {
      return { error: 'Error de conexión. Verificá tu internet.' }
    }
  }, [])

  // ── Google OAuth ───────────────────────────────────────────────────────
  const iniciarSesionGoogle = useCallback(async () => {
    // Redirigir a /auth/callback para que procese el hash correctamente
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'https://chefsy.xyz/auth/callback'
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    })
  }, [])

  // ── Cerrar sesión (ambos sistemas) ─────────────────────────────────────
  const cerrarSesion = useCallback(async () => {
    setPerfil(null)
    setFuenteSesion(null)
    // Cerrar ambos por si acaso
    await Promise.allSettled([
      fetch('/api/clientes/logout', { method: 'POST', credentials: 'same-origin' }),
      supabase.auth.signOut(),
    ])
  }, [])

  return (
    <ContextoClienteAuth.Provider
      value={{
        perfil,
        estaListo,
        fuenteSesion,
        registrar,
        iniciarSesion,
        iniciarSesionGoogle,
        cerrarSesion,
        // Alias para compatibilidad con componentes existentes que usan `usuario`
        usuario: perfil,
      }}
    >
      {children}
    </ContextoClienteAuth.Provider>
  )
}

export function usarClienteAuth() {
  const contexto = useContext(ContextoClienteAuth)
  if (contexto === undefined) {
    throw new Error('usarClienteAuth debe usarse dentro de un ProveedorClienteAuth')
  }
  return contexto
}
