'use client'

// app/auth/callback/page.tsx
// Destino del redirect de Google OAuth.
// Lee el hash #access_token=... que deja Supabase,
// establece la sesión y redirige al inicio.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [estado, setEstado] = useState<'procesando' | 'ok' | 'error'>('procesando')

  useEffect(() => {
    const procesarCallback = async () => {
      try {
        // El hash contiene #access_token=xxx&refresh_token=yyy&...
        const hash = window.location.hash.substring(1) // quitar el '#'
        const params = new URLSearchParams(hash)

        const accessToken  = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          // Establecer la sesión manualmente con los tokens del hash
          const { data, error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error('[Auth Callback] Error al establecer sesión:', error.message)
            setEstado('error')
            setTimeout(() => router.replace('/'), 2000)
            return
          }

          if (data.session) {
            setEstado('ok')
            // Limpiar el hash de la URL antes de redirigir
            window.history.replaceState(null, '', '/auth/callback')
            // Pequeño delay para que el estado se propague
            setTimeout(() => router.replace('/'), 300)
            return
          }
        }

        // Si no hay tokens en el hash, tal vez vino de PKCE con ?code=
        // Supabase lo maneja automáticamente con exchangeCodeForSession
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setEstado('ok')
          setTimeout(() => router.replace('/'), 300)
          return
        }

        // Sin sesión — redirigir igual
        router.replace('/')
      } catch (err) {
        console.error('[Auth Callback] Error inesperado:', err)
        router.replace('/')
      }
    }

    procesarCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex flex-col items-center justify-center gap-6 text-white font-sans">
      {/* Logo animado */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl shadow-chefsy/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Chefsy" className="w-full h-full object-cover" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-chefsy-500 rounded-full border-2 border-[#0c0c0c] animate-pulse" />
      </div>

      {estado === 'procesando' && (
        <>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-chefsy-500/30 border-t-chefsy-500 rounded-full animate-spin" />
            <p className="text-slate-300 font-medium text-sm">Iniciando sesión con Google...</p>
          </div>
          <p className="text-slate-600 text-xs">Serás redirigido en un momento</p>
        </>
      )}

      {estado === 'ok' && (
        <div className="flex flex-col items-center gap-2 animate-in fade-in duration-300">
          <div className="text-3xl">✅</div>
          <p className="text-emerald-400 font-bold">¡Sesión iniciada!</p>
          <p className="text-slate-500 text-xs">Redirigiendo...</p>
        </div>
      )}

      {estado === 'error' && (
        <div className="flex flex-col items-center gap-2 animate-in fade-in duration-300">
          <div className="text-3xl">⚠️</div>
          <p className="text-red-400 font-bold">Hubo un problema al iniciar sesión</p>
          <p className="text-slate-500 text-xs">Redirigiendo a la tienda...</p>
        </div>
      )}
    </div>
  )
}
