'use client'

// app/auth/callback/page.tsx
// Destino del redirect de Google OAuth.
// Maneja tanto PKCE (?code=xxx) como Implicit (#access_token=xxx).

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [estado, setEstado] = useState<'procesando' | 'ok' | 'error'>('procesando')

  useEffect(() => {
    const procesarCallback = async () => {
      try {
        // ── 1. PKCE: ?code=xxx en la query string (más seguro, default en Supabase v2) ──
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('[Auth Callback] Error PKCE:', error.message)
            setEstado('error')
            setTimeout(() => router.replace('/'), 2000)
            return
          }
          if (data.session) {
            setEstado('ok')
            setTimeout(() => router.replace('/'), 400)
            return
          }
        }

        // ── 2. Implicit: #access_token=xxx en el hash ──
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken  = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            console.error('[Auth Callback] Error implicit:', error.message)
            setEstado('error')
            setTimeout(() => router.replace('/'), 2000)
            return
          }
          if (data.session) {
            setEstado('ok')
            setTimeout(() => router.replace('/'), 400)
            return
          }
        }

        // ── 3. Fallback: verificar si Supabase ya procesó la sesión ──
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setEstado('ok')
          setTimeout(() => router.replace('/'), 400)
          return
        }

        // Sin sesión — redirigir igual
        console.warn('[Auth Callback] No se encontró sesión. Redirigiendo...')
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
            <div className="w-8 h-8 border-2 border-chefsy-500/30 border-t-chefsy-500 rounded-full animate-spin" />
            <p className="text-slate-300 font-medium text-sm">Iniciando sesión con Google...</p>
          </div>
          <p className="text-slate-600 text-xs">Serás redirigido en un momento</p>
        </>
      )}

      {estado === 'ok' && (
        <div className="flex flex-col items-center gap-2 animate-in fade-in duration-300">
          <div className="text-3xl">✅</div>
          <p className="text-emerald-400 font-bold">¡Sesión iniciada!</p>
          <p className="text-slate-500 text-xs">Redirigiendo a la tienda...</p>
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
