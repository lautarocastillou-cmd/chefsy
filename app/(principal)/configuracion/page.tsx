'use client'

import { usarPedidos } from '@/contexto/PedidosContexto'
import { useState, useEffect } from 'react'
import { Save, RefreshCw, Clock, ChefHat, Bike, AlertTriangle, Users, UserPlus, Trash2, Palette } from 'lucide-react'
import Link from 'next/link'

// --- COMPONENTE DE USUARIOS ---
function PestanaUsuarios() {
  const { refrescarCadetes } = usarPedidos()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // Formulario nuevo usuario
  const [nuevoUsuario, setNuevoUsuario] = useState({ usuario: '', clave: '', nombre: '', rol: 'cadete' })
  const [creando, setCreando] = useState(false)

  const cargarUsuarios = async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/admin/usuarios')
      if (res.ok) {
        const data = await res.json()
        setUsuarios(data)
      } else {
        setError('Error al cargar usuarios')
      }
    } catch (e) {
      setError('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const manejarCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setExito('')
    setCreando(true)
    
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoUsuario)
      })

      if (res.ok) {
        setExito('Usuario creado exitosamente')
        setNuevoUsuario({ usuario: '', clave: '', nombre: '', rol: 'cadete' })
        cargarUsuarios()
        // Refrescar la lista de cadetes en todo el panel
        refrescarCadetes()
      } else {
        const data = await res.json()
        setError(data.error || 'Error al crear usuario')
      }
    } catch (e) {
      setError('Error de conexión al guardar')
    } finally {
      setCreando(false)
    }
  }

  const manejarEliminar = async (usuario: string) => {
    if (!window.confirm(`¿Estás seguro que deseas eliminar el usuario "${usuario}"?`)) return
    
    try {
      const res = await fetch(`/api/admin/usuarios?usuario=${usuario}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        cargarUsuarios()
        // Refrescar la lista de cadetes en todo el panel
        refrescarCadetes()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar')
      }
    } catch (e) {
      alert('Error de conexión al eliminar')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Listado de Usuarios */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-300 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
          <Users size={16} /> Usuarios del Sistema
        </h3>

        {cargando ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 font-bold">
                <tr>
                  <th className="px-4 py-3">Login</th>
                  <th className="px-4 py-3">Nombre Real</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {usuarios.map(u => (
                  <tr key={u.usuario} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-semibold">{u.usuario}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        u.rol === 'admin' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => manejarEliminar(u.usuario)}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"
                        title="Eliminar usuario"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No hay usuarios registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formulario Crear Usuario */}
      <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm h-fit">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-chefsy-600 dark:text-chefsy-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
          <UserPlus size={16} /> Nuevo Empleado
        </h3>
        
        {error && <div className="mb-4 text-xs bg-red-100 text-red-700 p-2 rounded">{error}</div>}
        {exito && <div className="mb-4 text-xs bg-emerald-100 text-emerald-700 p-2 rounded">{exito}</div>}

        <form onSubmit={manejarCrear} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1">Usuario (Login)</label>
            <input
              type="text"
              value={nuevoUsuario.usuario}
              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, usuario: e.target.value.toLowerCase().replace(/\s+/g, '') })}
              placeholder="ej: mario"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-chefsy/50 lowercase"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Nombre Real</label>
            <input
              type="text"
              value={nuevoUsuario.nombre}
              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
              placeholder="Ej: Mario Gómez"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-chefsy/50"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Contraseña</label>
            <input
              type="password"
              value={nuevoUsuario.clave}
              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, clave: e.target.value })}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-chefsy/50"
              required
              minLength={4}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Rol en el sistema</label>
            <select
              value={nuevoUsuario.rol}
              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-chefsy/50"
            >
              <option value="cadete">Cadete / Empleado</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={creando}
            className="w-full mt-2 inline-flex justify-center items-center gap-1.5 bg-chefsy hover:bg-chefsy-700 text-white text-xs font-extrabold py-3 px-5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {creando ? 'Creando...' : 'Crear Usuario'}
          </button>
        </form>
      </div>
    </div>
  )
}


// --- COMPONENTE DE PARAMETROS OPERATIVOS ---
function PestanaParametros() {
  const { configuracionOperativa, guardarConfiguracionOperativa } = usarPedidos()

  // Estados locales para los límites de tiempo
  const [pedidoAtrasadoMinutos, setPedidoAtrasadoMinutos] = useState(30)
  const [listoDemoradoMinutos, setListoDemoradoMinutos] = useState(10)
  const [cocinaDemoradoMinutos, setCocinaDemoradoMinutos] = useState(20)
  const [pedidoOlvidadoMinutos, setPedidoOlvidadoMinutos] = useState(45)

  // Estados locales para los umbrales de prioridad alta
  const [pedidoAtrasadoAltaMinutos, setPedidoAtrasadoAltaMinutos] = useState(45)
  const [listoDemoradoAltaMinutos, setListoDemoradoAltaMinutos] = useState(15)
  const [sinCadeteAltaMinutos, setSinCadeteAltaMinutos] = useState(15)
  const [cocinaDemoradoAltaMinutos, setCocinaDemoradoAltaMinutos] = useState(30)

  const [guardando, setGuardando] = useState(false)

  // Cargar valores iniciales desde la configuración centralizada
  useEffect(() => {
    if (configuracionOperativa) {
      setPedidoAtrasadoMinutos(configuracionOperativa.limites.pedidoAtrasadoMinutos)
      setListoDemoradoMinutos(configuracionOperativa.limites.listoDemoradoMinutos)
      setCocinaDemoradoMinutos(configuracionOperativa.limites.cocinaDemoradoMinutos)
      setPedidoOlvidadoMinutos(configuracionOperativa.limites.pedidoOlvidadoMinutos)

      setPedidoAtrasadoAltaMinutos(configuracionOperativa.prioridades.pedidoAtrasadoAltaMinutos)
      setListoDemoradoAltaMinutos(configuracionOperativa.prioridades.listoDemoradoAltaMinutos)
      setSinCadeteAltaMinutos(configuracionOperativa.prioridades.sinCadeteAltaMinutos)
      setCocinaDemoradoAltaMinutos(configuracionOperativa.prioridades.cocinaDemoradoAltaMinutos)
    }
  }, [configuracionOperativa])

  // Guardar configuración modificada en el archivo del servidor
  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    const nuevaConfig = {
      limites: {
        pedidoAtrasadoMinutos: Number(pedidoAtrasadoMinutos),
        listoDemoradoMinutos: Number(listoDemoradoMinutos),
        cocinaDemoradoMinutos: Number(cocinaDemoradoMinutos),
        pedidoOlvidadoMinutos: Number(pedidoOlvidadoMinutos),
      },
      prioridades: {
        pedidoAtrasadoAltaMinutos: Number(pedidoAtrasadoAltaMinutos),
        listoDemoradoAltaMinutos: Number(listoDemoradoAltaMinutos),
        sinCadeteAltaMinutos: Number(sinCadeteAltaMinutos),
        cocinaDemoradoAltaMinutos: Number(cocinaDemoradoAltaMinutos),
      },
    }

    await guardarConfiguracionOperativa(nuevaConfig)
    setGuardando(false)
  }

  // Restaurar los límites predeterminados recomendados
  const restaurarPredeterminados = () => {
    if (window.confirm('¿Deseas restablecer todos los límites de alerta a los valores recomendados de fábrica?')) {
      setPedidoAtrasadoMinutos(30)
      setListoDemoradoMinutos(10)
      setCocinaDemoradoMinutos(20)
      setPedidoOlvidadoMinutos(45)

      setPedidoAtrasadoAltaMinutos(45)
      setListoDemoradoAltaMinutos(15)
      setSinCadeteAltaMinutos(15)
      setCocinaDemoradoAltaMinutos(30)
    }
  }

  return (
    <form onSubmit={manejarGuardar} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tarjeta 1: Límites para Detección */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-chefsy-800 dark:text-chefsy-300 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <Clock size={16} /> Tiempos de Alerta (Minutos)
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1">Pedidos Atrasados</label>
              <input
                type="number"
                min="1"
                value={pedidoAtrasadoMinutos}
                onChange={(e) => setPedidoAtrasadoMinutos(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-chefsy/50"
                required
              />
              <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                Minutos activo antes de considerarse atrasado (Por defecto: 30)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Pedidos Listos Demorados</label>
              <input
                type="number"
                min="1"
                value={listoDemoradoMinutos}
                onChange={(e) => setListoDemoradoMinutos(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-chefsy/50"
                required
              />
              <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                Minutos en estado "Listo" esperando entrega o cadete (Por defecto: 10)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Pedidos Demorados en Cocina</label>
              <input
                type="number"
                min="1"
                value={cocinaDemoradoMinutos}
                onChange={(e) => setCocinaDemoradoMinutos(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-chefsy/50"
                required
              />
              <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                Minutos tolerables de preparación en la cocina (Por defecto: 20)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Pedidos Olvidados</label>
              <input
                type="number"
                min="1"
                value={pedidoOlvidadoMinutos}
                onChange={(e) => setPedidoOlvidadoMinutos(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-chefsy/50"
                required
              />
              <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                Minutos sin cambios de estado ni actividad para considerarse olvidado (Por defecto: 45)
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Escalamiento de Prioridad */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-red-650 dark:text-red-400 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <AlertTriangle size={16} /> Escalamiento a Prioridad Alta (Minutos)
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1">Atrasados a Alta Prioridad</label>
              <input
                type="number"
                min="1"
                value={pedidoAtrasadoAltaMinutos}
                onChange={(e) => setPedidoAtrasadoAltaMinutos(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-red-500/30"
                required
              />
              <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                Minutos activos totales antes de pasar a rojo crítico (Por defecto: 45)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Listo Demorado a Alta Prioridad</label>
              <input
                type="number"
                min="1"
                value={listoDemoradoAltaMinutos}
                onChange={(e) => setListoDemoradoAltaMinutos(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-red-500/30"
                required
              />
              <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                Minutos en "Listo" antes de alertar con color rojo (Por defecto: 15)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Sin Cadete a Alta Prioridad</label>
              <input
                type="number"
                min="1"
                value={sinCadeteAltaMinutos}
                onChange={(e) => setSinCadeteAltaMinutos(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-red-500/30"
                required
              />
              <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                Minutos sin repartidor asignado antes de catalogarlo como crítico (Por defecto: 15)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Cocina Demorada a Alta Prioridad</label>
              <input
                type="number"
                min="1"
                value={cocinaDemoradoAltaMinutos}
                onChange={(e) => setCocinaDemoradoAltaMinutos(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-red-500/30"
                required
              />
              <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                Minutos cocinando antes de marcar en alerta máxima (Por defecto: 30)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones del Formulario */}
      <div className="flex items-center gap-3 justify-end pt-3">
        <button
          type="button"
          onClick={restaurarPredeterminados}
          className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-[#e6e6e6] text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw size={14} /> Restablecer Predeterminados
        </button>
        
        <button
          type="submit"
          disabled={guardando}
          className="inline-flex items-center gap-1.5 bg-chefsy hover:bg-chefsy-700 text-white text-xs font-extrabold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Save size={14} /> {guardando ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </form>
  )
}

// --- CONTENEDOR PRINCIPAL ---
export default function PaginaConfiguracion() {
  const [pestanaActiva, setPestanaActiva] = useState<'parametros' | 'usuarios'>('parametros')

  return (
    <div className="space-y-6 max-w-5xl pb-12 text-slate-800 dark:text-[#e6e6e6]">
      {/* Explicación / Cabecera */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="text-xl font-bold">⚙️ Configuración del Sistema</h1>
          <p className="text-xs text-gray-400 dark:text-slate-400">
            Administrá los usuarios del local y los parámetros de alerta de los pedidos.
          </p>
        </div>
        <Link 
          href="/configuracion/editor"
          className="flex items-center gap-2 bg-gradient-to-r from-chefsy-500 to-chefsy-600 hover:from-chefsy-400 hover:to-chefsy-500 text-white font-extrabold py-2 px-4 rounded-xl shadow-lg transition-all active:scale-95"
        >
          <Palette size={18} />
          <span>Editor de Diseño Visual</span>
        </Link>
      </div>

      {/* Navegación de Pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setPestanaActiva('parametros')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            pestanaActiva === 'parametros' 
              ? 'border-chefsy text-chefsy dark:text-chefsy-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Parámetros de Operación
        </button>
        <button
          onClick={() => setPestanaActiva('usuarios')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            pestanaActiva === 'usuarios' 
              ? 'border-chefsy text-chefsy dark:text-chefsy-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Gestión de Usuarios
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
      <div className="pt-2 animate-[fadeIn_0.2s_ease-out]">
        {pestanaActiva === 'parametros' && <PestanaParametros />}
        {pestanaActiva === 'usuarios' && <PestanaUsuarios />}
      </div>
    </div>
  )
}
