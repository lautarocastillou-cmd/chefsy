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
    let cancelado = false

    const redirigirAlHome = () => {
      setEstado('ok')
      setTimeout(() => {
        window.location.href = '/'
      }, 300)
    }

    const procesarCallback = async () => {
      try {
        // ── 1. PKCE: ?code=xxx en la query string ──
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error && data?.session) {
            redirigirAlHome()
            return
          }
          if (error) {
            console.warn('[Auth Callback] Advertencia canjeando code (posible auto-detect previo):', error.message)
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
          if (!error && data?.session) {
            redirigirAlHome()
            return
          }
        }

        // ── 3. Fallback inteligente: esperar a que Supabase termine de procesar la sesión en segundo plano ──
        for (let i = 0; i < 12; i++) {
          if (cancelado) return
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            redirigirAlHome()
            return
          }
          await new Promise(r => setTimeout(r, 200))
        }

        // Si no se detectó sesión después de 2.4 segundos, redirigir recargando igual
        console.warn('[Auth Callback] No se detectó sesión tras callback. Redirigiendo...')
        window.location.href = '/'
      } catch (err) {
        console.error('[Auth Callback] Error inesperado:', err)
        window.location.href = '/'
      }
    }

    procesarCallback()

    return () => {
      cancelado = true
    }
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
