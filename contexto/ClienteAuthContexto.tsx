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

  const cargarPerfil = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (data && !error) {
        setPerfil(data as PerfilCliente)
      } else {
        // Si no existe, seteamos null. El trigger de la DB debería crearlo automáticamente.
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
        cargarPerfil(session.user.id).finally(() => setEstaListo(true))
      } else {
        setEstaListo(true)
      }
    })

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUsuario(session?.user ?? null)
        if (session?.user) {
          await cargarPerfil(session.user.id)
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
    await supabase.auth.signOut()
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
