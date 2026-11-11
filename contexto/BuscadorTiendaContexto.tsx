'use client'

// ─────────────────────────────────────────────────────
// contexto/BuscadorTiendaContexto.tsx
// Provee los resultados de búsqueda de la tienda al panel
// anclado. Evita perforar props (metadata, productos, modal)
// a través de HeroSection → HeroManager → cada layout de hero.
// ─────────────────────────────────────────────────────

import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import { useSugerenciaBusqueda } from '@/hooks/useBuscadorInteligente'
import { buscarProductos } from '@/lib/busqueda-productos'
import { scrollHaciaResultados } from '@/lib/tienda-helpers'
import type { MetaProducto, ProductoCatalogo } from '@/tipos/catalogo'

export interface BuscadorTiendaValor {
  consulta: string
  resultados: ProductoCatalogo[]
  metadata: Record<string, MetaProducto>
  sugerencia: string | null
  nombreCategoria: (idCategoria: string) => string
  abrirProducto: (producto: ProductoCatalogo) => void
  verTodos: () => void
  limpiar: () => void
  aplicarSugerencia: () => void
}

const VALOR_INACTIVO: BuscadorTiendaValor = {
  consulta: '',
  resultados: [],
  metadata: {},
  sugerencia: null,
  nombreCategoria: () => '',
  abrirProducto: () => {},
  verTodos: () => {},
  limpiar: () => {},
  aplicarSugerencia: () => {},
}

const BuscadorTiendaContexto = createContext<BuscadorTiendaValor>(VALOR_INACTIVO)

export function usarBuscadorTienda(): BuscadorTiendaValor {
  return useContext(BuscadorTiendaContexto)
}

interface Props {
  consulta: string
  metadata: Record<string, MetaProducto>
  onConsultaChange: (valor: string) => void
  onAbrirProducto: (producto: ProductoCatalogo) => void
  children: React.ReactNode
}

export function ProveedorBuscadorTienda({
  consulta,
  metadata,
  onConsultaChange,
  onAbrirProducto,
  children,
}: Props) {
  const { productos, categorias } = usarCatalogo()
  const sugerencia = useSugerenciaBusqueda(consulta)

  const resultados = useMemo(() => {
    if (!consulta.trim()) return []
    return buscarProductos(
      productos.filter((producto) => producto.activo),
      consulta
    )
  }, [productos, consulta])

  const nombresCategoria = useMemo(() => {
    const mapa: Record<string, string> = {}
    for (const categoria of categorias) {
      mapa[categoria.id] = categoria.nombre
    }
    return mapa
  }, [categorias])

  const limpiar = useCallback(() => onConsultaChange(''), [onConsultaChange])

  const verTodos = useCallback(() => scrollHaciaResultados(), [])

  const aplicarSugerencia = useCallback(() => {
    if (sugerencia) onConsultaChange(sugerencia)
  }, [sugerencia, onConsultaChange])

  const nombreCategoria = useCallback(
    (idCategoria: string) => nombresCategoria[idCategoria] || '',
    [nombresCategoria]
  )

  const valor = useMemo<BuscadorTiendaValor>(
    () => ({
      consulta,
      resultados,
      metadata,
      sugerencia,
      nombreCategoria,
      abrirProducto: onAbrirProducto,
      verTodos,
      limpiar,
      aplicarSugerencia,
    }),
    [consulta, resultados, metadata, sugerencia, nombreCategoria, onAbrirProducto, verTodos, limpiar, aplicarSugerencia]
  )

  return <BuscadorTiendaContexto.Provider value={valor}>{children}</BuscadorTiendaContexto.Provider>
}
