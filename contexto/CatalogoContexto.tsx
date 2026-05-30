'use client'

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { CategoriaCatalogo, ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { categoriasCatalogo, productosCatalogo, modificadoresCatalogo } from '@/datos/productos'
import { obtenerCatalogoPrincipal, inicializarCatalogo, suscribirACatalogo } from '@/servicios/supabase/catalogo'

export interface ValorContextoCatalogo {
  categorias: CategoriaCatalogo[]
  productos: ProductoCatalogo[]
  modificadores: ModificadorCatalogo[]
  actualizarCategorias: (categorias: CategoriaCatalogo[]) => void
  actualizarProductos: (productos: ProductoCatalogo[]) => void
  actualizarModificadores: (modificadores: ModificadorCatalogo[]) => void
  sincronizarCatalogoCompleto: () => Promise<void>
  estaListoCatalogo: boolean
}

const ContextoCatalogo = createContext<ValorContextoCatalogo | undefined>(undefined)

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
      // 1.a) Primero cargar fallbacks locales desde localStorage o estáticos
      const catsCrud = localStorage.getItem('chefsy-categorias-v1')
      let catsActuales = catsCrud ? JSON.parse(catsCrud) : categoriasCatalogo
      if (!catsActuales.some((c: any) => c.id === 'promos')) {
        catsActuales.push({ id: 'promos', nombre: 'Promos', orden: 9, activa: true })
      }
      setCategorias(catsActuales)
      categoriasRef.current = catsActuales

      const prodsCrud = localStorage.getItem('chefsy-productos-v1')
      let prodsActuales = prodsCrud ? JSON.parse(prodsCrud) : productosCatalogo
      setProductos(prodsActuales)
      productosRef.current = prodsActuales

      const modsCrud = localStorage.getItem('chefsy-modificadores-v1')
      let modsActuales = modsCrud ? JSON.parse(modsCrud) : modificadoresCatalogo
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
            // El catálogo principal no existe, crearlo con valores iniciales
            try {
              await inicializarCatalogo({
                categorias: catsActuales,
                productos: prodsActuales,
                modificadores: modsActuales
              })
            } catch (insError) {
              console.error('[Supabase] Error al inicializar catálogo:', insError)
            }
          } else {
            const cats = catalogoGuardado.categorias || []
            const prods = catalogoGuardado.productos || []
            const mods = catalogoGuardado.modificadores || []

            setCategorias(cats)
            categoriasRef.current = cats
            localStorage.setItem('chefsy-categorias-v1', JSON.stringify(cats))

            setProductos(prods)
            productosRef.current = prods
            localStorage.setItem('chefsy-productos-v1', JSON.stringify(prods))

            setModificadores(mods)
            modificadoresRef.current = mods
            localStorage.setItem('chefsy-modificadores-v1', JSON.stringify(mods))
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

      const cats = catalogoNuevo.categorias || []
      const prods = catalogoNuevo.productos || []
      const mods = catalogoNuevo.modificadores || []

      setCategorias(cats)
      categoriasRef.current = cats
      localStorage.setItem('chefsy-categorias-v1', JSON.stringify(cats))

      setProductos(prods)
      productosRef.current = prods
      localStorage.setItem('chefsy-productos-v1', JSON.stringify(prods))

      setModificadores(mods)
      modificadoresRef.current = mods
      localStorage.setItem('chefsy-modificadores-v1', JSON.stringify(mods))
    })

    return () => {
      channel.unsubscribe()
    }
  }, [estaListoCatalogo])

  // Guardar catálogo completo en Supabase a través del servidor seguro
  const sincronizarCatalogoCompleto = async () => {
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
      }, 500)
    }
  }

  const actualizarCategorias = (nuevasCategorias: CategoriaCatalogo[]) => {
    setCategorias(nuevasCategorias)
    categoriasRef.current = nuevasCategorias
    localStorage.setItem('chefsy-categorias-v1', JSON.stringify(nuevasCategorias))
    sincronizarCatalogoCompleto()
  }

  const actualizarProductos = (nuevosProductos: ProductoCatalogo[]) => {
    setProductos(nuevosProductos)
    productosRef.current = nuevosProductos
    localStorage.setItem('chefsy-productos-v1', JSON.stringify(nuevosProductos))
    sincronizarCatalogoCompleto()
  }

  const actualizarModificadores = (nuevosModificadores: ModificadorCatalogo[]) => {
    setModificadores(nuevosModificadores)
    modificadoresRef.current = nuevosModificadores
    localStorage.setItem('chefsy-modificadores-v1', JSON.stringify(nuevosModificadores))
    sincronizarCatalogoCompleto()
  }

  return (
    <ContextoCatalogo.Provider
      value={{
        categorias,
        productos,
        modificadores,
        actualizarCategorias,
        actualizarProductos,
        actualizarModificadores,
        sincronizarCatalogoCompleto,
        estaListoCatalogo,
      }}
    >
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
