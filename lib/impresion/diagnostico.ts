// ─────────────────────────────────────────────────────
// lib/impresion/diagnostico.ts
// Protocolo de diagnóstico del agente de impresión.
// Verifica el navegador, la URL, reintenta la conexión,
// valida el token y agrega los chequeos que hace el agente
// sobre la impresora de Windows y el spooler.
// ─────────────────────────────────────────────────────

import { gestorImpresora, normalizarUrlAgente, urlsAgenteCandidatas } from './impresoraTermica'
import { tipografiasIguales } from './tipografia'
import {
  consultarPermisoRedLocal,
  esErrorBloqueoRedLocal,
  PASOS_HABILITAR_RED_LOCAL,
  PASOS_HABILITAR_BRAVE,
  PASOS_HABILITAR_EDGE_CHROME,
} from './permisoRedLocal'

export type EstadoCheck = 'ok' | 'aviso' | 'error'

export interface CheckDiagnostico {
  id: string
  titulo: string
  estado: EstadoCheck
  detalle: string
  sugerencia?: string
}

export interface ContextoDiagnostico {
  urlConfigurada?: string
  urlUsada?: string
  versionAgente?: string
  impresora?: string
  latenciaMs?: number
  intentos?: number
}

export interface ResultadoDiagnostico {
  ok: boolean
  checks: CheckDiagnostico[]
  contexto: ContextoDiagnostico
  informe: string
}

interface RespuestaAgente {
  alcanzado: boolean
  status: number
  datos: any
  latenciaMs: number
  intentos: number
  error?: string
  tipoError?: 'red' | 'timeout' | 'http'
}

const VERSION_MINIMA_DIAGNOSTICO = '1.2.0'
const TIMEOUT_MS = 4000
const ESPERAS_REINTENTO_MS = [0, 650, 1600]

const dormir = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function versionMayorOIgual(actual: string | undefined, minima: string): boolean {
  if (!actual) return false
  const partesActual = actual.split('.').map((n) => parseInt(n, 10) || 0)
  const partesMinima = minima.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(partesActual.length, partesMinima.length); i++) {
    const a = partesActual[i] ?? 0
    const b = partesMinima[i] ?? 0
    if (a > b) return true
    if (a < b) return false
  }
  return true
}

/**
 * Pide un endpoint con reintentos y timeout. Solo reintenta fallas de red:
 * si el agente responde 401 o 500 no tiene sentido repetir.
 */
async function consultarAgente(
  url: string,
  ruta: string,
  token: string,
  intentos: number
): Promise<RespuestaAgente> {
  let ultimoError = 'No se pudo conectar con el agente local.'
  let ultimoTipo: 'red' | 'timeout' | 'http' = 'red'
  let esperaAcumulada = 0

  for (let intento = 1; intento <= Math.max(1, intentos); intento++) {
    if (intento > 1) {
      const espera = ESPERAS_REINTENTO_MS[Math.min(intento - 1, ESPERAS_REINTENTO_MS.length - 1)]
      esperaAcumulada += espera
      await dormir(espera)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const inicio = typeof performance !== 'undefined' ? performance.now() : Date.now()

    try {
      const respuesta = await fetch(`${url}${ruta}`, {
        headers: { 'X-Chefsy-Token': token },
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
      })

      const texto = await respuesta.text()
      let datos: any = null
      try {
        datos = texto ? JSON.parse(texto) : null
      } catch {
        datos = null
      }

      const fin = typeof performance !== 'undefined' ? performance.now() : Date.now()
      return {
        alcanzado: true,
        status: respuesta.status,
        datos,
        latenciaMs: Math.round(fin - inicio - esperaAcumulada),
        intentos: intento,
      }
    } catch (error: any) {
      const fin = typeof performance !== 'undefined' ? performance.now() : Date.now()
      if (error?.name === 'AbortError') {
        ultimoError = `El agente no respondió en ${TIMEOUT_MS / 1000} s.`
        ultimoTipo = 'timeout'
      } else {
        ultimoError =
          'El navegador no pudo abrir la conexión. El agente puede estar apagado, en otro puerto, o el permiso de red local puede estar bloqueado.'
        ultimoTipo = 'red'
      }
      // Guardamos la latencia del último intento fallido en el mensaje.
      if (fin - inicio > TIMEOUT_MS) {
        ultimoError = `El agente no respondió en ${TIMEOUT_MS / 1000} s.`
        ultimoTipo = 'timeout'
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  return {
    alcanzado: false,
    status: 0,
    datos: null,
    latenciaMs: 0,
    intentos,
    error: ultimoError,
    tipoError: ultimoTipo,
  }
}

function crearInforme(resultado: ResultadoDiagnostico): string {
  const lineas: string[] = []
  lineas.push('CHEFSY · Diagnóstico de impresión')
  lineas.push(`Fecha: ${new Date().toLocaleString('es-AR')}`)
  if (resultado.contexto.urlConfigurada) lineas.push(`URL configurada: ${resultado.contexto.urlConfigurada}`)
  if (resultado.contexto.urlUsada) lineas.push(`URL usada: ${resultado.contexto.urlUsada}`)
  if (resultado.contexto.versionAgente) lineas.push(`Versión del agente: ${resultado.contexto.versionAgente}`)
  if (resultado.contexto.impresora) lineas.push(`Impresora: ${resultado.contexto.impresora}`)
  if (resultado.contexto.latenciaMs !== undefined) {
    lineas.push(`Latencia: ${resultado.contexto.latenciaMs} ms (${resultado.contexto.intentos ?? 1} intento/s)`)
  }
  lineas.push('')
  for (const check of resultado.checks) {
    const marca = check.estado === 'ok' ? '[OK]' : check.estado === 'aviso' ? '[AVISO]' : '[ERROR]'
    lineas.push(`${marca} ${check.titulo}: ${check.detalle}`)
    if (check.sugerencia) lineas.push(`       Solución: ${check.sugerencia}`)
  }
  lineas.push('')
  lineas.push(`Resultado: ${resultado.ok ? 'sin problemas críticos' : 'hay problemas que impiden imprimir'}`)
  return lineas.join('\n')
}

/**
 * Ejecuta el protocolo completo. `onProgreso` permite que la UI muestre los
 * checks a medida que se van completando (estilo solucionador de Windows).
 */
export async function ejecutarDiagnostico(
  onProgreso?: (checks: CheckDiagnostico[], pasoActual: string) => void
): Promise<ResultadoDiagnostico> {
  const checks: CheckDiagnostico[] = []
  const contexto: ContextoDiagnostico = {}
  const config = gestorImpresora.obtenerConfiguracion()

  const publicar = (paso: string) => {
    onProgreso?.([...checks], paso)
  }

  const agregar = (check: CheckDiagnostico) => {
    checks.push(check)
    publicar(check.titulo)
  }

  // 1. Navegador
  const esContextoSeguro = typeof window !== 'undefined' ? window.isSecureContext : false
  const protocolo = typeof window !== 'undefined' ? window.location.protocol : ''
  const enLinea = typeof navigator !== 'undefined' ? navigator.onLine : true

  if (!enLinea) {
    agregar({
      id: 'navegador',
      titulo: 'Conexión del equipo',
      estado: 'error',
      detalle: 'Windows o el navegador informan que no hay conexión a internet.',
      sugerencia: 'Revisá el Wi-Fi o el cable de red. El agente local funciona sin internet, pero la página Chefsy necesita cargarse.',
    })
  } else if (!esContextoSeguro) {
    agregar({
      id: 'navegador',
      titulo: 'Contexto del navegador',
      estado: 'aviso',
      detalle: `La página se abrió con ${protocolo || 'un protocolo no seguro'}. El acceso a la red local requiere HTTPS o localhost.`,
      sugerencia: 'Abrí Chefsy desde https://chefsy.xyz (no desde una IP http).',
    })
  } else {
    agregar({
      id: 'navegador',
      titulo: 'Contexto del navegador',
      estado: 'ok',
      detalle: 'La página es segura y puede solicitar acceso a la red local.',
    })
  }

  // 2. URL configurada
  const urlConfigurada = normalizarUrlAgente(config.agenteImpresionUrl)
  contexto.urlConfigurada = urlConfigurada || '(vacía)'

  const candidatas = urlsAgenteCandidatas(config.agenteImpresionUrl)
  if (candidatas.length === 0) {
    agregar({
      id: 'url',
      titulo: 'URL del agente',
      estado: 'error',
      detalle: 'La URL del agente está vacía o no es válida.',
      sugerencia: 'Completá la URL en Configuración → Impresión → Agente local. Por defecto es http://127.0.0.1:9187.',
    })
    const resultado: ResultadoDiagnostico = {
      ok: false,
      checks,
      contexto,
      informe: '',
    }
    resultado.informe = crearInforme(resultado)
    return resultado
  }

  let hostValido = true
  try {
    const parsed = new URL(candidatas[0])
    hostValido = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
  } catch {
    hostValido = false
  }

  agregar({
    id: 'url',
    titulo: 'URL del agente',
    estado: hostValido ? 'ok' : 'aviso',
    detalle: hostValido
      ? `${urlConfigurada} apunta al loopback de esta PC.`
      : `${urlConfigurada} no apunta a 127.0.0.1. El agente está pensado para esta PC.`,
    sugerencia: hostValido ? undefined : 'Usá http://127.0.0.1:9187 salvo que el agente corra en otra PC de la red.',
  })

  // 3. Token configurado
  const token = config.agenteImpresionToken.trim()
  if (!token) {
    agregar({
      id: 'token',
      titulo: 'Token del agente',
      estado: 'error',
      detalle: 'No hay token guardado en este navegador.',
      sugerencia: 'Abrí el archivo LEEME.txt que generó el instalador y pegá el token en Configuración → Impresión → Agente local.',
    })
    const resultado: ResultadoDiagnostico = { ok: false, checks, contexto, informe: '' }
    resultado.informe = crearInforme(resultado)
    return resultado
  }

  // 3.5. Permiso de red local (Edge / Chrome / Brave)
  const infoPermiso = await consultarPermisoRedLocal(candidatas[0])
  const esBrave = infoPermiso.navegador === 'brave'

  if (infoPermiso.estado === 'granted') {
    agregar({
      id: 'permiso_red_local',
      titulo: 'Permiso de red local del navegador',
      estado: 'ok',
      detalle: `Concedido (${infoPermiso.descriptor || 'loopback-network'}). El navegador autoriza llamadas a 127.0.0.1.`,
    })
  } else if (infoPermiso.estado === 'prompt' || esBrave) {
    agregar({
      id: 'permiso_red_local',
      titulo: esBrave ? 'Escudos de Brave (Brave Shields)' : 'Permiso de red local del navegador',
      estado: 'aviso',
      detalle: esBrave
        ? 'Brave bloquea por defecto las llamadas a 127.0.0.1 desde sitios web para evitar fingerprinting.'
        : 'En espera ("Preguntar"). En Edge/Chrome las llamadas de red local se bloquean hasta que lo autorices en los permisos del sitio.',
      sugerencia: esBrave
        ? 'Hacé clic en el ícono del León de Brave (Shields) a la derecha de la barra de direcciones y desactivá los escudos para chefsy.xyz (Shields DOWN).'
        : 'Hacé clic en el candado o controles de sitio al lado de https://chefsy.xyz en la barra de direcciones → "Acceso a la red local" → seleccioná "Permitir".',
    })
  } else if (infoPermiso.estado === 'denied') {
    agregar({
      id: 'permiso_red_local',
      titulo: 'Permiso de red local del navegador',
      estado: 'error',
      detalle: 'El navegador tiene BLOQUEADO el acceso a la red local para chefsy.xyz.',
      sugerencia: esBrave
        ? 'En Brave: apagá Brave Shields en el ícono del León junto a la URL.'
        : 'Hacé clic en el candado o controles de sitio al lado de https://chefsy.xyz → "Acceso a la red local" → cambialo a "Permitir".',
    })
  }

  // 4. Conexión con reintentos y URLs alternativas
  publicar('Conectando con el agente local…')
  let respuesta: RespuestaAgente | null = null
  const erroresPorUrl: string[] = []

  for (let indice = 0; indice < candidatas.length; indice++) {
    const candidata = candidatas[indice]
    const intentos = indice === 0 ? 3 : 1
    const intento = await consultarAgente(candidata, '/health', token, intentos)

    if (intento.alcanzado) {
      respuesta = intento
      contexto.urlUsada = candidata
      contexto.latenciaMs = intento.latenciaMs
      contexto.intentos = intento.intentos
      break
    }

    erroresPorUrl.push(`${candidata}: ${intento.error}`)
  }

  if (!respuesta) {
    const bloqueoRed =
      infoPermiso.estado === 'prompt' ||
      infoPermiso.estado === 'denied' ||
      esErrorBloqueoRedLocal(null, candidatas[0], infoPermiso.estado)
    const esBrave = infoPermiso.navegador === 'brave'

    agregar({
      id: 'conexion',
      titulo: 'Conexión con el agente local',
      estado: 'error',
      detalle: bloqueoRed
        ? esBrave
          ? 'Brave bloqueó la conexión a 127.0.0.1. Causa: escudos de privacidad de Brave (Brave Shields) activos para este sitio.'
          : `El navegador bloqueó la conexión a 127.0.0.1. Causa: restricción de Red Local de Edge/Chrome (permiso: ${infoPermiso.estado}).`
        : `No hubo respuesta después de reintentar. ${erroresPorUrl.join(' · ')}`,
      sugerencia: bloqueoRed
        ? esBrave
          ? PASOS_HABILITAR_BRAVE.join(' ')
          : PASOS_HABILITAR_EDGE_CHROME.join(' ')
        : 'Comprobá que el agente esté corriendo (Administrador de tareas → ChefsyPrintAgent), que el puerto coincida y que Chrome/Edge/Brave tenga permitido el acceso local para chefsy.xyz.',
    })
    const resultado: ResultadoDiagnostico = { ok: false, checks, contexto, informe: '' }
    resultado.informe = crearInforme(resultado)
    return resultado
  }

  // 5. Autenticación
  if (respuesta.status === 401) {
    agregar({
      id: 'conexion',
      titulo: 'Conexión con el agente local',
      estado: 'ok',
      detalle: `El agente respondió en ${responseLatencia(respuesta)} (${contexto.urlUsada}).`,
    })
    agregar({
      id: 'token',
      titulo: 'Token del agente',
      estado: 'error',
      detalle: 'El agente rechazó el token (HTTP 401).',
      sugerencia: 'Copiá de nuevo el token desde LEEME.txt. Si reinstalaste el agente, el token puede haber cambiado.',
    })
    const resultado: ResultadoDiagnostico = { ok: false, checks, contexto, informe: '' }
    resultado.informe = crearInforme(resultado)
    return resultado
  }

  if (!respuesta.datos || respuesta.status >= 500) {
    agregar({
      id: 'conexion',
      titulo: 'Conexión con el agente local',
      estado: 'error',
      detalle: `El agente respondió HTTP ${respuesta.status}: ${respuesta.datos?.error || 'sin detalle'}.`,
      sugerencia: 'Revisá agent.log en %LOCALAPPDATA%\\ChefsyPrintAgent y reinstalá el agente si el error persiste.',
    })
    const resultado: ResultadoDiagnostico = { ok: false, checks, contexto, informe: '' }
    resultado.informe = crearInforme(resultado)
    return resultado
  }

  const salud = respuesta.datos
  contexto.versionAgente = typeof salud.version === 'string' ? salud.version : undefined
  contexto.impresora = typeof salud.printer === 'string' ? salud.printer : undefined

  agregar({
    id: 'conexion',
    titulo: 'Conexión con el agente local',
    estado: 'ok',
    detalle: `Respondió en ${responseLatencia(respuesta)} (${contexto.urlUsada}, intento ${respuesta.intentos}).`,
  })

  agregar({
    id: 'token',
    titulo: 'Token del agente',
    estado: 'ok',
    detalle: 'El token fue aceptado por el agente.',
  })

  // 6. Salud del agente
  if (!contexto.versionAgente) {
    agregar({
      id: 'version',
      titulo: 'Versión del agente',
      estado: 'aviso',
      detalle: 'El agente no informa su versión.',
      sugerencia: 'Reinstalá el agente para actualizarlo a la versión con diagnóstico.',
    })
  } else if (!versionMayorOIgual(contexto.versionAgente, VERSION_MINIMA_DIAGNOSTICO)) {
    agregar({
      id: 'version',
      titulo: 'Versión del agente',
      estado: 'aviso',
      detalle: `El agente es v${contexto.versionAgente}; el diagnóstico completo requiere v${VERSION_MINIMA_DIAGNOSTICO}.`,
      sugerencia: 'Volvé a ejecutar Instalar-AgenteImpresion.ps1 para actualizarlo (conserva token y puerto).',
    })
  } else {
    agregar({
      id: 'version',
      titulo: 'Versión del agente',
      estado: 'ok',
      detalle: `Agente v${contexto.versionAgente} actualizado.`,
    })
  }

  if (salud.ok !== true) {
    agregar({
      id: 'salud',
      titulo: 'Estado del agente',
      estado: 'error',
      detalle: salud.error || 'El agente está en línea pero no tiene una impresora lista.',
      sugerencia: 'Configurá una impresora predeterminada en Windows o reinstalá el agente indicando el nombre exacto con -Impresora "NOMBRE".',
    })
  }

  // 7. Diagnóstico propio del agente (impresora, spooler, cola, disco, tipografía)
  const diagnosticoAgente = await gestorImpresora.obtenerDiagnosticoAgente()

  if (!diagnosticoAgente.ok) {
    const esViejo = diagnosticoAgente.tipoError === 'http' && /404|no encontrada/i.test(diagnosticoAgente.error || '')
    agregar({
      id: 'agente.diagnostico',
      titulo: 'Diagnóstico interno del agente',
      estado: 'aviso',
      detalle: esViejo
        ? 'El agente no tiene el endpoint /diagnostico (versión anterior).'
        : `No se pudo obtener el diagnóstico interno: ${diagnosticoAgente.error}`,
      sugerencia: 'Reinstalá el agente con la versión actual para ver el estado de la impresora y la cola.',
    })
  } else {
    const checksAgente: any[] = Array.isArray(diagnosticoAgente.datos?.checks)
      ? diagnosticoAgente.datos.checks
      : []

    for (const check of checksAgente) {
      const estado: EstadoCheck =
        check?.estado === 'ok' || check?.estado === 'aviso' || check?.estado === 'error'
          ? check.estado
          : 'aviso'

      agregar({
        id: `agente.${check?.id ?? checksAgente.indexOf(check)}`,
        titulo: check?.titulo ? `Agente · ${check.titulo}` : 'Agente',
        estado,
        detalle: typeof check?.detalle === 'string' ? check.detalle : '',
        sugerencia: typeof check?.sugerencia === 'string' ? check.sugerencia : undefined,
      })

      if (check?.estado === 'error' && check?.id === 'impresora' && check?.detalle) {
        contexto.impresora = undefined
      }
    }
  }

  // 8. Tipografía sincronizada
  const configAgente = await gestorImpresora.solicitarAlAgente('/config', {
    timeoutMs: 6000,
    urlBase: contexto.urlUsada,
  })

  if (!configAgente.ok) {
    agregar({
      id: 'tipografia',
      titulo: 'Tipografía sincronizada',
      estado: 'aviso',
      detalle: `No se pudo leer la configuración del agente: ${configAgente.error}`,
      sugerencia: 'Entrá a Configuración → Impresión → Tipografía y tocá “Sincronizar con el agente”.',
    })
  } else if (!configAgente.datos?.configurada) {
    agregar({
      id: 'tipografia',
      titulo: 'Tipografía sincronizada',
      estado: 'aviso',
      detalle: 'El agente no tiene una tipografía guardada.',
      sugerencia: 'Configurá fuente, tamaño y espaciado y tocá “Sincronizar con el agente”.',
    })
  } else {
    const delAgente = configAgente.datos?.tipografia
    const coincide = delAgente ? tipografiasIguales(delAgente, config.tipografia) : false
    agregar({
      id: 'tipografia',
      titulo: 'Tipografía sincronizada',
      estado: coincide ? 'ok' : 'aviso',
      detalle: coincide
        ? 'La tipografía de esta PC coincide con la guardada en el agente.'
        : 'La tipografía de esta PC difiere de la guardada en el agente.',
      sugerencia: coincide ? undefined : 'Tocá “Sincronizar con el agente” para igualarlas.',
    })
  }

  const resultado: ResultadoDiagnostico = {
    ok: !checks.some((check) => check.estado === 'error'),
    checks,
    contexto,
    informe: '',
  }
  resultado.informe = crearInforme(resultado)
  publicar('Diagnóstico completo')
  return resultado
}

function responseLatencia(respuesta: RespuestaAgente): string {
  return `${respuesta.latenciaMs} ms`
}
