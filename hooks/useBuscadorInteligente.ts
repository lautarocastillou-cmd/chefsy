import { useMemo } from 'react'
import Fuse from 'fuse.js'

// Diccionario de conceptos clave comunes en el menú.
// Podés expandirlo con palabras comunes que use la gente.
const CONCEPTOS_CLAVE = [
  "Hamburguesa", "Burger", "Cheddar", "Papas", "Fritas", 
  "Milanesa", "Mila", "Lomito", "Lomo", "Pizza", "Empanada", 
  "Bebida", "Gaseosa", "Coca Cola", "Sprite", "Fanta", "Agua",
  "Promo", "Combo", "Doble", "Completo", "Zapping", "Americana"
]

export function useSugerenciaBusqueda(busqueda: string) {
  return useMemo(() => {
    if (!busqueda || busqueda.trim().length < 3) return null

    const busquedaLower = busqueda.toLowerCase().trim()
    
    // Si ya coincide exactamente con un concepto clave, no sugerimos
    if (CONCEPTOS_CLAVE.some(c => c.toLowerCase() === busquedaLower)) return null

    const fuseConceptos = new Fuse(CONCEPTOS_CLAVE, { 
      threshold: 0.4, 
      includeScore: true 
    })
    
    const resConceptos = fuseConceptos.search(busqueda)
    
    if (resConceptos.length > 0) {
      const mejorMatch = resConceptos[0]
      // Solo sugerimos si hay buena coincidencia y no es exactamente lo que ya escribió
      if (mejorMatch.item.toLowerCase() !== busquedaLower && (mejorMatch.score || 1) < 0.4) {
        return mejorMatch.item
      }
    }
    return null
  }, [busqueda])
}
