'use client'

import { usarPedidos } from '@/contexto/PedidosContexto'
import { formatearPrecio, generarIdProducto } from '@/lib/utils'
import { useState, useMemo } from 'react'
import React from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Check,
  X,
  Layers,
  ShoppingBag,
  Package,
  CheckCircle,
  XCircle,
  Tag,
  Sliders,
  UtensilsCrossed,
} from 'lucide-react'
import { CategoriaCatalogo, ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'

export default function PaginaAdministracionCatalogos() {
  const {
    categorias,
    productos,
    modificadores,
    actualizarCategorias,
    actualizarProductos,
    actualizarModificadores,
  } = usarPedidos()

  // Control de pestañas
  const [pestanaActiva, setPestanaActiva] = useState<'productos' | 'categorias' | 'modificadores'>('productos')

  // Filtros de búsqueda (Productos)
  const [buscarProducto, setBuscarProducto] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')

  // Estados de formulario de Categoría
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<string | null>(null)
  const [formCategoria, setFormCategoria] = useState({
    nombre: '',
    orden: 0,
    activa: true,
  })

  // Estados de formulario de Modificador
  const [editandoModificadorId, setEditandoModificadorId] = useState<string | null>(null)
  const [formModificador, setFormModificador] = useState({
    nombre: '',
    precioExtra: 0,
  })

  // Estados de formulario de Producto
  const [editandoProductoId, setEditandoProductoId] = useState<string | null>(null)
  const [formProducto, setFormProducto] = useState({
    nombre: '',
    categoriaId: '',
    precio: 0,
    activo: true,
    stock: '',
    esCombo: false,
    modificadoresIds: [] as string[],
  })

  // Mensajes de error/validación
  const [errorCat, setErrorCat] = useState('')
  const [errorProd, setErrorProd] = useState('')
  const [errorMod, setErrorMod] = useState('')

  // Filtrado de productos para la tabla
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideBúsqueda = p.nombre.toLowerCase().includes(buscarProducto.toLowerCase())
      const coincideCategoría = filtroCategoria === 'todas' || p.categoriaId === filtroCategoria
      return coincideBúsqueda && coincideCategoría
    })
  }, [productos, buscarProducto, filtroCategoria])

  // Categorías ordenadas por orden
  const categoriasOrdenadas = useMemo(() => {
    return [...categorias].sort((a, b) => a.orden - b.orden)
  }, [categorias])

  // Grupos de productos estructurados por categoría (incluyendo sin categoría si existieran)
  const gruposCategorias = useMemo(() => {
    const idsCat = new Set(categoriasOrdenadas.map((c) => c.id))
    const grupos: { id: string; nombre: string; productos: ProductoCatalogo[] }[] = []

    categoriasOrdenadas.forEach((cat) => {
      const prodsCat = productosFiltrados.filter((p) => p.categoriaId === cat.id)
      if (prodsCat.length > 0) {
        grupos.push({ id: cat.id, nombre: cat.nombre, productos: prodsCat })
      }
    })

    const prodsSinCat = productosFiltrados.filter((p) => !idsCat.has(p.categoriaId))
    if (prodsSinCat.length > 0) {
      grupos.push({ id: 'sin-categoria', nombre: 'Otras categorías / Sin asignar', productos: prodsSinCat })
    }

    return grupos
  }, [categoriasOrdenadas, productosFiltrados])

  // Mapa de nombres de categorías para búsquedas rápidas
  const mapaCategorias = useMemo(() => {
    const mapa: Record<string, string> = {}
    categorias.forEach((c) => {
      mapa[c.id] = c.nombre
    })
    return mapa
  }, [categorias])

  // ── CATEGORÍAS ACCIONES ──────────────────────────────────────────

  const seleccionarCategoriaParaEditar = (cat: CategoriaCatalogo) => {
    setErrorCat('')
    setEditandoCategoriaId(cat.id)
    setFormCategoria({
      nombre: cat.nombre,
      orden: cat.orden,
      activa: cat.activa,
    })
  }

  const cancelarEdicionCategoria = () => {
    setErrorCat('')
    setEditandoCategoriaId(null)
    setFormCategoria({ nombre: '', orden: 0, activa: true })
  }

  const guardarCategoria = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorCat('')

    const nombreLimpio = formCategoria.nombre.trim()
    if (!nombreLimpio) {
      setErrorCat('El nombre de la categoría es obligatorio.')
      return
    }

    if (editandoCategoriaId) {
      // Editar
      const nuevasCategorias = categorias.map((cat) =>
        cat.id === editandoCategoriaId
          ? {
              ...cat,
              nombre: nombreLimpio,
              orden: Number(formCategoria.orden),
              activa: formCategoria.activa,
            }
          : cat
      )
      actualizarCategorias(nuevasCategorias)
      cancelarEdicionCategoria()
    } else {
      // Crear nueva
      const nuevaId = `cat-${Date.now()}`
      const nuevaCat: CategoriaCatalogo = {
        id: nuevaId,
        nombre: nombreLimpio,
        orden: Number(formCategoria.orden),
        activa: formCategoria.activa,
      }
      actualizarCategorias([...categorias, nuevaCat])
      setFormCategoria({ nombre: '', orden: categorias.length + 1, activa: true })
    }
  }

  const eliminarCategoria = (id: string) => {
    const conProductos = productos.some((p) => p.categoriaId === id)
    const mensaje = conProductos
      ? '¡Advertencia! Hay productos asignados a esta categoría. Si la eliminás, quedarán sin categoría visible. ¿Confirmás eliminarla?'
      : '¿Seguro que querés eliminar esta categoría?'

    if (window.confirm(mensaje)) {
      const nuevasCategorias = categorias.filter((c) => c.id !== id)
      actualizarCategorias(nuevasCategorias)
      if (editandoCategoriaId === id) {
        cancelarEdicionCategoria()
      }
    }
  }

  const alternarEstadoCategoria = (cat: CategoriaCatalogo) => {
    const nuevasCategorias = categorias.map((c) =>
      c.id === cat.id ? { ...c, activa: !c.activa } : c
    )
    actualizarCategorias(nuevasCategorias)
  }

  // ── MODIFICADORES ACCIONES ──────────────────────────────────────────

  const seleccionarModificadorParaEditar = (mod: ModificadorCatalogo) => {
    setErrorMod('')
    setEditandoModificadorId(mod.id)
    setFormModificador({
      nombre: mod.nombre,
      precioExtra: mod.precioExtra,
    })
  }

  const cancelarEdicionModificador = () => {
    setErrorMod('')
    setEditandoModificadorId(null)
    setFormModificador({ nombre: '', precioExtra: 0 })
  }

  const guardarModificador = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMod('')

    const nombreLimpio = formModificador.nombre.trim()
    if (!nombreLimpio) {
      setErrorMod('El nombre del modificador es obligatorio.')
      return
    }

    if (formModificador.precioExtra < 0) {
      setErrorMod('El precio extra no puede ser negativo.')
      return
    }

    if (editandoModificadorId) {
      // Editar
      const nuevosMods = modificadores.map((mod) =>
        mod.id === editandoModificadorId
          ? {
              ...mod,
              nombre: nombreLimpio,
              precioExtra: Number(formModificador.precioExtra),
            }
          : mod
      )
      actualizarModificadores(nuevosMods)
      cancelarEdicionModificador()
    } else {
      // Crear nuevo
      const nuevoId = `mod-${Date.now()}`
      const nuevoMod: ModificadorCatalogo = {
        id: nuevoId,
        nombre: nombreLimpio,
        precioExtra: Number(formModificador.precioExtra),
      }
      actualizarModificadores([...modificadores, nuevoMod])
      setFormModificador({ nombre: '', precioExtra: 0 })
    }
  }

  const eliminarModificador = (id: string) => {
    if (window.confirm('¿Seguro que querés eliminar este modificador? Se quitará de todos los productos vinculados.')) {
      const nuevosMods = modificadores.filter((m) => m.id !== id)
      actualizarModificadores(nuevosMods)
      
      // Quitar modificador del catálogo de productos
      const nuevosProds = productos.map((p) => {
        if (p.modificadoresIds?.includes(id)) {
          return {
            ...p,
            modificadoresIds: p.modificadoresIds.filter((mid) => mid !== id),
          }
        }
        return p
      })
      actualizarProductos(nuevosProds)

      if (editandoModificadorId === id) {
        cancelarEdicionModificador()
      }
    }
  }

  // ── PRODUCTOS ACCIONES ─────────────────────────────────────────────

  const seleccionarProductoParaEditar = (prod: ProductoCatalogo) => {
    setErrorProd('')
    setEditandoProductoId(prod.id)
    setFormProducto({
      nombre: prod.nombre,
      categoriaId: prod.categoriaId,
      precio: prod.precio,
      activo: prod.activo,
      stock: prod.stock !== undefined && prod.stock !== null ? String(prod.stock) : '',
      esCombo: !!prod.esCombo,
      modificadoresIds: prod.modificadoresIds || [],
    })
  }

  const cancelarEdicionProducto = () => {
    setErrorProd('')
    setEditandoProductoId(null)
    setFormProducto({
      nombre: '',
      categoriaId: categorias[0]?.id ?? '',
      precio: 0,
      activo: true,
      stock: '',
      esCombo: false,
      modificadoresIds: [],
    })
  }

  const guardarProducto = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorProd('')

    const nombreLimpio = formProducto.nombre.trim()
    if (!nombreLimpio) {
      setErrorProd('El nombre del producto es obligatorio.')
      return
    }

    if (!formProducto.categoriaId) {
      setErrorProd('Debés seleccionar una categoría válida.')
      return
    }

    if (formProducto.precio < 0) {
      setErrorProd('El precio no puede ser negativo.')
      return
    }

    const parseStock = formProducto.stock.trim() === '' ? null : Number(formProducto.stock)
    if (parseStock !== null && (isNaN(parseStock) || parseStock < 0)) {
      setErrorProd('El stock debe ser un número entero mayor o igual a 0.')
      return
    }

    const datosProducto: Partial<ProductoCatalogo> = {
      nombre: nombreLimpio,
      categoriaId: formProducto.categoriaId,
      precio: Number(formProducto.precio),
      activo: formProducto.activo,
      stock: parseStock,
      esCombo: formProducto.esCombo,
      modificadoresIds: formProducto.modificadoresIds,
    }

    if (editandoProductoId) {
      // Editar existente
      const nuevosProductos = productos.map((p) =>
        p.id === editandoProductoId ? { ...p, ...datosProducto } as ProductoCatalogo : p
      )
      actualizarProductos(nuevosProductos)
      cancelarEdicionProducto()
    } else {
      // Crear nuevo
      const nuevoId = generarIdProducto()
      const nuevoProd: ProductoCatalogo = {
        id: nuevoId,
        ...datosProducto,
      } as ProductoCatalogo
      actualizarProductos([...productos, nuevoProd])
      setFormProducto({
        nombre: '',
        categoriaId: formProducto.categoriaId, // Conserva la última categoría seleccionada
        precio: 0,
        activo: true,
        stock: '',
        esCombo: false,
        modificadoresIds: [],
      })
    }
  }

  const eliminarProducto = (id: string) => {
    if (window.confirm('¿Seguro que querés eliminar este producto/promo del catálogo?')) {
      const nuevosProductos = productos.filter((p) => p.id !== id)
      actualizarProductos(nuevosProductos)
      if (editandoProductoId === id) {
        cancelarEdicionProducto()
      }
    }
  }

  const alternarEstadoProducto = (prod: ProductoCatalogo) => {
    const nuevosProductos = productos.map((p) =>
      p.id === prod.id ? { ...p, activo: !p.activo } : p
    )
    actualizarProductos(nuevosProductos)
  }

  const alternarModificadorDeProducto = (modId: string) => {
    setFormProducto((prev) => {
      const existe = prev.modificadoresIds.includes(modId)
      const nuevosIds = existe
        ? prev.modificadoresIds.filter((id) => id !== modId)
        : [...prev.modificadoresIds, modId]
      return {
        ...prev,
        modificadoresIds: nuevosIds,
      }
    })
  }

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-chefsy/10 dark:bg-chefsy-400/20 text-chefsy dark:text-chefsy-400 rounded-2xl shrink-0">
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 leading-tight">Gestión del Catálogo</h1>
            <p className="text-xs text-gray-400 dark:text-slate-400">
              Administrá los productos, promociones, combos y adiciones del sistema
            </p>
          </div>
        </div>

        {/* Pestanas Selectoras */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
          <button
            onClick={() => setPestanaActiva('productos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              pestanaActiva === 'productos'
                ? 'bg-white dark:bg-slate-700 text-chefsy-800 dark:text-slate-100 shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <ShoppingBag size={14} /> Productos y Combos
          </button>
          <button
            onClick={() => setPestanaActiva('categorias')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              pestanaActiva === 'categorias'
                ? 'bg-white dark:bg-slate-700 text-chefsy-800 dark:text-slate-100 shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Layers size={14} /> Categorías
          </button>
          <button
            onClick={() => setPestanaActiva('modificadores')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              pestanaActiva === 'modificadores'
                ? 'bg-white dark:bg-slate-700 text-chefsy-800 dark:text-slate-100 shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sliders size={14} /> Modificadores
          </button>
        </div>
      </div>

      {/* Contenido según Pestaña */}
      {pestanaActiva === 'productos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Listado y Filtros (2/3 columnas) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Tarjeta de Filtros */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 transition-colors">
              {/* Buscador */}
              <div className="flex-1 flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-chefsy/50 transition-all">
                <Search size={16} className="text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar producto o promo…"
                  value={buscarProducto}
                  onChange={(e) => setBuscarProducto(e.target.value)}
                  className="bg-transparent border-none text-base md:text-sm outline-none text-slate-700 dark:text-slate-200 w-full placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
                {buscarProducto && (
                  <button onClick={() => setBuscarProducto('')} className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-350">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Selector de Categorías */}
              <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800">
                <Filter size={16} className="text-slate-400 dark:text-slate-500" />
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="bg-transparent border-none text-base md:text-sm outline-none text-slate-700 dark:text-slate-200 font-semibold cursor-pointer focus:ring-0"
                >
                  <option value="todas">Todas las categorías</option>
                  {categoriasOrdenadas.map((cat) => (
                    <option key={cat.id} value={cat.id} className="dark:bg-slate-900">
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Listado de Productos (Desktop - Tabla) */}
            <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-55 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                      <th className="px-4 py-3">Producto / Promo</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3">Precio</th>
                      <th className="px-4 py-3">Modificadores</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-xs">
                    {productosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-400 dark:text-slate-500">
                          <Package size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                          No se encontraron productos en esta categoría o búsqueda.
                        </td>
                      </tr>
                    ) : (
                      gruposCategorias.map((grupo) => (
                        <React.Fragment key={grupo.id}>
                          <tr className="bg-slate-50/80 dark:bg-slate-800/60">
                            <td colSpan={6} className="px-4 py-2 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                              {grupo.nombre}
                            </td>
                          </tr>
                          {grupo.productos.map((prod) => (
                            <tr
                              key={prod.id}
                              className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors ${
                                !prod.activo ? 'opacity-60' : ''
                              } ${editandoProductoId === prod.id ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/50 dark:hover:bg-amber-950/30' : ''}`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {prod.esCombo && (
                                    <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                                      🎁 COMBO
                                    </span>
                                  )}
                                  <span className="font-semibold text-slate-800 dark:text-slate-100">{prod.nombre}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                                  {mapaCategorias[prod.categoriaId] || 'Sin categoría'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-50">
                                {formatearPrecio(prod.precio)}
                              </td>
                              <td className="px-4 py-3">
                                {prod.modificadoresIds && prod.modificadoresIds.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                                    {prod.modificadoresIds.map((mid) => {
                                      const mod = modificadores.find((m) => m.id === mid)
                                      if (!mod) return null
                                      return (
                                        <span
                                          key={mid}
                                          className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/40"
                                        >
                                          {mod.nombre}
                                        </span>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-550 italic text-[10px]">Sin adicionales</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => alternarEstadoProducto(prod)}
                                  title={prod.activo ? 'Desactivar producto' : 'Activar producto'}
                                  className="focus:outline-none"
                                >
                                  {prod.activo ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 px-2 py-0.5 rounded-full text-[10px] hover:bg-emerald-100 dark:hover:bg-emerald-900/80 transition-colors">
                                      <CheckCircle size={12} /> Activo
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                      <XCircle size={12} /> Inactivo
                                    </span>
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => seleccionarProductoParaEditar(prod)}
                                    className={`p-1.5 rounded-lg border transition-all ${
                                      editandoProductoId === prod.id
                                        ? 'bg-amber-100 border-amber-200 dark:bg-amber-950/60 dark:border-amber-900 text-amber-700 dark:text-amber-300'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100'
                                    }`}
                                    title="Editar"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => eliminarProducto(prod.id)}
                                    className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 dark:text-slate-450 hover:text-red-600 dark:hover:text-red-400 hover:border-red-150 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Listado de Productos (Mobile - Tarjetas) */}
            <div className="md:hidden space-y-4">
              {productosFiltrados.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center text-gray-400 dark:text-slate-500 transition-colors">
                  <Package size={32} className="mx-auto text-slate-300 dark:text-slate-650 mb-2" />
                  No se encontraron productos en esta categoría o búsqueda.
                </div>
              ) : (
                gruposCategorias.map((grupo) => (
                  <div key={grupo.id} className="space-y-3">
                    <div className="flex items-center gap-2 mt-4 mb-2">
                      <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                      <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {grupo.nombre}
                      </h4>
                      <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                    </div>
                    
                    {grupo.productos.map((prod) => (
                      <div
                        key={prod.id}
                        className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 transition-all ${
                          !prod.activo ? 'opacity-60' : ''
                        } ${editandoProductoId === prod.id ? 'border-amber-300 dark:border-amber-900 bg-amber-50/10 dark:bg-amber-950/10' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {prod.esCombo && (
                                <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm">
                                  🎁 COMBO
                                </span>
                              )}
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[9px] font-bold">
                                {mapaCategorias[prod.categoriaId] || 'Sin categoría'}
                              </span>
                            </div>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mt-1">{prod.nombre}</h4>
                          </div>
                          <span className="font-black text-slate-900 dark:text-slate-50 text-base">{formatearPrecio(prod.precio)}</span>
                        </div>

                        {/* Modificadores en mobile */}
                        {prod.modificadoresIds && prod.modificadoresIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {prod.modificadoresIds.map((mid) => {
                              const mod = modificadores.find((m) => m.id === mid)
                              if (!mod) return null
                              return (
                                <span
                                  key={mid}
                                  className="bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-300 text-[8px] font-bold px-1 py-0.5 rounded"
                                >
                                  {mod.nombre}
                                </span>
                              )
                            })}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 border-t border-slate-50 dark:border-slate-800/80 pt-2 mt-1">
                          <div className="flex items-center gap-1.5">
                            <span>Stock:</span>
                            {prod.stock !== undefined && prod.stock !== null ? (
                              <span className={`font-semibold ${prod.stock > 5 ? 'text-green-600' : 'text-orange-600'}`}>
                                {prod.stock} u.
                              </span>
                            ) : (
                              <span className="italic">Ilimitado</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Activo toggle */}
                            <button
                              onClick={() => alternarEstadoProducto(prod)}
                              className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 focus:outline-none"
                            >
                              {prod.activo ? (
                                <>
                                  <CheckCircle size={14} className="text-emerald-500" />
                                  <span>Activo</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} className="text-slate-350" />
                                  <span>Inactivo</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-2 border-t border-slate-50 dark:border-slate-800/80 pt-2.5 mt-0.5">
                          <button
                            onClick={() => seleccionarProductoParaEditar(prod)}
                            className="flex-1 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                          >
                            <Edit2 size={12} /> Editar
                          </button>
                          <button
                            onClick={() => eliminarProducto(prod.id)}
                            className="py-1.5 px-3 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Formulario de Producto (1/3 columna) */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-5 sticky top-6 space-y-4 transition-colors">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Tag size={16} className="text-chefsy" />
                  {editandoProductoId ? 'Editar Producto / Promo' : 'Nuevo Producto / Promo'}
                </h3>
                {editandoProductoId && (
                  <button
                    onClick={cancelarEdicionProducto}
                    className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-350 text-xs font-bold flex items-center gap-0.5"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              {errorProd && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-150 dark:border-red-900/50 rounded-xl p-3 text-xs text-red-700 dark:text-red-300 font-semibold">
                  ⚠️ {errorProd}
                </div>
              )}

              <form onSubmit={guardarProducto} className="space-y-4">
                {/* Nombre */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-350 uppercase tracking-wider block">
                    Nombre del artículo
                  </label>
                  <input
                    type="text"
                    value={formProducto.nombre}
                    onChange={(e) => setFormProducto({ ...formProducto, nombre: e.target.value })}
                    placeholder="Ej. Burguer Doble con Queso"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Categoría */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-350 uppercase tracking-wider block">
                    Categoría
                  </label>
                  <select
                    value={formProducto.categoriaId}
                    onChange={(e) => setFormProducto({ ...formProducto, categoriaId: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100"
                  >
                    <option value="" className="dark:bg-slate-900">Seleccioná una categoría…</option>
                    {categoriasOrdenadas.map((cat) => (
                      <option key={cat.id} value={cat.id} className="dark:bg-slate-900">
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Precio */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-350 uppercase tracking-wider block">
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    value={formProducto.precio || ''}
                    onChange={(e) =>
                      setFormProducto({ ...formProducto, precio: Number(e.target.value) })
                    }
                    placeholder="0"
                    min="0"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100"
                  />
                </div>

                {/* Stock */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-350 uppercase tracking-wider block">
                    Stock disponible (Opcional)
                  </label>
                  <input
                    type="number"
                    value={formProducto.stock}
                    onChange={(e) => setFormProducto({ ...formProducto, stock: e.target.value })}
                    placeholder="Vacío para ilimitado"
                    min="0"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100"
                  />
                  <p className="text-[9px] text-gray-400 dark:text-slate-500">
                    Dejar vacío si no manejás límites de stock para este producto
                  </p>
                </div>

                {/* Modificadores Vinculados */}
                <div className="space-y-1.5 pt-2 border-t border-slate-50 dark:border-slate-800/80">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-350 uppercase tracking-wider block">
                    Modificadores Permitidos
                  </label>
                  {modificadores.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No hay modificadores creados aún. Creá adicionales en la solapa de arriba.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                      {modificadores.map((mod) => {
                        const estaVinculado = formProducto.modificadoresIds.includes(mod.id)
                        return (
                          <label
                            key={mod.id}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] font-medium cursor-pointer transition-colors ${
                              estaVinculado
                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={estaVinculado}
                              onChange={() => alternarModificadorDeProducto(mod.id)}
                              className="hidden"
                            />
                            <span>{mod.nombre}</span>
                            <span className="text-[9px] text-slate-400 ml-auto">(+${mod.precioExtra})</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Checkboxes de Opciones */}
                <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-slate-850">
                  {/* Es combo/promo */}
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={formProducto.esCombo}
                      onChange={(e) => setFormProducto({ ...formProducto, esCombo: e.target.checked })}
                      className="w-4 h-4 rounded text-chefsy focus:ring-chefsy border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <span>🎁 Es un Combo / Promo especial</span>
                  </label>

                  {/* Activo */}
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={formProducto.activo}
                      onChange={(e) => setFormProducto({ ...formProducto, activo: e.target.checked })}
                      className="w-4 h-4 rounded text-chefsy focus:ring-chefsy border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <span>Visible y activo en catálogo</span>
                  </label>
                </div>

                {/* Botón de envío */}
                <button
                  type="submit"
                  className="w-full bg-chefsy hover:bg-chefsy-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  {editandoProductoId ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {pestanaActiva === 'categorias' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Listado de Categorías (2/3 columnas) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Desktop View (Tabla) */}
            <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden transition-colors">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                    <th className="px-4 py-3">Orden</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-xs">
                  {categoriasOrdenadas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-400 dark:text-slate-500">
                        <Layers size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        No hay categorías en el catálogo.
                      </td>
                    </tr>
                  ) : (
                    categoriasOrdenadas.map((cat) => (
                      <tr
                        key={cat.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors ${
                          !cat.activa ? 'opacity-60' : ''
                        } ${editandoCategoriaId === cat.id ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/50 dark:hover:bg-amber-950/30' : ''}`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-500 dark:text-slate-400">
                          {cat.orden}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">
                          {cat.nombre}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => alternarEstadoCategoria(cat)}
                            title={cat.activa ? 'Desactivar categoría' : 'Activar categoría'}
                            className="focus:outline-none"
                          >
                            {cat.activa ? (
                              <CheckCircle size={18} className="text-emerald-500 dark:text-emerald-400 mx-auto" />
                            ) : (
                              <XCircle size={18} className="text-slate-300 dark:text-slate-600 mx-auto" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => seleccionarCategoriaParaEditar(cat)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                editandoCategoriaId === cat.id
                                  ? 'bg-amber-100 border-amber-200 dark:bg-amber-950/60 dark:border-amber-900 text-amber-700 dark:text-amber-300'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100'
                              }`}
                              title="Editar"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => eliminarCategoria(cat.id)}
                              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 dark:text-slate-455 hover:text-red-600 dark:hover:text-red-400 hover:border-red-150 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all"
                              title="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View (Tarjetas) */}
            <div className="md:hidden space-y-3">
              {categoriasOrdenadas.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center text-gray-400 dark:text-slate-500 transition-colors">
                  <Layers size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  No hay categorías en el catálogo.
                </div>
              ) : (
                categoriasOrdenadas.map((cat) => (
                  <div
                    key={cat.id}
                    className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 transition-all ${
                      !cat.activa ? 'opacity-60' : ''
                    } ${editandoCategoriaId === cat.id ? 'border-amber-300 dark:border-amber-900 bg-amber-50/10 dark:bg-amber-950/10' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Orden de visualización: {cat.orden}
                        </span>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mt-0.5">{cat.nombre}</h4>
                      </div>
                      <button
                        onClick={() => alternarEstadoCategoria(cat)}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 focus:outline-none"
                      >
                        {cat.activa ? (
                          <>
                            <CheckCircle size={14} className="text-emerald-500" />
                            <span>Activa</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={14} className="text-slate-350" />
                            <span>Inactiva</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 border-t border-slate-50 dark:border-slate-800/80 pt-2.5 mt-1">
                      <button
                        onClick={() => seleccionarCategoriaParaEditar(cat)}
                        className="flex-1 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => eliminarCategoria(cat.id)}
                        className="py-1.5 px-3 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Formulario de Categoría (1/3 columna) */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-5 sticky top-6 space-y-4 transition-colors">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Layers size={16} className="text-chefsy" />
                  {editandoCategoriaId ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>
                {editandoCategoriaId && (
                  <button
                    onClick={cancelarEdicionCategoria}
                    className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-350 text-xs font-bold flex items-center gap-0.5"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              {errorCat && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-150 dark:border-red-900/50 rounded-xl p-3 text-xs text-red-700 dark:text-red-300 font-semibold">
                  ⚠️ {errorCat}
                </div>
              )}

              <form onSubmit={guardarCategoria} className="space-y-4">
                {/* Nombre */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-350 uppercase tracking-wider block">
                    Nombre de la Categoría
                  </label>
                  <input
                    type="text"
                    value={formCategoria.nombre}
                    onChange={(e) => setFormCategoria({ ...formCategoria, nombre: e.target.value })}
                    placeholder="Ej. Bebidas, Minutas, Postres"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Orden */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-350 uppercase tracking-wider block">
                    Orden de Visualización (Número)
                  </label>
                  <input
                    type="number"
                    value={formCategoria.orden}
                    onChange={(e) => setFormCategoria({ ...formCategoria, orden: Number(e.target.value) })}
                    placeholder="1"
                    min="0"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100"
                  />
                  <p className="text-[9px] text-gray-400 dark:text-slate-550">
                    Determina la posición en la que aparecerá la categoría en las vistas de pedidos
                  </p>
                </div>

                {/* Activa */}
                <div className="pt-2 border-t border-slate-50 dark:border-slate-800/80">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={formCategoria.activa}
                      onChange={(e) => setFormCategoria({ ...formCategoria, activa: e.target.checked })}
                      className="w-4 h-4 rounded text-chefsy focus:ring-chefsy border-slate-300 dark:border-slate-700 dark:bg-slate-850"
                    />
                    <span>Categoría activa y visible</span>
                  </label>
                </div>

                {/* Botón de envío */}
                <button
                  type="submit"
                  className="w-full bg-chefsy hover:bg-chefsy-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  {editandoCategoriaId ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {pestanaActiva === 'modificadores' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Listado de Modificadores (2/3 columnas) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Desktop View (Tabla) */}
            <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden transition-colors">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                    <th className="px-4 py-3">Modificador / Adicional</th>
                    <th className="px-4 py-3">Precio Extra</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-xs">
                  {modificadores.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-gray-400 dark:text-slate-500">
                        <Sliders size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        No hay modificadores creados aún.
                      </td>
                    </tr>
                  ) : (
                    modificadores.map((mod) => (
                      <tr
                        key={mod.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors ${
                          editandoModificadorId === mod.id ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/50 dark:hover:bg-amber-950/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">
                          {mod.nombre}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-50">
                          {formatearPrecio(mod.precioExtra)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => seleccionarModificadorParaEditar(mod)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                editandoModificadorId === mod.id
                                  ? 'bg-amber-100 border-amber-200 dark:bg-amber-950/60 dark:border-amber-900 text-amber-700 dark:text-amber-300'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100'
                              }`}
                              title="Editar"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => eliminarModificador(mod.id)}
                              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 dark:text-slate-450 hover:text-red-600 dark:hover:text-red-400 hover:border-red-150 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all"
                              title="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View (Tarjetas) */}
            <div className="md:hidden space-y-3">
              {modificadores.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center text-gray-400 dark:text-slate-500 transition-colors">
                  <Sliders size={32} className="mx-auto text-slate-300 dark:text-slate-605 mb-2" />
                  No hay modificadores creados aún.
                </div>
              ) : (
                modificadores.map((mod) => (
                  <div
                    key={mod.id}
                    className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 transition-all ${
                      editandoModificadorId === mod.id ? 'border-amber-300 dark:border-amber-900 bg-amber-50/10 dark:bg-amber-950/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{mod.nombre}</h4>
                      <span className="font-black text-slate-900 dark:text-slate-50 text-sm">{formatearPrecio(mod.precioExtra)}</span>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 border-t border-slate-50 dark:border-slate-800/80 pt-2.5 mt-1">
                      <button
                        onClick={() => seleccionarModificadorParaEditar(mod)}
                        className="flex-1 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => eliminarModificador(mod.id)}
                        className="py-1.5 px-3 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Formulario de Modificador (1/3 columna) */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-5 sticky top-6 space-y-4 transition-colors">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Sliders size={16} className="text-chefsy" />
                  {editandoModificadorId ? 'Editar Modificador' : 'Nuevo Modificador'}
                </h3>
                {editandoModificadorId && (
                  <button
                    onClick={cancelarEdicionModificador}
                    className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-350 text-xs font-bold flex items-center gap-0.5"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              {errorMod && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-150 dark:border-red-900/50 rounded-xl p-3 text-xs text-red-700 dark:text-red-300 font-semibold">
                  ⚠️ {errorMod}
                </div>
              )}

              <form onSubmit={guardarModificador} className="space-y-4">
                {/* Nombre */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-350 uppercase tracking-wider block">
                    Nombre del Modificador
                  </label>
                  <input
                    type="text"
                    value={formModificador.nombre}
                    onChange={(e) => setFormModificador({ ...formModificador, nombre: e.target.value })}
                    placeholder="Ej. Doble Queso, Sin Cebolla, + Papas"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Precio Extra */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-350 uppercase tracking-wider block">
                    Precio Adicional ($)
                  </label>
                  <input
                    type="number"
                    value={formModificador.precioExtra || ''}
                    onChange={(e) => setFormModificador({ ...formModificador, precioExtra: Number(e.target.value) })}
                    placeholder="0"
                    min="0"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100"
                  />
                  <p className="text-[9px] text-gray-400 dark:text-slate-500">
                    Ingresá 0 si es un cambio que no modifica el precio (ej. "Sin Cebolla")
                  </p>
                </div>

                {/* Botón de envío */}
                <button
                  type="submit"
                  className="w-full bg-chefsy hover:bg-chefsy-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  {editandoModificadorId ? 'Guardar Cambios' : 'Crear Modificador'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
