// ─────────────────────────────────────────────────────
// lib/impresion/permisoRedLocal.ts
// Detección y guía interactiva para la política de seguridad
// de Local Network Access (LNA) / Private Network Access (PNA)
// en navegadores Chromium (Microsoft Edge y Google Chrome).
//
// Cuando Chefsy corre en HTTPS (https://chefsy.xyz) y busca
// comunicarse con el agente de impresión en 127.0.0.1:9187,
// Chromium exige el permiso de red local. Si está en 'prompt'
// o 'denied', los llamados en segundo plano fallan con TypeError.
// Este módulo detecta ese estado exacto y guía al usuario.
// ─────────────────────────────────────────────────────

export type EstadoPermisoRedLocal = 'granted' | 'prompt' | 'denied' | 'no_soportado'

export interface InfoPermisoRedLocal {
  estado: EstadoPermisoRedLocal
  descriptor?: string
  esContextoHttps: boolean
  esDestinoLocal: boolean
  mensaje: string
}

export const PASOS_HABILITAR_RED_LOCAL = [
  'En la barra de direcciones de Edge o Chrome, hacé clic en el ícono del candado o controles de sitio a la izquierda de chefsy.xyz.',
  'Buscá la opción "Acceso a la red local" (o "Apps en este dispositivo" / "Local network access").',
  'Cambiá la opción de "Preguntar" o "Bloquear" a "Permitir" (Allow).',
  'Hacé clic en "Reintentar conexión" para validar la comunicación con la impresora.',
]

export const MENSAJE_FLAGS_ALTERNATIVO =
  'Para terminales de comandera fijas o desarrollo local, podés desactivar esta restricción en edge://flags/#local-network-access-check (o chrome://flags/#local-network-access-check) configurándolo en Disabled.'

/**
 * Consulta el estado actual del permiso en el navegador mediante Permissions API.
 * Prueba en orden los descriptores soportados por las distintas versiones de Chromium:
 * 1. 'loopback-network' (estándar moderno para 127.0.0.1 / localhost)
 * 2. 'local-network-access' (alias previo de PNA)
 * 3. 'local-network' (red privada / LAN)
 */
export async function consultarPermisoRedLocal(
  urlDestino: string = 'http://127.0.0.1:9187'
): Promise<InfoPermisoRedLocal> {
  const esContextoHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const esDestinoLocal = esUrlLoopbackOLocal(urlDestino)

  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return {
      estado: 'no_soportado',
      esContextoHttps,
      esDestinoLocal,
      mensaje: 'El navegador no expone la API de permisos para red local.',
    }
  }

  const descriptores = ['loopback-network', 'local-network-access', 'local-network']

  for (const nombre of descriptores) {
    try {
      const status = await navigator.permissions.query({ name: nombre as any })
      if (status && (status.state === 'granted' || status.state === 'prompt' || status.state === 'denied')) {
        let mensaje = ''
        if (status.state === 'granted') {
          mensaje = 'Acceso a la red local permitido por el navegador.'
        } else if (status.state === 'prompt') {
          mensaje =
            'El navegador requiere permiso para conectarse a esta PC (estado "Preguntar"). En Edge/Chrome las llamadas automáticas se bloquean hasta que lo permitas.'
        } else {
          mensaje =
            'El navegador tiene BLOQUEADO el acceso a la red local para chefsy.xyz. Debes habilitarlo en los permisos del sitio.'
        }

        return {
          estado: status.state,
          descriptor: nombre,
          esContextoHttps,
          esDestinoLocal,
          mensaje,
        }
      }
    } catch {
      // Descriptor no reconocido por esta versión del navegador, probar el siguiente
      continue
    }
  }

  return {
    estado: 'no_soportado',
    esContextoHttps,
    esDestinoLocal,
    mensaje: 'No se detectó restricción explícita de red local en la API de permisos.',
  }
}

/**
 * Determina si una URL apunta a loopback (127.0.0.1, localhost) o a una red privada.
 */
export function esUrlLoopbackOLocal(url: string): boolean {
  if (!url) return true
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    return (
      host === '127.0.0.1' ||
      host === 'localhost' ||
      host === '::1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.16.')
    )
  } catch {
    return url.includes('127.0.0.1') || url.includes('localhost')
  }
}

/**
 * Determina si un error de conexión fue causado muy probablemente por el bloqueo
 * de Red Local / Private Network Access de Edge o Chrome.
 */
export function esErrorBloqueoRedLocal(
  error: any,
  urlDestino: string = 'http://127.0.0.1:9187',
  estadoPermiso?: EstadoPermisoRedLocal
): boolean {
  if (typeof window === 'undefined') return false

  const esHttps = window.location.protocol === 'https:'
  const esLocal = esUrlLoopbackOLocal(urlDestino)

  // Solo ocurre cuando Chefsy se sirve por HTTPS y quiere hablar con una IP local
  if (!esHttps || !esLocal) return false

  // Si ya consultamos el permiso y sabemos que está en prompt o denied, es certeza total
  if (estadoPermiso === 'prompt' || estadoPermiso === 'denied') {
    return true
  }

  // Si es un TypeError ("Failed to fetch") sin respuesta HTTP al intentar conectar a loopback
  if (
    error instanceof TypeError ||
    error?.name === 'TypeError' ||
    (typeof error?.message === 'string' &&
      (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed')))
  ) {
    return true
  }

  return false
}

/**
 * Dispara una llamada interactiva con gesto de usuario (transient activation).
 * Debe invocarse DIRECTAMENTE dentro del click de un botón para que el navegador
 * (Edge / Chrome) muestre el diálogo emergente de permiso de red local.
 */
export async function solicitarPermisoRedLocal(
  urlAgente: string = 'http://127.0.0.1:9187'
): Promise<{
  ok: boolean
  estado: EstadoPermisoRedLocal
  error?: string
}> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3500)

  try {
    await fetch(`${urlAgente}/health`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })

    const info = await consultarPermisoRedLocal(urlAgente)
    return {
      ok: info.estado === 'granted' || info.estado === 'no_soportado',
      estado: info.estado,
    }
  } catch (error: any) {
    const info = await consultarPermisoRedLocal(urlAgente)
    return {
      ok: info.estado === 'granted',
      estado: info.estado,
      error: error?.message,
    }
  } finally {
    clearTimeout(timeout)
  }
}
