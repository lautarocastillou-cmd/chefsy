'use client'
// ─────────────────────────────────────────────────────
// hooks/useTurno.ts
// Responsabilidad única: estado del turno activo
// (carga inicial, iniciar, y la función finalizarTurno
// se queda en el Provider porque necesita acceso a
// estado.pedidos y a enviarAccionPedido).
// ─────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { EstadoTurno } from '@/contexto/PedidosContexto'

interface UseTurnoProps {
  agregarNotificacion: (mensaje: string, tipo: 'info' | 'success' | 'warning') => void
  isAdmin?: boolean
}

export function useTurno({ agregarNotificacion, isAdmin = false }: UseTurnoProps) {
  const [estadoTurno, setEstadoTurno] = useState<EstadoTurno>({
    activo: false,
    cajaInicial: 0,
    fechaInicio: null,
  })

  // Carga inicial del estado del turno desde el servidor
  useEffect(() => {
    if (!isAdmin) return;
    
    async function cargarTurno() {
      try {
        const res = await fetch('/api/admin/turno', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setEstadoTurno(data)
        }
      } catch (err) {
        console.error('Error cargando estado del turno:', err)
      }
    }
    cargarTurno()
  }, [isAdmin])

  const iniciarTurno = async (cajaInicial: number, tipoTurno: 'mediodia' | 'noche' = 'noche'): Promise<boolean> => {
    try {
      const nuevoTurno = {
        activo: true,
        cajaInicial,
        fechaInicio: new Date().toISOString(),
        tipoTurno,
      }
      const res = await fetch('/api/admin/turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoTurno),
      })
      if (res.ok) {
        setEstadoTurno(nuevoTurno)
        agregarNotificacion('Turno iniciado correctamente.', 'success')
        return true
      }
      agregarNotificacion('Error al iniciar el turno.', 'warning')
      return false
    } catch (err) {
      console.error('Error iniciando turno:', err)
      agregarNotificacion('Error de red al iniciar el turno.', 'warning')
      return false
    }
  }

  return { estadoTurno, setEstadoTurno, iniciarTurno }
}
