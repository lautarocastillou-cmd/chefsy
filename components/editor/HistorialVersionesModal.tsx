'use client'

import React, { useState, useEffect } from 'react'
import { X, History, RotateCcw, Camera, Trash2, CheckCircle2 } from 'lucide-react'
import { ConfiguracionTienda } from '@/servicios/supabase/configuracion'
import { cn } from '@/lib/utils'

interface Props {
  abierto: boolean
  configActual: ConfiguracionTienda
  onCerrar: () => void
  onRestaurarVersion: (config: ConfiguracionTienda) => void
}

interface SnapshotVersion {
  id: string
  fecha: string
  nombre: string
  config: ConfiguracionTienda
}

const STORAGE_KEY = 'chefsy_editor_snapshots_v1'

export default function HistorialVersionesModal({
  abierto,
  configActual,
  onCerrar,
  onRestaurarVersion,
}: Props) {
  const [snapshots, setSnapshots] = useState<SnapshotVersion[]>([])
  const [nombreNuevoSnapshot, setNombreNuevoSnapshot] = useState('')

  useEffect(() => {
    if (!abierto) return
    try {
      const guardados = localStorage.getItem(STORAGE_KEY)
      if (guardados) {
        setSnapshots(JSON.parse(guardados))
      }
    } catch (e) {
      console.error(e)
    }
  }, [abierto])

  const guardarSnapshots = (nuevos: SnapshotVersion[]) => {
    setSnapshots(nuevos)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos))
    } catch (e) {}
  }

  const crearSnapshotActual = () => {
    const ahora = new Date()
    const nuevo: SnapshotVersion = {
      id: `snap-${Date.now()}`,
      fecha: ahora.toLocaleString('es-AR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      nombre:
        nombreNuevoSnapshot.trim() ||
        `Versión ${ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`,
      config: JSON.parse(JSON.stringify(configActual)),
    }
    const lista = [nuevo, ...snapshots].slice(0, 15) // Guardar hasta 15 versiones
    guardarSnapshots(lista)
    setNombreNuevoSnapshot('')
  }

  const eliminarSnapshot = (id: string) => {
    const filtrados = snapshots.filter((s) => s.id !== id)
    guardarSnapshots(filtrados)
  }

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Historial de Versiones</h3>
              <p className="text-xs text-slate-400">Snapshots y copias de seguridad del diseño</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Crear nuevo Snapshot */}
        <div className="flex items-center gap-2 bg-zinc-900 p-2.5 rounded-2xl border border-slate-800">
          <input
            type="text"
            value={nombreNuevoSnapshot}
            onChange={(e) => setNombreNuevoSnapshot(e.target.value)}
            placeholder="Nombre de la versión (ej: Diseño Promo Viernes)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={crearSnapshotActual}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer shadow-md"
          >
            <Camera size={13} />
            <span>Guardar Copia</span>
          </button>
        </div>

        {/* Lista de Versiones Guardadas */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {snapshots.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 bg-zinc-900/40 rounded-2xl border border-slate-800/60">
              No hay versiones guardadas todavía. Podés crear tu primera copia con el botón de arriba.
            </div>
          ) : (
            snapshots.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-zinc-900/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 group hover:border-slate-700 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-200 truncate">{s.nombre}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{s.fecha}</div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onRestaurarVersion(s.config)
                      onCerrar()
                    }}
                    className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    title="Restaurar esta versión"
                  >
                    <RotateCcw size={12} />
                    <span>Restaurar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarSnapshot(s.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Eliminar snapshot"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  )
}
