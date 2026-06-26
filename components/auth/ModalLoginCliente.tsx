'use client'

import React, { useState } from 'react'
import { X, Smartphone, ArrowRight, CheckCircle2 } from 'lucide-react'
import { usarClienteAuth } from '@/contexto/ClienteAuthContexto'

interface ModalLoginClienteProps {
  onCerrar: () => void
  titulo?: string
  subtitulo?: string
}

export default function ModalLoginCliente({ 
  onCerrar, 
  titulo = "Ingresá para sumar puntos", 
  subtitulo = "Tus compras suman Chefsitos canjeables por comida gratis." 
}: ModalLoginClienteProps) {
  const { iniciarSesionGoogle, enviarOtpTelefono, verificarOtpTelefono } = usarClienteAuth()
  
  const [telefono, setTelefono] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [cargando, setCargando] = useState(false)
  const [errorMensaje, setErrorMensaje] = useState('')

  const handleGoogleLogin = async () => {
    try {
      setCargando(true)
      await iniciarSesionGoogle()
      // Redirige automáticamente
    } catch (e) {
      setCargando(false)
      setErrorMensaje('Error al iniciar sesión con Google')
    }
  }

  const handleEnviarOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!telefono || telefono.length < 10) {
      setErrorMensaje('Ingresa un número válido con código de área (ej: 3834123456)')
      return
    }
    
    setCargando(true)
    setErrorMensaje('')
    
    // Asumimos código de país de Argentina si no tiene el +54
    const telFormateado = telefono.startsWith('+') ? telefono : `+54${telefono}`
    
    const { error } = await enviarOtpTelefono(telFormateado)
    
    if (error) {
      setErrorMensaje(error.message)
      setCargando(false)
    } else {
      setOtpSent(true)
      setCargando(false)
    }
  }

  const handleVerificarOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.length < 6) return
    
    setCargando(true)
    setErrorMensaje('')
    
    const telFormateado = telefono.startsWith('+') ? telefono : `+54${telefono}`
    const { error } = await verificarOtpTelefono(telFormateado, otp)
    
    if (error) {
      setErrorMensaje('Código inválido o expirado. Intentá de nuevo.')
      setCargando(false)
    } else {
      // Exitoso!
      onCerrar()
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
        onClick={onCerrar}
      />
      
      {/* Modal */}
      <div className="bg-[#141414] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header decorativo */}
        <div className="bg-gradient-to-r from-chefsy-600 to-chefsy-500 p-6 text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 text-white/10">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 3.8l7.2 14.2H4.8L12 5.8z"/></svg>
          </div>
          <h2 className="text-white font-bebas text-3xl tracking-wide relative z-10">{titulo}</h2>
          <p className="text-white/80 text-sm mt-1 font-medium relative z-10">{subtitulo}</p>
          <button 
            onClick={onCerrar}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-1.5 rounded-full transition-colors z-20"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {!otpSent ? (
            <div className="space-y-6">
              {/* Opción 1: Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={cargando}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                </svg>
                Continuar con Google
              </button>

              <div className="flex items-center gap-4">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">o con WhatsApp / SMS</span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>

              {/* Opción 2: Teléfono */}
              <form onSubmit={handleEnviarOtp} className="space-y-4">
                <div>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      id="telefono_login"
                      name="telefono_login"
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej: 3834123456"
                      className="w-full bg-[#222222] border border-white/10 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-chefsy-500 transition-colors placeholder:text-slate-500"
                      disabled={cargando}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 px-1">Te enviaremos un código de 6 dígitos.</p>
                </div>

                <button
                  type="submit"
                  disabled={cargando || telefono.length < 10}
                  className="w-full flex items-center justify-center gap-2 bg-[#222222] hover:bg-[#2a2a2a] text-white border border-white/10 hover:border-chefsy-500/50 font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 group"
                >
                  {cargando ? 'Enviando...' : 'Enviar Código'}
                  {!cargando && <ArrowRight size={18} className="text-slate-400 group-hover:text-chefsy-400 transition-colors" />}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleVerificarOtp} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-chefsy-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-chefsy-500/30">
                  <CheckCircle2 size={32} className="text-chefsy-400" />
                </div>
                <h3 className="text-white font-bold text-lg">Ingresá el código</h3>
                <p className="text-slate-400 text-sm mt-1">Enviado al {telefono}</p>
                <button 
                  type="button" 
                  onClick={() => setOtpSent(false)}
                  className="text-chefsy-400 text-sm mt-2 font-medium hover:underline"
                >
                  ¿Te equivocaste de número?
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="000000"
                  className="w-full bg-[#222222] border border-white/10 text-white text-center text-2xl tracking-[0.5em] font-bold rounded-xl py-4 focus:outline-none focus:border-chefsy-500 transition-colors placeholder:text-slate-600"
                  disabled={cargando}
                />
              </div>

              <button
                type="submit"
                disabled={cargando || otp.length < 6}
                className="w-full bg-chefsy-500 hover:bg-chefsy-600 text-white font-bold py-3.5 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {cargando ? 'Verificando...' : 'Confirmar e Ingresar'}
              </button>
            </form>
          )}

          {errorMensaje && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center font-medium">
              {errorMensaje}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
