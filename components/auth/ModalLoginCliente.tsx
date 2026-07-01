'use client'

import React, { useState, useRef } from 'react'
import { X, Phone, Lock, Eye, EyeOff, User, ArrowRight, ChevronLeft, Star, Sparkles, ShieldCheck, AlertCircle, CheckCircle2, LogIn, UserPlus } from 'lucide-react'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'

interface ModalLoginClienteProps {
  onCerrar: () => void
  titulo?:    string
  subtitulo?: string
}

type Pantalla = 'menu' | 'login' | 'registro'

// ── Logo Chefsy SVG ──────────────────────────────────────────────────────────
function ChefIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="currentColor" fillOpacity="0.12" />
      <path d="M24 10C19.582 10 16 13.582 16 18C16 20.4 17.09 22.54 18.8 24H29.2C30.91 22.54 32 20.4 32 18C32 13.582 28.418 10 24 10Z" fill="currentColor" fillOpacity="0.9"/>
      <rect x="17" y="25" width="14" height="2" rx="1" fill="currentColor" fillOpacity="0.7"/>
      <rect x="18" y="29" width="12" height="8" rx="3" fill="currentColor" fillOpacity="0.85"/>
      <path d="M21 29V37" stroke="white" strokeWidth="1" strokeOpacity="0.3"/>
      <path d="M27 29V37" stroke="white" strokeWidth="1" strokeOpacity="0.3"/>
    </svg>
  )
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="currentColor" fillOpacity="0.12" />
      <circle cx="24" cy="24" r="14" fill="currentColor" fillOpacity="0.25" />
      <circle cx="24" cy="24" r="9" fill="currentColor" fillOpacity="0.5" />
      <text x="24" y="28.5" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white" fontFamily="sans-serif">$</text>
    </svg>
  )
}

function WaveIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="currentColor" fillOpacity="0.12" />
      <path d="M16 20C16 20 18 16 21 18C24 20 24 16 27 16C30 16 32 20 32 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeOpacity="0.9"/>
      <path d="M14 26C14 26 17 22 20.5 24C24 26 24 22 27.5 22C31 22 34 26 34 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeOpacity="0.7"/>
      <path d="M16 32C16 32 18 28 21 30C24 32 24 28 27 28C30 28 32 32 32 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeOpacity="0.5"/>
    </svg>
  )
}

// ── Input Field ──────────────────────────────────────────────────────────────
function InputField({
  id, label, type, value, onChange, placeholder, icon: Icon, disabled, rightElement
}: {
  id: string; label: string; type: string; value: string
  onChange: (v: string) => void; placeholder: string
  icon: React.ElementType; disabled?: boolean; rightElement?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[11px] font-bold text-slate-500 tracking-widest uppercase">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={type === 'password' ? 'current-password' : undefined}
          className="w-full bg-[#181818] border border-white/6 text-white rounded-xl py-3 pl-10 pr-10 text-[15px] focus:outline-none focus:border-chefsy-500/50 focus:bg-[#1d1d1d] focus:ring-1 focus:ring-chefsy-500/20 transition-all placeholder:text-slate-700 disabled:opacity-40"
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
          className="text-slate-600 hover:text-slate-400 transition-colors focus:outline-none"
          tabIndex={-1}
        >
          {ver ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      }
    />
  )
}

// ── Indicador fuerza de contraseña ──────────────────────────────────────────
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
            className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${i < fuerza ? colores[fuerza - 1] : 'bg-white/8'}`}
          />
        ))}
      </div>
      <p className={`text-[10px] font-medium ${['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-emerald-400'][fuerza - 1] || 'text-slate-600'}`}>
        {clave.length < 8 ? 'Mínimo 8 caracteres' : etiquetas[fuerza - 1]}
      </p>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
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

  const handleGoogle = async () => {
    setGoogleCarg(true)
    await iniciarSesionGoogle()
  }

  const volver = () => { setPantalla('menu'); limpiarError() }

  // Gesto táctil swipe down para cerrar en mobile
  const [translateY, setTranslateY] = useState(0)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const diff = e.touches[0].clientY - touchStartY.current
    if (diff > 0) {
      setTranslateY(diff)
    }
  }

  const handleTouchEnd = () => {
    if (translateY > 75) {
      onCerrar()
    } else {
      setTranslateY(0)
    }
    touchStartY.current = null
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCerrar}
      />

      {/* Modal */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: translateY > 0 ? `translateY(${translateY}px)` : undefined }}
        className="bg-[#0e0e0e] border border-white/6 w-full sm:max-w-[400px] rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250 overflow-hidden max-h-[95dvh] overflow-y-auto transition-transform"
      >
        {/* Drag pill para mobile (gesto iPhone) */}
        <div className="flex justify-center pt-3.5 pb-1 sm:hidden cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* ── HEADER ── */}
        <div className="relative px-5 pt-4 pb-5">
          {/* Botón cerrar */}
          <button
            onClick={onCerrar}
            type="button"
            aria-label="Cerrar"
            className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
          >
            <X size={16} />
          </button>

          {/* Botón volver */}
          {pantalla !== 'menu' && (
            <button
              type="button"
              onClick={volver}
              aria-label="Volver"
              className="absolute top-4 left-4 z-20 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {/* Ícono central */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
              pantalla === 'registro'
                ? 'bg-gradient-to-br from-chefsy-600 to-emerald-700 text-white'
                : pantalla === 'login'
                ? 'bg-gradient-to-br from-slate-700 to-slate-600 text-chefsy-300'
                : 'bg-gradient-to-br from-chefsy-600 to-chefsy-700 text-white'
            }`}>
              {pantalla === 'registro' ? (
                <UserPlus size={24} strokeWidth={1.5} />
              ) : pantalla === 'login' ? (
                <LogIn size={24} strokeWidth={1.5} />
              ) : (
                <Star size={24} strokeWidth={1.5} />
              )}
            </div>

            <div>
              <h2 className="text-white font-bebas text-2xl tracking-wide leading-tight">
                {pantalla === 'menu' ? titulo : pantalla === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </h2>
              {pantalla === 'menu' && (
                <p className="text-slate-500 text-xs mt-1 leading-relaxed max-w-[240px] mx-auto">
                  {subtitulo}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Divisor sutil */}
        <div className="h-px bg-white/4 mx-5" />

        {/* ── CONTENIDO ── */}
        <div className="p-5 space-y-3">

          {/* ── MENÚ PRINCIPAL ──────────────────────────────────────────── */}
          {pantalla === 'menu' && (
            <div className="space-y-2.5 animate-in fade-in duration-200">

              {/* Badge puntos */}
              <div className="flex items-center justify-center gap-1.5 py-2">
                <Sparkles size={12} className="text-chefsy-400" />
                <span className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">Acumulá Chefsitos en cada pedido</span>
                <Sparkles size={12} className="text-chefsy-400" />
              </div>

              {/* Ya tengo cuenta */}
              <button
                onClick={() => { setPantalla('login'); limpiarError() }}
                className="w-full flex items-center gap-3.5 bg-[#161616] hover:bg-[#1c1c1c] border border-white/6 hover:border-white/12 text-white py-3.5 px-4 rounded-2xl transition-all group active:scale-[0.98]"
              >
                <div className="w-9 h-9 bg-slate-800 group-hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors shrink-0">
                  <LogIn size={17} className="text-slate-300" strokeWidth={1.5} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-[13px] font-bold text-white">Ya tengo cuenta</p>
                  <p className="text-[11px] text-slate-600">Ingresá con teléfono y contraseña</p>
                </div>
                <ArrowRight size={15} className="text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
              </button>

              {/* Crear cuenta */}
              <button
                onClick={() => { setPantalla('registro'); limpiarError() }}
                className="w-full flex items-center gap-3.5 bg-chefsy-500/8 hover:bg-chefsy-500/14 border border-chefsy-500/20 hover:border-chefsy-500/35 text-white py-3.5 px-4 rounded-2xl transition-all group active:scale-[0.98]"
              >
                <div className="w-9 h-9 bg-chefsy-500/15 group-hover:bg-chefsy-500/25 rounded-xl flex items-center justify-center transition-colors shrink-0">
                  <UserPlus size={17} className="text-chefsy-400" strokeWidth={1.5} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-[13px] font-bold text-white">Crear cuenta nueva</p>
                  <p className="text-[11px] text-slate-500">Registrate y empezá a sumar puntos</p>
                </div>
                <ArrowRight size={15} className="text-slate-700 group-hover:text-chefsy-500/60 transition-colors shrink-0" />
              </button>

              {/* Separador */}
              <div className="flex items-center gap-3 py-1">
                <div className="h-px bg-white/6 flex-1" />
                <span className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">o también</span>
                <div className="h-px bg-white/6 flex-1" />
              </div>

              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={googleCarg}
                className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold py-3 px-5 rounded-2xl transition-all disabled:opacity-60 active:scale-[0.98] text-sm"
              >
                {googleCarg ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="17" height="17" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                )}
                <span>{googleCarg ? 'Redirigiendo...' : 'Continuar con Google'}</span>
              </button>
            </div>
          )}

          {/* ── FORMULARIO LOGIN ──────────────────────────────────────────── */}
          {pantalla === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5 animate-in fade-in duration-200">
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
                <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-3.5 py-2.5 text-red-400 text-xs font-medium flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit" disabled={cargando || !loginTel || !loginClave}
                className="w-full bg-chefsy-500 hover:bg-chefsy-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-sm mt-1"
              >
                {cargando
                  ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Verificando...</>
                  : <><LogIn size={15} /> Ingresar a mi cuenta</>}
              </button>

              <p className="text-center text-xs text-slate-600">
                ¿No tenés cuenta?{' '}
                <button type="button" onClick={() => { setPantalla('registro'); limpiarError() }}
                  className="text-chefsy-400 font-semibold hover:text-chefsy-300 transition-colors">
                  Registrarse
                </button>
              </p>
            </form>
          )}

          {/* ── FORMULARIO REGISTRO ───────────────────────────────────────── */}
          {pantalla === 'registro' && (
            <form onSubmit={handleRegistro} className="space-y-3 animate-in fade-in duration-200">
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
              <div className="space-y-1.5">
                <PasswordInput
                  id="reg_clave2" label="Confirmar contraseña"
                  value={regClave2} onChange={(v) => { setRegClave2(v); limpiarError() }}
                  placeholder="Repetí tu contraseña" disabled={cargando}
                />
                {regClave2 && regClave !== regClave2 && (
                  <p className="text-[11px] text-red-400 font-medium flex items-center gap-1.5">
                    <AlertCircle size={11} className="shrink-0" /> Las contraseñas no coinciden
                  </p>
                )}
                {regClave2 && regClave === regClave2 && regClave.length >= 8 && (
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                    <CheckCircle2 size={11} className="shrink-0" /> Las contraseñas coinciden
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-3.5 py-2.5 text-red-400 text-xs font-medium flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={cargando || !regNombre || !regTel || regClave.length < 8 || regClave !== regClave2}
                className="w-full bg-gradient-to-r from-chefsy-500 to-chefsy-600 hover:from-chefsy-400 hover:to-chefsy-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-sm mt-1 shadow-lg shadow-chefsy-900/20"
              >
                {cargando
                  ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creando cuenta...</>
                  : <><ShieldCheck size={15} /> Crear mi cuenta</>}
              </button>

              <p className="text-center text-xs text-slate-600">
                ¿Ya tenés cuenta?{' '}
                <button type="button" onClick={() => { setPantalla('login'); limpiarError() }}
                  className="text-chefsy-400 font-semibold hover:text-chefsy-300 transition-colors">
                  Iniciar sesión
                </button>
              </p>

              <p className="text-center text-[10px] text-slate-700 leading-relaxed px-2 pt-1">
                Al registrarte aceptás que tus datos se usen para gestionar tu cuenta y puntos Chefsitos.
              </p>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
