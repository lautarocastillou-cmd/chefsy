'use client'

import { useSyncExternalStore, useCallback } from 'react'

export function useMediaQuery(query: string, serverFallback = false): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') return () => {}
      const matchMedia = window.matchMedia(query)
      matchMedia.addEventListener('change', callback)
      return () => {
        matchMedia.removeEventListener('change', callback)
      }
    },
    [query]
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return serverFallback
    return window.matchMedia(query).matches
  }, [query, serverFallback])

  const getServerSnapshot = useCallback(() => {
    return serverFallback
  }, [serverFallback])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
