'use client'

import { usarAuth } from '@/contexto/AuthContexto'
import { useRouter } from 'next/navigation'
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react'

export default function AccesoRestringido() {
  const { usuarioActivo, cerrarSesion } = usarAuth()
  const router = useRouter()

  const irAPanelHabilitado = () => {
    if (usuarioActivo?.rol === 'cadete') {
      router.push('/cadeteria')
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-3xl p-6 md:p-8 text-center space-y-6 transition-colors">
        {/* Icono de Alerta */}
        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert size={32} />
        </div>

        {/* Mensaje principal */}
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Acceso Restringido
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            Tu cuenta con rol <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">"{usuarioActivo?.rol}"</span> no tiene permisos para visualizar esta sección.
          </p>
        </div>

        {/* Información Adicional */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 text-[11px] text-slate-650 dark:text-slate-350 leading-normal max-w-xs mx-auto">
          🔒 Esta zona está reservada para el personal de administración. Si crees que esto es un error, por favor contactá al administrador.
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={irAPanelHabilitado}
            className="w-full bg-chefsy hover:bg-chefsy-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft size={14} />
            Ir a mi Panel de Trabajo
          </button>
          
          <button
            onClick={cerrarSesion}
            className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-705 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <LogOut size={14} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
