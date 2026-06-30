'use client'

import React, { useState } from 'react'
import { X, Phone, Lock, Eye, EyeOff, User, ArrowRight, ChevronLeft } from 'lucide-react'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'

interface ModalLoginClienteProps {
  onCerrar: () => void
  titulo?:    string
  subtitulo?: string
}

type Pantalla = 'menu' | 'login' | 'registro'

function InputField({
  id, label, type, value, onChange, placeholder, icon: Icon, disabled, rightElement
}: {
  id: string; label: string; type: string; value: string
  onChange: (v: string) => void; placeholder: string
  icon: React.ElementType; disabled?: boolean; rightElement?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-slate-400 tracking-widest uppercase">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={17} />
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={type === 'password' ? 'current-password' : undefined}
          className="w-full bg-[#1a1a1a] border border-white/8 text-white rounded-xl py-3 pl-10 pr-10 text-sm focus:outline-none focus:border-chefsy-500/60 focus:ring-1 focus:ring-chefsy-500/30 transition-all placeholder:text-slate-600 disabled:opacity-50"
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
    </div>
  )
}

function PasswordInput({
  id, label, value, onChange, placeholder, disabled
}: {
  id: string; label: string; value: string
  onChange: (v: string) => void; placeholder: string; disabled?: boolean
}) {
  const [ver, setVer] = useState(false)
  return (
    <InputField
      id={id} label={label} type={ver ? 'text' : 'password'}
      value={value} onChange={onChange} placeholder={placeholder}
      icon={Lock} disabled={disabled}
      rightElement={
        <button
          type="button" onClick={() => setVer(!ver)}
          className="text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
          tabIndex={-1}
        >
          {ver ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  )
}

// ── Indicador de fuerza de contraseña ──────────────────────────────────────
function FuerzaClave({ clave }: { clave: string }) {
  if (!clave) return null
  const fuerza = [
    clave.length >= 8,
    /[A-Z]/.test(clave),
    /[0-9]/.test(clave),
    /[^a-zA-Z0-9]/.test(clave),
  ].filter(Boolean).length

  const colores = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400']
  const etiquetas = ['Muy débil', 'Débil', 'Buena', 'Fuerte']

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < fuerza ? colores[fuerza - 1] : 'bg-white/10'}`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-emerald-400'][fuerza - 1] || 'text-slate-500'}`}>
        {clave.length < 8 ? 'Mínimo 8 caracteres' : etiquetas[fuerza - 1]}
      </p>
    </div>
  )
}

export default function ModalLoginCliente({
  onCerrar,
  titulo    = 'Bienvenido a Chefsy',
  subtitulo = 'Tus compras suman Chefsitos canjeables por comida gratis.',
}: ModalLoginClienteProps) {
  const { iniciarSesion, registrar, iniciarSesionGoogle } = usarClienteAuth()
  const [pantalla, setPantalla] = useState<Pantalla>('menu')

  // Login
  const [loginTel,   setLoginTel]   = useState('')
  const [loginClave, setLoginClave] = useState('')

  // Registro
  const [regNombre,  setRegNombre]  = useState('')
  const [regTel,     setRegTel]     = useState('')
  const [regClave,   setRegClave]   = useState('')
  const [regClave2,  setRegClave2]  = useState('')

  const [cargando,   setCargando]   = useState(false)
  const [error,      setError]      = useState('')
  const [googleCarg, setGoogleCarg] = useState(false)

  const limpiarError = () => setError('')

  // ── Login propio ───────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    limpiarError()
    if (!loginTel || !loginClave) { setError('Completá todos los campos.'); return }
    setCargando(true)
    const { error: err } = await iniciarSesion(loginTel, loginClave)
    setCargando(false)
    if (err) { setError(err); return }
    onCerrar()
  }

  // ── Registro propio ────────────────────────────────────────────────────
  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    limpiarError()
    if (!regNombre.trim() || !regTel || !regClave) { setError('Completá todos los campos.'); return }
    if (regClave.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (regClave !== regClave2) { setError('Las contraseñas no coinciden.'); return }
    setCargando(true)
    const { error: err } = await registrar(regNombre.trim(), regTel, regClave)
    setCargando(false)
    if (err) { setError(err); return }
    onCerrar()
  }

  // ── Google ─────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleCarg(true)
    await iniciarSesionGoogle()
    // La página redirige → no ponemos setGoogleCarg(false)
  }

  // ── Header del modal ───────────────────────────────────────────────────
  const headerGradients: Record<Pantalla, string> = {
    menu:     'from-chefsy-700 via-chefsy-600 to-chefsy-500',
    login:    'from-slate-800 via-slate-700 to-chefsy-700',
    registro: 'from-chefsy-700 via-amber-700 to-amber-600',
  }

  const headerTitulos: Record<Pantalla, string> = {
    menu:     titulo,
    login:    'Ingresar',
    registro: 'Crear cuenta',
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCerrar}
      />

      {/* Modal */}
      <div className="bg-[#111111] border border-white/8 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250 overflow-hidden max-h-[92dvh] overflow-y-auto">

        {/* Header degradado */}
        <div className={`bg-gradient-to-br ${headerGradients[pantalla]} p-5 text-center relative overflow-hidden transition-all duration-300`}>
          {/* Decoración de fondo */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
            <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          </div>

          {/* Botón volver */}
          {pantalla !== 'menu' && (
            <button
              onClick={() => { setPantalla('menu'); limpiarError() }}
              className="absolute left-4 top-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-1.5 rounded-full transition-colors z-10"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {/* Logo / emoji */}
          <div className="relative z-10 mb-2">
            <span className="text-4xl">
              {pantalla === 'registro' ? '👋' : pantalla === 'login' ? '🔐' : '🪙'}
            </span>
          </div>
          <h2 className="text-white font-bebas text-2xl tracking-wide relative z-10">
            {headerTitulos[pantalla]}
          </h2>
          {pantalla === 'menu' && (
            <p className="text-white/75 text-xs mt-1 font-medium relative z-10 max-w-[260px] mx-auto leading-relaxed">
              {subtitulo}
            </p>
          )}

          {/* Cerrar */}
          <button
            onClick={onCerrar}
            className="absolute top-4 right-4 text-white/60 hover:text-white bg-black/20 hover:bg-black/40 p-1.5 rounded-full transition-colors z-20"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">

          {/* ── MENÚ PRINCIPAL ───────────────────────────────────────────── */}
          {pantalla === 'menu' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Ingresar */}
              <button
                onClick={() => { setPantalla('login'); limpiarError() }}
                className="w-full flex items-center justify-between gap-3 bg-[#1a1a1a] hover:bg-[#222222] border border-white/8 hover:border-chefsy-500/40 text-white font-bold py-4 px-5 rounded-2xl transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-chefsy/15 rounded-xl flex items-center justify-center text-chefsy-400 group-hover:bg-chefsy/25 transition-colors">
                    <Lock size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-white">Ya tengo cuenta</p>
                    <p className="text-xs text-slate-500 font-medium">Ingresar con teléfono y contraseña</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-500 group-hover:text-chefsy-400 transition-colors" />
              </button>

              {/* Registrarse */}
              <button
                onClick={() => { setPantalla('registro'); limpiarError() }}
                className="w-full flex items-center justify-between gap-3 bg-gradient-to-r from-chefsy-600/20 to-amber-600/20 hover:from-chefsy-600/30 hover:to-amber-600/30 border border-chefsy-500/30 hover:border-chefsy-400/50 text-white font-bold py-4 px-5 rounded-2xl transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-chefsy/20 rounded-xl flex items-center justify-center text-chefsy-300 group-hover:bg-chefsy/30 transition-colors">
                    <User size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-white">Crear cuenta nueva</p>
                    <p className="text-xs text-slate-400 font-medium">Registrarse y empezar a sumar puntos</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-500 group-hover:text-chefsy-300 transition-colors" />
              </button>

              {/* Separador */}
              <div className="flex items-center gap-3 py-1">
                <div className="h-px bg-white/8 flex-1" />
                <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">o también</span>
                <div className="h-px bg-white/8 flex-1" />
              </div>

              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={googleCarg}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-slate-900 font-bold py-3 px-5 rounded-2xl transition-all disabled:opacity-60 active:scale-[0.98] text-sm"
              >
                {googleCarg ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                )}
                {googleCarg ? 'Redirigiendo...' : 'Continuar con Google'}
              </button>
            </div>
          )}

          {/* ── FORMULARIO LOGIN ──────────────────────────────────────────── */}
          {pantalla === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in duration-200">
              <InputField
                id="login_tel" label="Número de teléfono" type="tel"
                value={loginTel} onChange={(v) => { setLoginTel(v.replace(/\D/g, '')); limpiarError() }}
                placeholder="Ej: 3834123456" icon={Phone} disabled={cargando}
              />
              <PasswordInput
                id="login_clave" label="Contraseña"
                value={loginClave} onChange={(v) => { setLoginClave(v); limpiarError() }}
                placeholder="Tu contraseña" disabled={cargando}
              />

              {error && (
                <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-red-400 text-sm font-medium flex items-start gap-2">
                  <span className="mt-0.5">⚠️</span> {error}
                </div>
              )}

              <button
                type="submit" disabled={cargando || !loginTel || !loginClave}
                className="w-full bg-chefsy-500 hover:bg-chefsy-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-sm"
              >
                {cargando
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Verificando...</>
                  : 'Ingresar a mi cuenta'}
              </button>

              <p className="text-center text-xs text-slate-500">
                ¿No tenés cuenta?{' '}
                <button type="button" onClick={() => { setPantalla('registro'); limpiarError() }}
                  className="text-chefsy-400 font-bold hover:underline">
                  Registrarse
                </button>
              </p>
            </form>
          )}

          {/* ── FORMULARIO REGISTRO ───────────────────────────────────────── */}
          {pantalla === 'registro' && (
            <form onSubmit={handleRegistro} className="space-y-4 animate-in fade-in duration-200">
              <InputField
                id="reg_nombre" label="Tu nombre" type="text"
                value={regNombre} onChange={(v) => { setRegNombre(v); limpiarError() }}
                placeholder="Ej: Martina García" icon={User} disabled={cargando}
              />
              <InputField
                id="reg_tel" label="Número de teléfono" type="tel"
                value={regTel} onChange={(v) => { setRegTel(v.replace(/\D/g, '')); limpiarError() }}
                placeholder="Ej: 3834123456 (sin 0 ni 15)" icon={Phone} disabled={cargando}
              />
              <div className="space-y-1.5">
                <PasswordInput
                  id="reg_clave" label="Contraseña"
                  value={regClave} onChange={(v) => { setRegClave(v); limpiarError() }}
                  placeholder="Mínimo 8 caracteres" disabled={cargando}
                />
                <FuerzaClave clave={regClave} />
              </div>
              <PasswordInput
                id="reg_clave2" label="Confirmar contraseña"
                value={regClave2} onChange={(v) => { setRegClave2(v); limpiarError() }}
                placeholder="Repetí tu contraseña" disabled={cargando}
              />

              {regClave2 && regClave !== regClave2 && (
                <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                  <span>⚠️</span> Las contraseñas no coinciden
                </p>
              )}
              {regClave2 && regClave === regClave2 && regClave.length >= 8 && (
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <span>✅</span> Las contraseñas coinciden
                </p>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-red-400 text-sm font-medium flex items-start gap-2">
                  <span className="mt-0.5">⚠️</span> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={cargando || !regNombre || !regTel || regClave.length < 8 || regClave !== regClave2}
                className="w-full bg-gradient-to-r from-chefsy-500 to-amber-600 hover:from-chefsy-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-sm shadow-lg shadow-chefsy-900/30"
              >
                {cargando
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creando cuenta...</>
                  : '🎉 Crear mi cuenta'}
              </button>

              <p className="text-center text-xs text-slate-500">
                ¿Ya tenés cuenta?{' '}
                <button type="button" onClick={() => { setPantalla('login'); limpiarError() }}
                  className="text-chefsy-400 font-bold hover:underline">
                  Iniciar sesión
                </button>
              </p>

              <p className="text-center text-[11px] text-slate-600 leading-relaxed px-2">
                Al registrarte aceptás que tus datos se usen para gestionar tu cuenta y puntos Chefsitos.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
