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
import { formatearPrecio } from '@/lib/utils'

export type TipoDriverImpresora = 'usb' | 'serial' | 'hid' | 'bluetooth' | 'ninguna'

export interface ConfiguracionImpresora {
  anchoMm: 80 | 58
  cortarPapel: boolean
  sonarAlarmaComanda: boolean
  impresionSilenciosaActiva: boolean
  baudRate: number
}

const CONFIG_STORAGE_KEY = 'chefsy_config_impresora_v1'

const CONFIG_POR_DEFECTO: ConfiguracionImpresora = {
  anchoMm: 80,
  cortarPapel: true,
  sonarAlarmaComanda: true,
  impresionSilenciosaActiva: true,
  baudRate: 9600, // Estándar para Xprinter, POS-80, Unnion TP85, Epson, etc.
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
    }
  }

  public cargarConfiguracion(): ConfiguracionImpresora {
    if (typeof window === 'undefined') return CONFIG_POR_DEFECTO
    try {
      const guardada = localStorage.getItem(CONFIG_STORAGE_KEY)
      if (guardada) {
        this.config = { ...CONFIG_POR_DEFECTO, ...JSON.parse(guardada) }
      }
    } catch {
      this.config = CONFIG_POR_DEFECTO
    }
    return this.config
  }

  public guardarConfiguracion(nuevaConfig: Partial<ConfiguracionImpresora>): void {
    this.config = { ...this.config, ...nuevaConfig }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config))
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

        if (device.configuration?.interfaces) {
          for (const iface of device.configuration.interfaces) {
            for (const alt of iface.alternates) {
              for (const ep of alt.endpoints) {
                if (ep.direction === 'out') {
                  interfaceNum = iface.interfaceNumber
                  endpointOutNum = ep.endpointNumber
                  break
                }
              }
            }
          }
        }

        try {
          await device.claimInterface(interfaceNum)
        } catch (claimErr) {
          console.warn('[Impresora USB] Advertencia al reclamar interfaz:', claimErr)
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
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;top:0;left:0;opacity:0;pointer-events:none'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
    iframe.contentWindow?.focus()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 2000)
    }, 300)
  }

  /**
   * Imprime un pedido directamente en la térmica o mediante fallback
   */
  public async imprimirPedido(
    pedido: Pedido,
    tipo: 'ticket' | 'cocina'
  ): Promise<{ metodo: 'directo' | 'iframe'; exito: boolean; error?: string }> {
    const opciones: OpcionesImpresion = {
      anchoMm: this.config.anchoMm,
      cortarPapel: this.config.cortarPapel,
      sonarAlarma: tipo === 'cocina' && this.config.sonarAlarmaComanda,
    }

    // Si la impresora térmica está conectada por hardware directo:
    if (this.estaConectada() && this.config.impresionSilenciosaActiva) {
      const bytes =
        tipo === 'ticket'
          ? generarEscPosTicketCliente(pedido, opciones)
          : generarEscPosComandaCocina(pedido, opciones)

      const enviado = await this.enviarRaw(bytes)
      if (enviado) {
        return { metodo: 'directo', exito: true }
      }
    }

    // Fallback Iframe
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
  *{margin:0;padding:0;box-sizing:border-box}
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
  td{padding:2px 0;vertical-align:top;font-size:11px}
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
${p.productos.map(prod => `<tr><td><b>${prod.cantidad}x</b> ${prod.nombre}</td><td>${f(prod.precio * prod.cantidad)}</td></tr>`).join('')}
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
  *{margin:0;padding:0;box-sizing:border-box}
  @page{margin:0!important;size:auto}
  html,body{margin:0!important;padding:0!important;font-family:monospace;font-size:17px;width:${this.config.anchoMm}mm;color:#000;background:#fff}
  body{padding:0 2px!important}
  h1{font-size:26px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;text-align:center;margin:0 0 2px 0}
  .sub{text-align:center;font-size:14px;margin-bottom:3px}
  .sep{border-top:2px dashed #000;margin:6px 0}
  .prod{display:flex;align-items:baseline;gap:6px;margin:5px 0;font-size:18px;font-weight:bold}
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
${p.productos.map(prod => `<div class="prod"><span class="cant">${prod.cantidad}x</span><span class="pname">${prod.nombre}</span></div>`).join('')}
${p.observaciones ? `<div class="sep"></div><div class="nota">⚠ ${p.observaciones.toUpperCase()}</div>` : ''}
<div class="sep"></div>
<div class="tipo">${p.tipoEntrega === 'delivery' ? '🛵 DELIVERY' : p.tipoEntrega === 'retiro' ? '🏠 RETIRO EN LOCAL' : '🍽 CONSUMO EN LOCAL'}</div>
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
    })

    if (this.estaConectada()) {
      return await this.enviarRaw(bytes)
    }

    // Fallback Iframe si no hay conexión directa
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
