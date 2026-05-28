'use client'

// ─────────────────────────────────────────────────────
// modules/malu/componentes/LoginMalu.tsx
// Pantalla de login elegante para Malú Clothing.
// Diseño oscuro minimalista con logo circular.
// ─────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { usarMalu } from '../contexto'

export default function LoginMalu() {
  const { iniciarSesion } = usarMalu()
  const [contrasena, setContrasena] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [intentos, setIntentos] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contrasena.trim() || cargando) return
    setCargando(true)
    setError('')
    const ok = await iniciarSesion(contrasena)
    if (!ok) {
      setError('Contraseña incorrecta. Intentá de nuevo.')
      setIntentos(p => p + 1)
      setContrasena('')
      inputRef.current?.focus()
    }
    setCargando(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden text-neutral-200"
      style={{ background: 'linear-gradient(135deg, #070707 0%, #111111 100%)', color: '#e5e5e5' }}
    >
      {/* Estilos CSS personalizados para efectos mantecosos a 60fps */}
      <style>{`
        @keyframes respirationGlow {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(229, 211, 179, 0.25), 0 0 0 1px rgba(229, 211, 179, 0.05);
          }
          50% {
            box-shadow: 0 4px 25px rgba(229, 211, 179, 0.45), 0 0 0 1.5px rgba(229, 211, 179, 0.15);
          }
        }
        
        .luxury-btn {
          position: relative;
          overflow: hidden;
          background: #E5D3B3;
          color: #070707;
          border-radius: 12px;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: respirationGlow 3s infinite ease-in-out;
        }
        
        .luxury-btn:hover:not(:disabled) {
          transform: scale(1.03);
          background: #ebdcc3;
          box-shadow: 0 8px 30px rgba(229, 211, 179, 0.6), 0 0 0 2px rgba(229, 211, 179, 0.3);
          color: #000;
        }

        .luxury-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          transform: skewX(-25deg);
          transition: 0.75s;
        }

        .luxury-btn:hover::after {
          left: 125%;
          transition: 0.75s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .luxury-input {
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 0px !important;
          padding-left: 4px !important;
          padding-right: 4px !important;
          padding-top: 12px !important;
          padding-bottom: 8px !important;
          color: #f5f5f5 !important;
          transition: all 0.3s ease !important;
          text-align: center;
          font-size: 16px;
          letter-spacing: 0.25em;
        }

        .luxury-input:focus {
          outline: none !important;
          border-bottom: 1px solid #E5D3B3 !important;
          box-shadow: none !important;
        }
        
        .luxury-card {
          background: rgba(15, 15, 15, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          backdrop-filter: blur(16px) !important;
          box-shadow: 0 30px 70px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
        }
      `}</style>

      {/* Partículas decorativas suavizadas en Champagne Gold */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #E5D3B3, transparent)', filter: 'blur(85px)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, #E5D3B3, transparent)', filter: 'blur(85px)' }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card principal */}
        <div className="luxury-card rounded-3xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="relative"
              style={{ filter: 'drop-shadow(0 0 20px rgba(229, 211, 179, 0.12))' }}
            >
              <img
                src="/malu-logo.png"
                alt="Malú Clothing"
                className="w-28 h-28 rounded-full object-cover"
                style={{
                  border: '2px solid rgba(229, 211, 179, 0.3)',
                  boxShadow: '0 0 30px rgba(229, 211, 179, 0.1)',
                }}
              />
            </div>
            <div className="mt-6 text-center">
              <h2
                className="text-2xl font-serif-elegant italic tracking-wide text-neutral-100"
                style={{ textShadow: '0 0 15px rgba(229, 211, 179, 0.2)' }}
              >
                Bienvenida de nuevo.
              </h2>
              <p className="text-[9px] font-semibold tracking-[0.25em] uppercase mt-2.5 text-neutral-500">
                Ingresa tu contraseña
              </p>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center">
              <input
                id="malu-pass"
                ref={inputRef}
                type="password"
                value={contrasena}
                onChange={e => { setContrasena(e.target.value); setError('') }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full luxury-input"
              />
              {error && (
                <p className="mt-3 text-xs text-red-400 flex items-center gap-1.5 animate-pulse text-center justify-center">
                  <span>⚠</span> {error}
                </p>
              )}
              {intentos >= 3 && (
                <p className="mt-3 text-[10px] text-center" style={{ color: 'rgba(229, 211, 179, 0.5)' }}>
                  Abril, consultá con tu familia si olvidaste la clave.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={cargando || !contrasena.trim()}
              className="w-full py-3.5 luxury-btn transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {cargando ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'rgba(0,0,0,0.4)', borderTopColor: 'transparent' }}
                  />
                  Verificando...
                </span>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-[9px] tracking-widest uppercase text-neutral-600" style={{ letterSpacing: '0.15em' }}>
              Malú Clothing · Acceso Privado
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
