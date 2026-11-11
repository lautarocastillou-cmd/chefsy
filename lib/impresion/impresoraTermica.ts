// ─────────────────────────────────────────────────────
// lib/impresion/impresoraTermica.ts
// Gestor de comunicación directa con Impresoras Térmicas
// mediante Web Serial API, WebHID y Web Bluetooth con
// fallback automático a Iframe para navegadores sin hardware.
// ─────────────────────────────────────────────────────

import { Pedido } from '@/tipos'
import {
  generarEscPosTicketCliente,
  generarEscPosComandaCocina,
  generarEscPosTicketPrueba,
  OpcionesImpresion,
} from './escpos'
import {
  normalizarTipografia,
  TIPOGRAFIA_POR_DEFECTO,
  TipografiaImpresion,
} from './tipografia'
import {
  consultarPermisoRedLocal,
  esErrorBloqueoRedLocal,
  EstadoPermisoRedLocal,
} from './permisoRedLocal'
import { formatearPrecio } from '@/lib/utils'

export type TipoDriverImpresora = 'usb' | 'serial' | 'hid' | 'bluetooth' | 'ninguna'

export interface ConfiguracionImpresora {
  anchoMm: 80 | 58
  cortarPapel: boolean
  sonarAlarmaComanda: boolean
  impresionSilenciosaActiva: boolean
  autoImprimirPedidosNuevos: boolean
  usarAgenteImpresion: boolean
  agenteImpresionUrl: string
  agenteImpresionToken: string
  baudRate: number
  tipografia: TipografiaImpresion
}

const CONFIG_STORAGE_KEY = 'chefsy_config_impresora_v1'
export const EVENTO_CONFIG_IMPRESORA = 'chefsy:config-impresora-actualizada'

const CONFIG_POR_DEFECTO: ConfiguracionImpresora = {
  anchoMm: 80,
  cortarPapel: true,
  sonarAlarmaComanda: true,
  impresionSilenciosaActiva: true,
  autoImprimirPedidosNuevos: false,
  usarAgenteImpresion: false,
  agenteImpresionUrl: 'http://127.0.0.1:9187',
  agenteImpresionToken: '',
  baudRate: 9600, // Estándar para Xprinter, POS-80, Unnion TP85, Epson, etc.
  tipografia: TIPOGRAFIA_POR_DEFECTO,
}

/** Quita barras finales y rutas de endpoints para quedarse con la base. */
export function normalizarUrlAgente(url: string): string {
  return (url || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(health|config|diagnostico|print)$/i, '')
}

/**
 * Variantes de la URL del agente para el diagnóstico: si se configuró
 * `localhost`, también probamos `127.0.0.1` (y viceversa), porque el permiso
 * de red local del navegador se concede por origen distinto.
 */
export function urlsAgenteCandidatas(url: string): string[] {
  const base = normalizarUrlAgente(url)
  if (!base) return []

  const candidatas = [base]
  try {
    const parsed = new URL(base)
    const puerto = parsed.port ? `:${parsed.port}` : ''
    if (parsed.hostname === '127.0.0.1') {
      candidatas.push(`${parsed.protocol}//localhost${puerto}`)
    } else if (parsed.hostname === 'localhost') {
      candidatas.push(`${parsed.protocol}//127.0.0.1${puerto}`)
    }
  } catch {
    // URL inválida: el diagnóstico la reporta como error.
  }

  return Array.from(new Set(candidatas))
}

class GestorImpresoraTermica {
  private dispositivoUsb: any = null
  private usbEndpointOut: number = 1
  private usbInterfaceNumber: number = 0
  private puertoSerial: any = null
  private dispositivoHid: any = null
  private dispositivoBluetooth: any = null
  private caracteristicaBluetooth: any = null
  private config: ConfiguracionImpresora = CONFIG_POR_DEFECTO
  private nombreDispositivo: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.cargarConfiguracion()
      // Intentar reconectar con puertos previamente autorizados en segundo plano
      this.autoReconectar()

      // Mantener sincronizada la configuración entre pestañas del mismo navegador.
      window.addEventListener('storage', (event) => {
        if (event.key !== CONFIG_STORAGE_KEY) return
        this.cargarConfiguracion()
        window.dispatchEvent(
          new CustomEvent(EVENTO_CONFIG_IMPRESORA, { detail: { ...this.config } })
        )
      })
    }
  }

  public cargarConfiguracion(): ConfiguracionImpresora {
    if (typeof window === 'undefined') return CONFIG_POR_DEFECTO
    try {
      const guardada = localStorage.getItem(CONFIG_STORAGE_KEY)
      this.config = guardada
        ? { ...CONFIG_POR_DEFECTO, ...JSON.parse(guardada) }
        : { ...CONFIG_POR_DEFECTO }
    } catch {
      this.config = { ...CONFIG_POR_DEFECTO }
    }

    // Las configuraciones viejas no tienen tipografía: se completa y se
    // recortan valores fuera de rango para que el generador nunca reciba basura.
    this.config.tipografia = normalizarTipografia(this.config.tipografia)
    return this.config
  }

  public guardarConfiguracion(nuevaConfig: Partial<ConfiguracionImpresora>): void {
    this.config = { ...this.config, ...nuevaConfig }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config))
        window.dispatchEvent(
          new CustomEvent(EVENTO_CONFIG_IMPRESORA, { detail: { ...this.config } })
        )
      } catch (err) {
        console.error('Error guardando configuración de impresora:', err)
      }
    }
  }

  public obtenerConfiguracion(): ConfiguracionImpresora {
    return { ...this.config }
  }

  public estaConectada(): boolean {
    if (this.dispositivoUsb && this.dispositivoUsb.opened) return true
    if (this.puertoSerial && this.puertoSerial.writable) return true
    if (this.dispositivoHid && this.dispositivoHid.opened) return true
    if (this.dispositivoBluetooth && this.dispositivoBluetooth.gatt?.connected) return true
    return false
  }

  public obtenerInfo(): {
    conectada: boolean
    nombre: string
    tipo: TipoDriverImpresora
    soporteWebUsb: boolean
    soporteWebSerial: boolean
    soporteWebHid: boolean
    soporteWebBluetooth: boolean
  } {
    const soporteWebUsb = typeof navigator !== 'undefined' && 'usb' in navigator
    const soporteWebSerial = typeof navigator !== 'undefined' && 'serial' in navigator
    const soporteWebHid = typeof navigator !== 'undefined' && 'hid' in navigator
    const soporteWebBluetooth = typeof navigator !== 'undefined' && 'bluetooth' in navigator

    let tipo: TipoDriverImpresora = 'ninguna'
    if (this.dispositivoUsb) tipo = 'usb'
    else if (this.puertoSerial) tipo = 'serial'
    else if (this.dispositivoHid) tipo = 'hid'
    else if (this.dispositivoBluetooth) tipo = 'bluetooth'

    return {
      conectada: this.estaConectada(),
      nombre: this.nombreDispositivo || (this.estaConectada() ? 'Impresora Térmica POS' : 'Sin conexión directa'),
      tipo,
      soporteWebUsb,
      soporteWebSerial,
      soporteWebHid,
      soporteWebBluetooth,
    }
  }

  /**
   * Indica si el agente local está activado y tiene URL + token.
   */
  public tieneAgenteConfigurado(): boolean {
    return Boolean(
      this.config.usarAgenteImpresion &&
      this.config.agenteImpresionUrl.trim() &&
      this.config.agenteImpresionToken.trim()
    )
  }

  /**
   * Resume la salida que va a usar la app en este dispositivo.
   */
  public obtenerModoImpresion(): 'directa' | 'agente' | 'navegador' {
    if (this.estaConectada() && this.config.impresionSilenciosaActiva) return 'directa'
    // Si el agente está activado, no abrimos el diálogo aunque falte configurar.
    if (this.config.usarAgenteImpresion) return 'agente'
    return 'navegador'
  }

  private obtenerUrlBaseAgente(): string {
    return normalizarUrlAgente(this.config.agenteImpresionUrl)
  }

  /**
   * Consulta el estado del agente local (health + token).
   */
  public async probarAgente(): Promise<{
    ok: boolean
    printer?: string
    error?: string
    bloqueadoPorRedLocal?: boolean
    estadoPermiso?: EstadoPermisoRedLocal
    navegador?: string
  }> {
    const base = this.obtenerUrlBaseAgente()
    const token = this.config.agenteImpresionToken.trim()

    if (!base) return { ok: false, error: 'Configurá la URL del agente local.' }
    if (!token) return { ok: false, error: 'Falta el token del agente local.' }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
      const respuesta = await fetch(`${base}/health`, {
        headers: { 'X-Chefsy-Token': token },
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
      })

      const texto = await respuesta.text()
      let data: { ok?: boolean; printer?: string; error?: string } | null = null
      try {
        data = texto ? JSON.parse(texto) : null
      } catch {
        data = null
      }

      if (respuesta.status === 401) {
        return { ok: false, error: 'El token del agente no coincide.' }
      }
      if (!respuesta.ok) {
        return { ok: false, error: data?.error || `El agente respondió con error ${respuesta.status}.` }
      }
      if (!data || data.ok !== true) {
        return { ok: false, error: data?.error || 'El agente no está listo para imprimir.' }
      }

      return { ok: true, printer: data.printer }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return { ok: false, error: 'El agente local no respondió a tiempo.' }
      }

      const infoPermiso = await consultarPermisoRedLocal(base)
      if (esErrorBloqueoRedLocal(error, base, infoPermiso.estado)) {
        const esBrave = infoPermiso.navegador === 'brave'
        return {
          ok: false,
          error: esBrave
            ? 'Brave bloqueó la conexión a 127.0.0.1 por sus escudos de privacidad. Hacé clic en el León de Brave junto a la URL y desactivá Shields para chefsy.xyz.'
            : 'El navegador bloqueó la conexión a la red local. Hacé clic en el candado junto a la URL y cambiá "Acceso a la red local" a "Permitir".',
          bloqueadoPorRedLocal: true,
          estadoPermiso: infoPermiso.estado,
          navegador: infoPermiso.navegador,
        }
      }

      return {
        ok: false,
        error: 'No se pudo conectar con el agente local. Verificá que esté instalado y corriendo en esta PC.',
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Envía bytes ESC/POS al agente local para que los mande al spooler.
   * No abre ningún diálogo del navegador.
   */
  public async enviarAlAgente(bytes: Uint8Array): Promise<{
    exito: boolean
    error?: string
    bloqueadoPorRedLocal?: boolean
  }> {
    const base = this.obtenerUrlBaseAgente()
    const token = this.config.agenteImpresionToken.trim()

    if (!base) return { exito: false, error: 'Configurá la URL del agente local.' }
    if (!token) return { exito: false, error: 'Falta el token del agente local.' }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 7000)

    try {
      const respuesta = await fetch(`${base}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Chefsy-Token': token,
        },
        body: new Blob([new Uint8Array(bytes)]),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
      })

      const texto = await respuesta.text()
      let data: { ok?: boolean; error?: string } | null = null
      try {
        data = texto ? JSON.parse(texto) : null
      } catch {
        data = null
      }

      if (respuesta.status === 401) {
        return { exito: false, error: 'El token del agente no coincide.' }
      }
      if (!respuesta.ok) {
        return { exito: false, error: data?.error || `El agente respondió con error ${respuesta.status}.` }
      }
      if (!data || data.ok !== true) {
        return { exito: false, error: data?.error || 'El agente no confirmó la impresión.' }
      }

      return { exito: true }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return { exito: false, error: 'El agente local no respondió a tiempo.' }
      }

      const infoPermiso = await consultarPermisoRedLocal(base)
      if (esErrorBloqueoRedLocal(error, base, infoPermiso.estado)) {
        return {
          exito: false,
          error:
            'Impresión bloqueada por el navegador: se requiere el permiso de "Acceso a la red local" en chefsy.xyz.',
          bloqueadoPorRedLocal: true,
        }
      }

      return {
        exito: false,
        error: 'No se pudo conectar con el agente local. Verificá que esté instalado y corriendo en esta PC.',
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Llamada HTTP genérica al agente con timeout. Clasifica el error para que
   * el solucionador de problemas pueda explicar qué pasó y qué revisar.
   */
  public async solicitarAlAgente(
    ruta: string,
    opciones: {
      metodo?: 'GET' | 'POST'
      cuerpo?: BodyInit
      contentType?: string
      timeoutMs?: number
      urlBase?: string
    } = {}
  ): Promise<{
    ok: boolean
    status: number
    datos: any
    error?: string
    tipoError?: 'config' | 'red' | 'timeout' | 'http' | 'permiso_red_local'
    bloqueadoPorRedLocal?: boolean
    estadoPermiso?: EstadoPermisoRedLocal
  }> {
    const base = normalizarUrlAgente(opciones.urlBase || this.config.agenteImpresionUrl)
    const token = this.config.agenteImpresionToken.trim()

    if (!base) {
      return { ok: false, status: 0, datos: null, error: 'Configurá la URL del agente local.', tipoError: 'config' }
    }
    if (!token) {
      return { ok: false, status: 0, datos: null, error: 'Falta el token del agente local.', tipoError: 'config' }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), opciones.timeoutMs ?? 5000)

    try {
      const respuesta = await fetch(`${base}${ruta}`, {
        method: opciones.metodo ?? 'GET',
        headers: {
          'X-Chefsy-Token': token,
          ...(opciones.contentType ? { 'Content-Type': opciones.contentType } : {}),
        },
        body: opciones.cuerpo,
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

      if (!respuesta.ok) {
        return {
          ok: false,
          status: respuesta.status,
          datos,
          error: datos?.error || `El agente respondió con error ${respuesta.status}.`,
          tipoError: 'http',
        }
      }

      return { ok: true, status: respuesta.status, datos }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return { ok: false, status: 0, datos: null, error: 'El agente no respondió a tiempo.', tipoError: 'timeout' }
      }

      const infoPermiso = await consultarPermisoRedLocal(base)
      if (esErrorBloqueoRedLocal(error, base, infoPermiso.estado)) {
        return {
          ok: false,
          status: 0,
          datos: null,
          error:
            'El navegador bloqueó la conexión a la red local (permiso en espera o denegado). Habilitá "Acceso a la red local" en el candado del navegador.',
          tipoError: 'permiso_red_local',
          bloqueadoPorRedLocal: true,
          estadoPermiso: infoPermiso.estado,
        }
      }

      return { ok: false, status: 0, datos: null, error: 'No se pudo conectar con el agente local.', tipoError: 'red' }
    } finally {
      clearTimeout(timeout)
    }
  }

  /** Guarda la tipografía local en el agente (queda persistida en su carpeta). */
  public async sincronizarTipografia(): Promise<{
    ok: boolean
    error?: string
    actualizada?: string
    version?: string
    tipoError?: string
  }> {
    const resultado = await this.solicitarAlAgente('/config', {
      metodo: 'POST',
      contentType: 'application/json',
      cuerpo: JSON.stringify({ tipografia: this.config.tipografia }),
      timeoutMs: 8000,
    })

    if (!resultado.ok) {
      return { ok: false, error: resultado.error, tipoError: resultado.tipoError }
    }

    return {
      ok: true,
      actualizada: resultado.datos?.actualizada,
      version: resultado.datos?.version,
    }
  }

  /** Recupera la tipografía guardada en el agente y la aplica en este navegador. */
  public async traerTipografiaDelAgente(): Promise<{
    ok: boolean
    error?: string
    tipografia?: TipografiaImpresion
    actualizada?: string
  }> {
    const resultado = await this.solicitarAlAgente('/config', { timeoutMs: 6000 })

    if (!resultado.ok) {
      return { ok: false, error: resultado.error }
    }

    if (!resultado.datos?.configurada || !resultado.datos?.tipografia) {
      return { ok: false, error: 'El agente todavía no tiene una tipografía guardada.' }
    }

    const tipografia = normalizarTipografia(resultado.datos.tipografia)
    this.guardarConfiguracion({ tipografia })
    return { ok: true, tipografia, actualizada: resultado.datos.actualizada }
  }

  /** Diagnóstico completo que arma el propio agente (impresora, cola, spooler). */
  public async obtenerDiagnosticoAgente(): Promise<{
    ok: boolean
    error?: string
    datos?: any
    tipoError?: string
  }> {
    const resultado = await this.solicitarAlAgente('/diagnostico', { timeoutMs: 7000 })
    return {
      ok: resultado.ok,
      error: resultado.error,
      datos: resultado.datos,
      tipoError: resultado.tipoError,
    }
  }

  /** Estado completo del agente (`/health`), incluida su versión. */
  public async obtenerEstadoAgente(): Promise<{
    ok: boolean
    datos?: any
    error?: string
    tipoError?: string
  }> {
    const resultado = await this.solicitarAlAgente('/health', { timeoutMs: 5000 })
    return {
      ok: resultado.ok,
      datos: resultado.datos,
      error: resultado.error,
      tipoError: resultado.tipoError,
    }
  }

  /**
   * Pide al agente que se actualice. El agente ignora cualquier URL que
   * mande el navegador: descarga desde su `origen_actualizacion` fijo,
   * verifica SHA-256 y se reemplaza a sí mismo.
   */
  public async actualizarAgente(version: string): Promise<{
    ok: boolean
    status: number
    error?: string
    datos?: any
    tipoError?: string
  }> {
    const resultado = await this.solicitarAlAgente('/update', {
      metodo: 'POST',
      contentType: 'application/json',
      cuerpo: JSON.stringify({ version }),
      timeoutMs: 35000,
    })

    return {
      ok: resultado.ok,
      status: resultado.status,
      error: resultado.error,
      datos: resultado.datos,
      tipoError: resultado.tipoError,
    }
  }

  /**
   * Intenta reconectar silenciosamente a un puerto Serial previamente aprobado
   */
  private async autoReconectar(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        const ports = await (navigator as any).serial.getPorts()
        if (ports.length > 0) {
          const port = ports[0]
          try {
            await port.open({ baudRate: this.config.baudRate })
            this.puertoSerial = port
            this.nombreDispositivo = 'Impresora USB (Serial)'
          } catch (e) {
            // El puerto ya puede estar abierto o desconectado
          }
        }
      }
    } catch {
      // Ignorar en navegadores que no lo soportan
    }
  }

  /**
   * Abre el selector nativo del navegador para que el usuario vincule su impresora
   */
  public async conectar(tipo: 'usb' | 'serial' | 'hid' | 'bluetooth' = 'usb'): Promise<{
    exito: boolean
    mensaje?: string
  }> {
    try {
      if (tipo === 'usb') {
        if (!('usb' in navigator)) {
          return { exito: false, mensaje: 'Tu navegador no soporta WebUSB (usá Google Chrome o Microsoft Edge).' }
        }
        // Solicitar dispositivo USB (filtro vacío para mostrar todos los dispositivos USB conectados)
        const device = await (navigator as any).usb.requestDevice({ filters: [] })
        if (!device) return { exito: false, mensaje: 'No se seleccionó ningún dispositivo USB.' }

        await device.open()
        if (!device.configuration) {
          await device.selectConfiguration(1)
        }

        // Buscar interfaz con endpoint OUT para envío bulk de ESC/POS
        let interfaceNum = 0
        let endpointOutNum = 1
        let interfazEncontrada = false

        if (device.configuration?.interfaces) {
          for (const iface of device.configuration.interfaces) {
            for (const alt of iface.alternates) {
              for (const ep of alt.endpoints) {
                if (ep.direction === 'out') {
                  interfaceNum = iface.interfaceNumber
                  endpointOutNum = ep.endpointNumber
                  interfazEncontrada = true
                  break
                }
              }
              if (interfazEncontrada) break
            }
            if (interfazEncontrada) break
          }
        }

        try {
          await device.claimInterface(interfaceNum)
        } catch (claimErr: any) {
          console.warn('[Impresora USB] Advertencia al reclamar interfaz:', claimErr)
          // Si Windows bloquea el reclamo de interfaz por tener driver activo
          if (claimErr?.name === 'SecurityError' || claimErr?.message?.includes('claimInterface')) {
            await device.close()
            return {
              exito: false,
              mensaje: 'Windows tiene bloqueado el acceso USB exclusivo. Te recomendamos imprimir directamente con el controlador de Windows.',
            }
          }
        }

        this.dispositivoUsb = device
        this.usbInterfaceNumber = interfaceNum
        this.usbEndpointOut = endpointOutNum
        this.nombreDispositivo = device.productName || 'Impresora Térmica USB'
        this.guardarConfiguracion({ impresionSilenciosaActiva: true })
        return { exito: true, mensaje: `¡${this.nombreDispositivo} conectada por USB directo!` }
      }

      if (tipo === 'serial') {
        if (!('serial' in navigator)) {
          return { exito: false, mensaje: 'Tu navegador no soporta Web Serial (usá Chrome o Edge).' }
        }
        const port = await (navigator as any).serial.requestPort()
        await port.open({ baudRate: this.config.baudRate })
        this.puertoSerial = port
        this.nombreDispositivo = 'Impresora Térmica USB (Serial)'
        this.guardarConfiguracion({ impresionSilenciosaActiva: true })
        return { exito: true, mensaje: '¡Impresora Serial vinculada con éxito!' }
      }

      if (tipo === 'hid') {
        if (!('hid' in navigator)) {
          return { exito: false, mensaje: 'Tu navegador no soporta WebHID (usá Chrome o Edge).' }
        }
        const devices = await (navigator as any).hid.requestDevice({ filters: [] })
        if (devices.length === 0) return { exito: false, mensaje: 'No se seleccionó ningún dispositivo.' }
        const device = devices[0]
        await device.open()
        this.dispositivoHid = device
        this.nombreDispositivo = device.productName || 'Impresora Térmica HID'
        this.guardarConfiguracion({ impresionSilenciosaActiva: true })
        return { exito: true, mensaje: '¡Impresora HID conectada!' }
      }

      if (tipo === 'bluetooth') {
        if (!('bluetooth' in navigator)) {
          return { exito: false, mensaje: 'Tu navegador no soporta Web Bluetooth.' }
        }
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455'],
        })
        const server = await device.gatt?.connect()
        const service = await server?.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
        const char = await service?.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')
        this.dispositivoBluetooth = device
        this.caracteristicaBluetooth = char
        this.nombreDispositivo = device.name || 'Impresora Bluetooth'
        this.guardarConfiguracion({ impresionSilenciosaActiva: true })
        return { exito: true, mensaje: '¡Impresora Bluetooth conectada!' }
      }

      return { exito: false, mensaje: 'Tipo de conexión no soportado.' }
    } catch (err: any) {
      console.error('Error conectando impresora:', err)
      return { exito: false, mensaje: err.message || 'Error al conectar la impresora.' }
    }
  }

  public async desconectar(): Promise<void> {
    try {
      if (this.dispositivoUsb) {
        try {
          await this.dispositivoUsb.close()
        } catch {}
        this.dispositivoUsb = null
      }
      if (this.puertoSerial) {
        await this.puertoSerial.close()
        this.puertoSerial = null
      }
      if (this.dispositivoHid) {
        await this.dispositivoHid.close()
        this.dispositivoHid = null
      }
      if (this.dispositivoBluetooth && this.dispositivoBluetooth.gatt) {
        this.dispositivoBluetooth.gatt.disconnect()
        this.dispositivoBluetooth = null
        this.caracteristicaBluetooth = null
      }
      this.nombreDispositivo = null
    } catch (e) {
      console.error('Error al desconectar:', e)
    }
  }

  /**
   * Envía bytes crudos ESC/POS a la impresora vinculada
   */
  public async enviarRaw(bytes: Uint8Array): Promise<boolean> {
    // 1. Intentar WebUSB Directo
    if (this.dispositivoUsb && this.dispositivoUsb.opened) {
      try {
        await this.dispositivoUsb.transferOut(this.usbEndpointOut || 1, bytes)
        return true
      } catch (err) {
        console.error('Error escribiendo en WebUSB:', err)
      }
    }

    // 2. Intentar Serial
    if (this.puertoSerial && this.puertoSerial.writable) {
      try {
        const writer = this.puertoSerial.writable.getWriter()
        await writer.write(bytes)
        writer.releaseLock()
        return true
      } catch (err) {
        console.error('Error escribiendo en puerto Serial:', err)
      }
    }

    // 3. Intentar HID
    if (this.dispositivoHid && this.dispositivoHid.opened) {
      try {
        const chunkSize = 64
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize)
          await this.dispositivoHid.sendReport(0, chunk)
        }
        return true
      } catch (err) {
        console.error('Error escribiendo en dispositivo HID:', err)
      }
    }

    // 4. Intentar Bluetooth
    if (this.caracteristicaBluetooth) {
      try {
        const chunkSize = 128
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize)
          await this.caracteristicaBluetooth.writeValue(chunk)
        }
        return true
      } catch (err) {
        console.error('Error escribiendo en Bluetooth:', err)
      }
    }

    return false
  }

  /**
   * Fallback visual con Iframe para navegadores sin hardware directo
   */
  public imprimirPorIframe(html: string): void {
    if (typeof window === 'undefined') return

    try {
      // Limpiar iframes huérfanos anteriores
      document.querySelectorAll('iframe.chefsy-print-iframe').forEach(el => el.remove())

      const iframe = document.createElement('iframe')
      iframe.className = 'chefsy-print-iframe'
      // No usar width: 0 o display: none para evitar que Chrome bloquee el print
      iframe.style.cssText = 'position:fixed;width:400px;height:400px;bottom:-9999px;left:-9999px;border:0;opacity:0.01;pointer-events:none;'

      let impreso = false
      const ejecutarPrint = () => {
        if (impreso) return
        impreso = true
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } catch (err) {
          console.error('[Impresión] Error al invocar print() en iframe:', err)
        }
      }

      // Con srcdoc, onload se dispara casi de inmediato tras el parseo (~10ms)
      iframe.onload = () => {
        setTimeout(ejecutarPrint, 30)
      }

      iframe.srcdoc = html
      document.body.appendChild(iframe)

      // Respaldo de seguridad rápido por si el evento onload no dispara
      setTimeout(ejecutarPrint, 120)

      // Remover iframe después de que termine
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 30000)
    } catch (e) {
      console.error('[Impresión] Error en imprimirPorIframe:', e)
    }
  }

  /**
   * Imprime un pedido directamente en la térmica o mediante fallback
   */
  public async imprimirPedido(
    pedido: Pedido,
    tipo: 'ticket' | 'cocina'
  ): Promise<{ metodo: 'directo' | 'agente' | 'iframe'; exito: boolean; error?: string }> {
    const opciones: OpcionesImpresion = {
      anchoMm: this.config.anchoMm,
      cortarPapel: this.config.cortarPapel,
      sonarAlarma: tipo === 'cocina' && this.config.sonarAlarmaComanda,
      tipografia: tipo === 'ticket' ? this.config.tipografia.ticket : this.config.tipografia.comanda,
    }

    const bytes =
      tipo === 'ticket'
        ? generarEscPosTicketCliente(pedido, opciones)
        : generarEscPosComandaCocina(pedido, opciones)

    // 1. Impresora térmica conectada por hardware directo:
    if (this.estaConectada() && this.config.impresionSilenciosaActiva) {
      const enviado = await this.enviarRaw(bytes)
      if (enviado) {
        return { metodo: 'directo', exito: true }
      }
    }

    // 2. Agente local: si está activado, es la única salida silenciosa.
    // No caemos al iframe porque abriría el diálogo del navegador.
    if (this.config.usarAgenteImpresion) {
      const resultado = await this.enviarAlAgente(bytes)
      if (resultado.exito) {
        return { metodo: 'agente', exito: true }
      }
      return { metodo: 'agente', exito: false, error: resultado.error }
    }

    // 3. Fallback Iframe
    const f = formatearPrecio
    const p = pedido
    const metodoPagoLabel: Record<string, string> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      mixto: 'Mixto',
      sin_especificar: 'Sin especificar',
    }

    const htmlTicket = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{margin:0!important;size:auto}
  html,body{margin:0!important;padding:0!important;font-family:monospace;font-size:12px;width:${this.config.anchoMm}mm;color:#000;background:#fff}
  body{padding:0 2px!important}
  h1{font-size:18px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;text-align:center;margin:0 0 2px 0}
  .sub{text-align:center;font-size:10px;margin-bottom:3px}
  .sep{border-top:1px dashed #000;margin:4px 0}
  .row{display:flex;justify-content:space-between;margin:2px 0}
  .bold{font-weight:bold}
  .big{font-size:14px;font-weight:bold}
  .center{text-align:center}
  table{width:100%;border-collapse:collapse}
  td{padding:2px 0;vertical-align:top;font-size:11px;color:#000}
  td:last-child{text-align:right;white-space:nowrap}
  .nota{font-size:10px;background:#f5f5f5;padding:3px 5px;border-radius:3px;margin-top:3px}
  @media print{@page{margin:0!important;size:auto}html,body{margin:0!important;padding:0 2px!important}}
</style></head><body>
<h1>CHEFSY</h1>
<div class="sub">Ticket de Pedido</div>
<div class="sub">Pedido #${p.id.slice(0,6).toUpperCase()} &nbsp;·&nbsp; ${p.hora}</div>
<div class="sep"></div>
<div class="row"><span><b>Cliente:</b> ${p.cliente}</span></div>
${p.telefono && p.telefono !== 'Sin especificar' ? `<div class="row"><span><b>Tel:</b> ${p.telefono}</span></div>` : ''}
<div class="row"><span><b>Entrega:</b> ${p.tipoEntrega === 'delivery' ? 'Delivery' : p.tipoEntrega === 'retiro' ? 'Retiro en local' : 'Consumo en local'}</span></div>
${p.direccion ? `<div class="row"><span><b>Dir:</b> ${p.direccion}</span></div>` : ''}
<div class="sep"></div>
<table>
${p.productos.map(prod => `<tr><td><b>${prod.cantidad}x</b> ${prod.nombre}${prod.coccion ? `<div style="margin-left:8px;font-weight:900;font-size:11px;color:#000;text-transform:uppercase;letter-spacing:0.5px">↳ [${prod.coccion === 'fritas' ? 'FRITAS' : 'AL HORNO'}]</div>` : ''}</td><td>${f(prod.precio * prod.cantidad)}</td></tr>`).join('')}
</table>
<div class="sep"></div>
${p.costoEnvio ? `<div class="row"><span>Subtotal:</span><span>${f(p.total - (p.costoEnvio ?? 0))}</span></div><div class="row"><span>Envío:</span><span>${f(p.costoEnvio)}</span></div>` : ''}
<div class="row big"><span>TOTAL:</span><span>${f(p.total)}</span></div>
<div class="row"><span>Pago:</span><span>${metodoPagoLabel[p.metodoPago ?? 'sin_especificar'] ?? 'Desconocido'}</span></div>
${p.observaciones ? `<div class="sep"></div><div class="nota bold">NOTAS: ${p.observaciones.toUpperCase()}</div>` : ''}
<div class="sep"></div>
<div class="center" style="margin-top:4px;font-size:10px">¡Gracias por su compra! · Sistema Chefsy</div>
</body></html>`

    const htmlCocina = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{margin:0!important;size:auto}
  html,body{margin:0!important;padding:0!important;font-family:monospace;font-size:17px;width:${this.config.anchoMm}mm;color:#000;background:#fff}
  body{padding:0 2px!important}
  h1{font-size:26px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;text-align:center;margin:0 0 2px 0}
  .sub{text-align:center;font-size:14px;margin-bottom:3px}
  .sep{border-top:2px dashed #000;margin:6px 0}
  .prod{display:flex;align-items:baseline;gap:6px;margin:6px 0;font-size:18px;font-weight:bold}
  .cant{font-size:26px;min-width:32px;text-align:right;line-height:1}
  .pname{flex:1}
  .nota{font-size:15px;font-weight:bold;text-transform:uppercase;background:#eee;padding:4px 6px;border-radius:3px;margin-top:6px}
  .tipo{font-size:16px;font-weight:bold;text-align:center;text-transform:uppercase;letter-spacing:1px;border:2px solid #000;padding:3px;margin-top:4px}
  @media print{@page{margin:0!important;size:auto}html,body{margin:0!important;padding:0 2px!important}}
</style></head><body>
<h1>COCINA</h1>
<div class="sub">${p.hora}</div>
<div class="sub"><b>${p.cliente}</b></div>
<div class="sep"></div>
${p.productos.map(prod => `<div class="prod"><span class="cant">${prod.cantidad}x</span><div class="pname"><div>${prod.nombre}</div>${prod.coccion ? `<div style="display:inline-block;border:2px solid #000;color:#000;font-weight:900;font-size:16px;padding:1px 8px;margin-top:4px;border-radius:3px;letter-spacing:1px">↳ ${prod.coccion === 'fritas' ? 'FRITAS' : 'AL HORNO'}</div>` : ''}</div></div>`).join('')}
${p.observaciones ? `<div class="sep"></div><div class="nota">NOTA: ${p.observaciones.toUpperCase()}</div>` : ''}
<div class="sep"></div>
<div class="tipo">${p.tipoEntrega === 'delivery' ? 'DELIVERY' : p.tipoEntrega === 'retiro' ? 'RETIRO EN LOCAL' : 'CONSUMO EN LOCAL'}</div>
</body></html>`

    this.imprimirPorIframe(tipo === 'ticket' ? htmlTicket : htmlCocina)
    return { metodo: 'iframe', exito: true }
  }

  /**
   * Imprime un ticket de prueba para calibrar
   */
  public async imprimirPrueba(): Promise<boolean> {
    const bytes = generarEscPosTicketPrueba({
      anchoMm: this.config.anchoMm,
      cortarPapel: this.config.cortarPapel,
      sonarAlarma: true,
      tipografia: this.config.tipografia.ticket,
    })

    if (this.estaConectada()) {
      const ok = await this.enviarRaw(bytes)
      if (ok) return true
    }

    // Si el agente local está activado, no abrimos el diálogo.
    // Un fallo se informa para que el usuario revise el agente.
    if (this.config.usarAgenteImpresion) {
      const resultado = await this.enviarAlAgente(bytes)
      if (resultado.exito) return true
      throw new Error(resultado.error || 'El agente local no pudo imprimir el ticket de prueba.')
    }

    // Fallback Iframe si no hay conexión directa o si falló el envío directo
    const htmlPrueba = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{margin:0!important;size:auto}
  html,body{font-family:monospace;font-size:12px;width:${this.config.anchoMm}mm;color:#000;text-align:center}
  .sep{border-top:1px dashed #000;margin:6px 0}
  h1{font-size:18px;font-weight:bold}
</style></head><body>
<h1>CHEFSY POS</h1>
<p>PRUEBA DE IMPRESIÓN</p>
<div class="sep"></div>
<p style="text-align:left">Ancho configurado: ${this.config.anchoMm}mm</p>
<p style="text-align:left">Fecha: ${new Date().toLocaleTimeString()}</p>
<div class="sep"></div>
<p style="font-weight:bold">¡Impresión configurada correctamente!</p>
</body></html>`
    this.imprimirPorIframe(htmlPrueba)
    return true
  }
}

// Instancia única (Singleton) para toda la aplicación
export const gestorImpresora = new GestorImpresoraTermica()
