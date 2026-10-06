'use client'

import { useState, useEffect } from 'react'

export function useMediaQuery(query: string, serverFallback = false): boolean {
  // Inicializar en serverFallback garantiza coincidencia 100% entre SSR y el primer render del cliente
  const [matches, setMatches] = useState(serverFallback)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const matchMedia = window.matchMedia(query)
    setMatches(matchMedia.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    matchMedia.addEventListener('change', handler)
    return () => matchMedia.removeEventListener('change', handler)
  }, [query])

  return matches
}
