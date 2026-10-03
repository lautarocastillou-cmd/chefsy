'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react'
import { CategoriaCatalogo, ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { categoriasCatalogo, productosCatalogo, modificadoresCatalogo } from '@/datos/productos'
import { obtenerCatalogoPrincipal, inicializarCatalogo, suscribirACatalogo } from '@/servicios/supabase/catalogo'
import { setCache, getCache } from '@/lib/localCache'

// TTL del catálogo: 2 horas. Pasado ese tiempo, la próxima apertura
// descartará el caché y descargará el catálogo fresco desde Supabase.
const TTL_CATALOGO_HS = 2

export interface ValorContextoCatalogo {
  categorias: CategoriaCatalogo[]
  productos: ProductoCatalogo[]
  modificadores: ModificadorCatalogo[]
  actualizarCategorias: (categorias: CategoriaCatalogo[]) => void
  actualizarProductos: (productos: ProductoCatalogo[]) => void
  actualizarModificadores: (modificadores: ModificadorCatalogo[]) => void
  descontarStockProducto: (productoId: string, cantidad: number) => void
  sincronizarCatalogoCompleto: () => Promise<void>
  estaListoCatalogo: boolean
}

const ContextoCatalogo = createContext<ValorContextoCatalogo | undefined>(undefined)

function leerCatalogoCache<T>(clave: string, fallback: T): T {
  // getCache ya maneja TTL, corrupción y limpieza automática
  return getCache<T>(clave, TTL_CATALOGO_HS) ?? fallback
}

export function ProveedorCatalogo({ children }: { children: ReactNode }) {
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>([])
  const [productos, setProductos] = useState<ProductoCatalogo[]>([])
  const [modificadores, setModificadores] = useState<ModificadorCatalogo[]>([])
  const [estaListoCatalogo, setEstaListoCatalogo] = useState(false)

  const categoriasRef = useRef<CategoriaCatalogo[]>([])
  const productosRef = useRef<ProductoCatalogo[]>([])
  const modificadoresRef = useRef<ModificadorCatalogo[]>([])
  const esCambioCatalogoLocalRef = useRef(false)

  // Cargar Catálogo (Supabase con fallback de LocalStorage)
  useEffect(() => {
    async function cargarInicial() {
      // 1.a) Primero cargar fallbacks desde caché (con TTL) o estáticos
      const catsActuales = leerCatalogoCache<CategoriaCatalogo[]>('chefsy-categorias-v1', categoriasCatalogo)
        .filter((c: any) => c.id !== 'promos' && c.nombre?.toLowerCase().trim() !== 'promos')
      setCategorias(catsActuales)
      categoriasRef.current = catsActuales

      const prodsActuales = leerCatalogoCache<ProductoCatalogo[]>('chefsy-productos-v1', productosCatalogo)
      setProductos(prodsActuales)
      productosRef.current = prodsActuales

      const modsActuales = leerCatalogoCache<ModificadorCatalogo[]>('chefsy-modificadores-v1', modificadoresCatalogo)
      setModificadores(modsActuales)
      modificadoresRef.current = modsActuales

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const credencialesValidas = url && key && !url.includes('falta-configurar') && !key.includes('falta-configurar')
      const estaOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

      // 1.b) Intentar cargar catálogo de Supabase
      if (credencialesValidas && estaOnline) {
        try {
          const catalogoGuardado = await obtenerCatalogoPrincipal()

          if (!catalogoGuardado) {
            console.warn('[Supabase] El catálogo remoto está vacío. Usando valores locales por defecto.')
          } else {
            const cats = (catalogoGuardado.categorias || []).filter((c: any) => c.id !== 'promos' && c.nombre?.toLowerCase().trim() !== 'promos')
            const prods = catalogoGuardado.productos || []
            const mods = catalogoGuardado.modificadores || []

            setCategorias(cats)
            categoriasRef.current = cats
            setCache('chefsy-categorias-v1', cats)

            setProductos(prods)
            productosRef.current = prods
            setCache('chefsy-productos-v1', prods)

            setModificadores(mods)
            modificadoresRef.current = mods
            setCache('chefsy-modificadores-v1', mods)
          }
        } catch (err) {
          console.error('[Supabase] Error al cargar catálogo remoto:', err)
        }
      }
      setEstaListoCatalogo(true)
    }
    cargarInicial()
  }, [])

  // Suscripción Realtime para la tabla de catálogo (Supabase)
  useEffect(() => {
    if (!estaListoCatalogo) return

    const channel = suscribirACatalogo((catalogoNuevo) => {
      if (esCambioCatalogoLocalRef.current) return

      const cats = (catalogoNuevo.categorias || []).filter((c: any) => c.id !== 'promos' && c.nombre?.toLowerCase().trim() !== 'promos')
      const prods = catalogoNuevo.productos || []
      const mods = catalogoNuevo.modificadores || []

      // Protección: nunca sobreescribir datos en memoria si la respuesta remota vino vacía por error
      if (prods.length === 0 && productosRef.current.length > 0) return
      if (cats.length === 0 && categoriasRef.current.length > 0) return

      setCategorias(cats)
      categoriasRef.current = cats
      setCache('chefsy-categorias-v1', cats)

      setProductos(prods)
      productosRef.current = prods
      setCache('chefsy-productos-v1', prods)

      setModificadores(mods)
      modificadoresRef.current = mods
      setCache('chefsy-modificadores-v1', mods)
    })

    return () => {
      channel.unsubscribe()
    }
  }, [estaListoCatalogo])

  // Guardar catálogo completo en Supabase a través del servidor seguro
  const sincronizarCatalogoCompleto = useCallback(async () => {
    if (!estaListoCatalogo) {
      console.warn('[Catalogo] Sincronización cancelada: el catálogo aún no terminó su carga inicial.')
      return
    }
    if (productosRef.current.length === 0 || categoriasRef.current.length === 0) {
      console.warn('[Catalogo] Sincronización cancelada: listas de catálogo vacías.')
      return
    }

    try {
      esCambioCatalogoLocalRef.current = true
      
      const respuesta = await fetch('/api/admin/catalogo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          categorias: categoriasRef.current,
          productos: productosRef.current,
          modificadores: modificadoresRef.current,
        })
      })

      if (!respuesta.ok) {
        const errorData = await respuesta.json().catch(() => ({}))
        throw new Error(errorData.error || `Error del servidor: ${respuesta.status}`)
      }
    } catch (e) {
      console.error('[Servidor/Supabase] Error al sincronizar catálogo remoto:', e)
    } finally {
      setTimeout(() => {
        esCambioCatalogoLocalRef.current = false
      }, 1200)
    }
  }, [estaListoCatalogo])

  // Todas en useCallback. Leen y escriben a través de refs
  // (categoriasRef/productosRef/...), no estado directo, así que no hay riesgo
  // de closure viejo: el ref siempre tiene el valor actual.
  const actualizarCategorias = useCallback((nuevasCategorias: CategoriaCatalogo[]) => {
    setCategorias(nuevasCategorias)
    categoriasRef.current = nuevasCategorias
    setCache('chefsy-categorias-v1', nuevasCategorias)
    sincronizarCatalogoCompleto()
  }, [sincronizarCatalogoCompleto])

  const actualizarProductos = useCallback((nuevosProductos: ProductoCatalogo[]) => {
    setProductos(nuevosProductos)
    productosRef.current = nuevosProductos
    setCache('chefsy-productos-v1', nuevosProductos)
    sincronizarCatalogoCompleto()
  }, [sincronizarCatalogoCompleto])

  const actualizarModificadores = useCallback((nuevosModificadores: ModificadorCatalogo[]) => {
    setModificadores(nuevosModificadores)
    modificadoresRef.current = nuevosModificadores
    setCache('chefsy-modificadores-v1', nuevosModificadores)
    sincronizarCatalogoCompleto()
  }, [sincronizarCatalogoCompleto])

  const descontarStockProducto = useCallback((productoId: string, cantidad: number) => {
    // Actualizar estado local optimistamente sin sincronizar todo el catálogo
    const nuevosProductos = productosRef.current.map((p) => {
      if (p.id === productoId && typeof p.stock === 'number') {
        const nuevoStock = Math.max(0, p.stock - cantidad)
        return { ...p, stock: nuevoStock }
      }
      return p
    })
    setProductos(nuevosProductos)
    productosRef.current = nuevosProductos
    setCache('chefsy-productos-v1', nuevosProductos)

    // Sincronizar solo el stock de este producto vía endpoint PATCH específico
    const productoActualizado = nuevosProductos.find((p) => p.id === productoId)
    if (productoActualizado && typeof productoActualizado.stock === 'number') {
      fetch('/api/admin/catalogo/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId, stock: productoActualizado.stock }),
      }).catch((err) => console.error('[Catalogo] Error al sincronizar stock:', err))
    }
  }, [])

  // Memorizado: sin esto el objeto de valor se crea en cada render y React
  // redibuja a todo el árbol del catálogo en cada cambio de estado.
  const valor = useMemo(
    () => ({
      categorias,
      productos,
      modificadores,
      actualizarCategorias,
      actualizarProductos,
      actualizarModificadores,
      descontarStockProducto,
      sincronizarCatalogoCompleto,
      estaListoCatalogo,
    }),
    [
      categorias,
      productos,
      modificadores,
      actualizarCategorias,
      actualizarProductos,
      actualizarModificadores,
      descontarStockProducto,
      sincronizarCatalogoCompleto,
      estaListoCatalogo,
    ]
  )

  return (
    <ContextoCatalogo.Provider value={valor}>
      {children}
    </ContextoCatalogo.Provider>
  )
}

export function usarCatalogo(): ValorContextoCatalogo {
  const contexto = useContext(ContextoCatalogo)
  if (!contexto) {
    throw new Error('usarCatalogo debe usarse dentro de un ProveedorCatalogo')
  }
  return contexto
}
