'use client'

import { useState } from 'react'
import { usarAuth } from '@/contexto/AuthContexto'
import { KeyRound, User, Lock, AlertTriangle, ShieldCheck, Bike } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const { iniciarSesion } = usarAuth()
  const router = useRouter()
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const uLimpio = usuario.trim()
    const cLimpia = clave.trim()

    if (!uLimpio || !cLimpia) {
      setError('Por favor, completa todos los campos.')
      return
    }

    setCargando(true)
    try {
      const exito = await iniciarSesion(uLimpio, cLimpia)
      if (exito) {
        if (uLimpio.toLowerCase() === 'cadete') {
          router.push('/cadeteria')
        } else {
          router.push('/dashboard')
        }
      } else {
        setError('Usuario o contraseña incorrectos.')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-chefsy-900 via-slate-900 to-chefsy-800 p-4 relative overflow-hidden font-sans">
      {/* Círculos decorativos abstractos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-chefsy-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Tarjeta Principal de Login */}
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl border border-white/20 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 z-10 transition-all">
        {/* Logo y Encabezado */}
        <div className="text-center space-y-3">
          <div className="inline-block relative">
            <img
              src="/logo.jpg"
              alt="Chefsy Logo"
              className="w-20 h-20 mx-auto object-contain rounded-2xl bg-white border border-slate-100 p-1 shadow-md"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Ingreso a Chefsy
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-400">
              Sistema Interno de Gestión de Pedidos
            </p>
          </div>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-150 dark:border-red-900/50 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300 font-semibold animate-in fade-in zoom-in-95 duration-200">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={manejarEnvio} className="space-y-4">
          {/* Campo Usuario */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-450 dark:text-slate-350 uppercase tracking-wider block">
              Usuario
            </label>
            <div className="relative flex items-center">
              <User size={16} className="absolute left-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ingresá tu usuario"
                disabled={cargando}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 disabled:opacity-50 transition-all"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-450 dark:text-slate-350 uppercase tracking-wider block">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="••••••••"
                disabled={cargando}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 disabled:opacity-50 transition-all"
              />
            </div>
          </div>

          {/* Botón de Submit */}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-chefsy hover:bg-chefsy-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cargando ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound size={14} />
                Ingresar al Sistema
              </>
            )}
          </button>
        </form>

        {/* Credenciales de Prueba */}
        <div className="bg-slate-50 dark:bg-slate-800/35 border border-slate-150 dark:border-slate-800/60 rounded-2xl p-4 space-y-2.5 text-xs">
          <h4 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[0.7rem] border-b border-slate-200/50 dark:border-slate-800/60 pb-1.5 flex items-center gap-1">
            🔑 Credenciales de Prueba
          </h4>
          <div className="grid grid-cols-2 gap-3 text-slate-650 dark:text-slate-300">
            {/* Admin */}
            <div className="space-y-0.5">
              <span className="flex items-center gap-1 font-bold text-slate-850 dark:text-slate-200">
                <ShieldCheck size={12} className="text-emerald-500" /> Administrador
              </span>
              <p className="font-mono text-slate-400 dark:text-slate-500 text-[0.7rem]">User: admin<br />Pass: admin</p>
            </div>
            {/* Cadete */}
            <div className="space-y-0.5">
              <span className="flex items-center gap-1 font-bold text-slate-850 dark:text-slate-200">
                <Bike size={12} className="text-blue-500" /> Cadete / Delivery
              </span>
              <p className="font-mono text-slate-400 dark:text-slate-500 text-[0.7rem]">User: cadete<br />Pass: cadete</p>
            </div>
          </div>
        </div>

        {/* Enlace público a la tienda */}
        <div className="pt-3 text-center border-t border-slate-200/50 dark:border-slate-850/60 flex flex-col items-center gap-1.5">
          <Link
            href="/tienda"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all active:scale-98"
          >
            🏪 Tienda
          </Link>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold animate-pulse">
            ⚠️ En construcción
          </span>
        </div>
      </div>
    </div>
  )
}
