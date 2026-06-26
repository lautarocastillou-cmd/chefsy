'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Session, User } from '@supabase/supabase-js'

export interface PerfilCliente {
  id: string
  nombre: string | null
  telefono: string | null
  puntos_actuales: number
}

interface ValorContextoClienteAuth {
  usuario: User | null
  perfil: PerfilCliente | null
  estaListo: boolean
  iniciarSesionGoogle: () => Promise<void>
  enviarOtpTelefono: (telefono: string) => Promise<{ error: any }>
  verificarOtpTelefono: (telefono: string, token: string) => Promise<{ error: any }>
  cerrarSesion: () => Promise<void>
}

const ContextoClienteAuth = createContext<ValorContextoClienteAuth | undefined>(undefined)

export function ProveedorClienteAuth({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<PerfilCliente | null>(null)
  const [estaListo, setEstaListo] = useState(false)

  const cargarPerfil = async (user: User) => {
    try {
      let { data: perfilCliente, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', user.id)
        .single()

      // Si no existe, lo creamos
      if (!perfilCliente || (error && error.code === 'PGRST116')) {
        const nuevoPerfil = {
          id: user.id,
          nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
          telefono: user.phone || null,
          puntos_actuales: 0
        }
        
        const { error: insertError } = await supabase
          .from('clientes')
          .insert(nuevoPerfil)
          
        if (!insertError) {
          setPerfil(nuevoPerfil as PerfilCliente)
        } else {
          setPerfil(null)
        }
      } else if (perfilCliente) {
        setPerfil(perfilCliente as PerfilCliente)
      } else {
        setPerfil(null)
      }
    } catch (e) {
      console.error('Error cargando perfil del cliente:', e)
      setPerfil(null)
    }
  }

  useEffect(() => {
    // Restaurar sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null)
      if (session?.user) {
        cargarPerfil(session.user).finally(() => setEstaListo(true))
      } else {
        setEstaListo(true)
      }
    })

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUsuario(session?.user ?? null)
        if (session?.user) {
          await cargarPerfil(session.user)
        } else {
          setPerfil(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const iniciarSesionGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined
      }
    })
  }

  const enviarOtpTelefono = async (telefono: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone: telefono,
    })
    return { error }
  }

  const verificarOtpTelefono = async (telefono: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: telefono,
      token,
      type: 'sms',
    })
    return { error }
  }

  const cerrarSesion = async () => {
    setUsuario(null)
    setPerfil(null)
    await supabase.auth.signOut().catch(() => {})
  }

  return (
    <ContextoClienteAuth.Provider
      value={{
        usuario,
        perfil,
        estaListo,
        iniciarSesionGoogle,
        enviarOtpTelefono,
        verificarOtpTelefono,
        cerrarSesion,
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
