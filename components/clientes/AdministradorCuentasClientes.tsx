'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Search, Plus, Key, Edit2, Trash2, X, Check, AlertTriangle, User, Phone, Coins, ShieldAlert
} from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'

interface CuentaCliente {
  id: string
  nombre: string
  telefono: string
  puntos_actuales: number
  created_at?: string
}

export default function AdministradorCuentasClientes() {
  const [clientes, setClientes] = useState<CuentaCliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // Modales
  const [modalCrear, setModalCrear] = useState(false)
  const [modalClave, setModalClave] = useState<CuentaCliente | null>(null)
  const [modalEditar, setModalEditar] = useState<CuentaCliente | null>(null)
  const [modalEliminar, setModalEliminar] = useState<CuentaCliente | null>(null)

  // Form states
  const [formNombre, setFormNombre] = useState('')
  const [formTel, setFormTel] = useState('')
  const [formClave, setFormClave] = useState('')
  const [formPuntos, setFormPuntos] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState('')

  const cargarClientes = async () => {
    setCargando(true)
    setError('')
    try {
      const res = await fetch('/api/admin/clientes-cuentas')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar las cuentas')
      setClientes(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarClientes()
  }, [])

  const limpiarForm = () => {
    setFormNombre('')
    setFormTel('')
    setFormClave('')
    setFormPuntos(0)
    setFormError('')
  }

  const abrirCrear = () => {
    limpiarForm()
    setModalCrear(true)
  }

  const abrirClave = (c: CuentaCliente) => {
    limpiarForm()
    setModalClave(c)
  }

  const abrirEditar = (c: CuentaCliente) => {
    if (!c) return
    limpiarForm()
    setFormNombre((c.nombre || '').toString())
    setFormTel((c.telefono || '').toString())
    setFormPuntos(Number(c.puntos_actuales) || 0)
    setModalEditar(c)
  }

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!formNombre.trim() || !formTel || !formClave) {
      setFormError('Completá todos los campos obligatorios.')
      return
    }
    if (formClave.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setGuardando(true)
    try {
      const res = await fetch('/api/admin/clientes-cuentas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'crear',
          nombre: formNombre,
          telefono: formTel,
          clave: formClave,
          puntos: formPuntos
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear la cuenta')
      setModalCrear(false)
      cargarClientes()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleCambiarClave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!formClave || formClave.length < 8) {
      setFormError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    setGuardando(true)
    try {
      const res = await fetch('/api/admin/clientes-cuentas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'cambiar_clave',
          id: modalClave?.id,
          nuevaClave: formClave
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cambiar la contraseña')
      setModalClave(null)
      alert('✅ Contraseña actualizada exitosamente')
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!formNombre.trim() || !formTel) {
      setFormError('Nombre y teléfono son obligatorios.')
      return
    }
    setGuardando(true)
    try {
      const res = await fetch('/api/admin/clientes-cuentas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'editar',
          id: modalEditar?.id,
          nombre: formNombre,
          telefono: formTel,
          puntos: formPuntos
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar datos')
      setModalEditar(null)
      cargarClientes()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async () => {
    if (!modalEliminar) return
    setGuardando(true)
    try {
      const res = await fetch(`/api/admin/clientes-cuentas?id=${modalEliminar.id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar')
      setModalEliminar(null)
      cargarClientes()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const filtrados = useMemo(() => {
    const q = (busqueda || '').toLowerCase()
    return (Array.isArray(clientes) ? clientes : []).filter(c => {
      if (!c) return false
      const nom = (c.nombre || '').toString().toLowerCase()
      const tel = (c.telefono || '').toString().toLowerCase()
      return nom.includes(q) || tel.includes(q)
    })
  }, [clientes, busqueda])

  return (
    <div className="space-y-6">
      {/* Barra superior de controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-chefsy/50"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={16} />
            </button>
          )}
        </div>

        <button
          onClick={abrirCrear}
          className="flex items-center justify-center gap-2 bg-chefsy hover:bg-chefsy-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm shrink-0"
        >
          <Plus size={18} />
          Crear Cuenta de Cliente
        </button>
      </div>

      {/* Lista / Tabla de Clientes */}
      {cargando ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Cargando cuentas registradas...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-6 rounded-2xl text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
          <p className="text-red-700 dark:text-red-300 font-bold">{error}</p>
          <button onClick={cargarClientes} className="mt-4 bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm">
            Reintentar
          </button>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <User size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
          <p className="font-semibold text-base text-slate-600 dark:text-slate-300">No hay cuentas que coincidan</p>
          <p className="text-xs mt-1">Intentá buscar con otro término o creá un nuevo usuario.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Teléfono</th>
                  <th className="px-6 py-4">Chefsitos</th>
                  <th className="px-6 py-4">Registro</th>
                  <th className="px-6 py-4 text-right">Acciones de Soporte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filtrados.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-chefsy/10 text-chefsy flex items-center justify-center font-extrabold text-sm shrink-0">
                        {(c.nombre || 'U').toString().charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p>{c.nombre || 'Sin Nombre'}</p>
                        <p className="text-xs font-normal text-slate-400">ID: {(c.id || '').toString().slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Phone size={14} className="text-slate-400" />
                        {c.telefono}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold px-2.5 py-1 rounded-full text-xs border border-amber-200/50 dark:border-amber-800/50">
                        🪙 {c.puntos_actuales || 0} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => abrirClave(c)}
                        title="Restablecer Contraseña"
                        className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-400 transition-colors"
                      >
                        <Key size={16} />
                      </button>
                      <button
                        onClick={() => abrirEditar(c)}
                        title="Editar Datos / Puntos"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setModalEliminar(c)}
                        title="Eliminar Cuenta"
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: Crear Cuenta ── */}
      {modalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 transition-opacity duration-200 will-change-opacity animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 animate-in zoom-in-95 will-change-transform">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">✨ Crear Cuenta de Cliente</h3>
              <button onClick={() => setModalCrear(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrear} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-chefsy font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 3815000000"
                  value={formTel}
                  onChange={(e) => setFormTel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-chefsy font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Contraseña Inicial *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: clave123"
                  value={formClave}
                  onChange={(e) => setFormClave(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-chefsy font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Chefsitos Iniciales</label>
                <input
                  type="number"
                  value={formPuntos === 0 ? '' : formPuntos}
                  onChange={(e) => setFormPuntos(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-chefsy"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900">
                  ⚠️ {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCrear(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-chefsy hover:bg-chefsy-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm disabled:opacity-50"
                >
                  {guardando ? 'Creando...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Cambiar Contraseña ── */}
      {modalClave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 transition-opacity duration-200 will-change-opacity animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 animate-in zoom-in-95 will-change-transform">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">🔑 Cambiar Contraseña</h3>
                <p className="text-xs text-slate-400">Cliente: {modalClave.nombre} ({modalClave.telefono})</p>
              </div>
              <button onClick={() => setModalClave(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCambiarClave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nueva Contraseña</label>
                <input
                  type="text"
                  placeholder="Escribí la nueva clave aquí..."
                  value={formClave}
                  onChange={(e) => setFormClave(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900">
                  ⚠️ {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalClave(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Actualizar Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Editar Datos / Puntos ── */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 transition-opacity duration-200 will-change-opacity animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 animate-in zoom-in-95 will-change-transform">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">✏️ Editar Cuenta</h3>
              <button onClick={() => setModalEditar(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre y Apellido</label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-chefsy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formTel}
                  onChange={(e) => setFormTel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-chefsy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Chefsitos (Puntos)</label>
                <input
                  type="number"
                  value={formPuntos === 0 ? '' : formPuntos}
                  onChange={(e) => setFormPuntos(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-chefsy"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900">
                  ⚠️ {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalEditar(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-chefsy hover:bg-chefsy-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Confirmación Eliminar ── */}
      {modalEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 transition-opacity duration-200 will-change-opacity animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-red-100 dark:border-red-900/50 space-y-4 text-center animate-in zoom-in-95 will-change-transform">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert size={26} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">¿Eliminar esta cuenta?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vas a eliminar definitivamente la cuenta de <strong className="text-slate-700 dark:text-slate-200">{modalEliminar.nombre}</strong> ({modalEliminar.telefono}). Perderá sus Chefsitos y acceso al sistema.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalEliminar(null)}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={guardando}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm disabled:opacity-50"
              >
                {guardando ? 'Borrando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
