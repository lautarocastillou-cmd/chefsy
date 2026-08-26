import { spawn } from 'child_process'
import http from 'http'

const CHROME_PATH = 'C:\\Users\\lauta\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe'
const PORT = 9222

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

async function auditarPagina(urlDestino, nombre) {
  console.log(`\n======================================================`)
  console.log(`📊 AUDITANDO: ${nombre} (${urlDestino})`)
  console.log(`======================================================`)

  // 1. Iniciar Chromium con DevTools Protocol
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--window-size=412,915', // Mobile viewport (Pixel 7 style)
    '--user-data-dir=' + `C:\\Users\\lauta\\AppData\\Local\\Temp\\chrome-perf-${Date.now()}`
  ])

  await sleep(1500)

  try {
    const list = await fetchJson(`http://127.0.0.1:${PORT}/json/list`)
    const page = list.find(p => p.type === 'page') || list[0]

    if (!page || !page.webSocketDebuggerUrl) {
      throw new Error('No se pudo obtener webSocketDebuggerUrl de Chrome.')
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl)

    await new Promise((resolve, reject) => {
      ws.onopen = resolve
      ws.onerror = reject
    })

    let id = 1
    const pending = new Map()

    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data)
      if (parsed.id && pending.has(parsed.id)) {
        pending.get(parsed.id)(parsed)
        pending.delete(parsed.id)
      }
    }

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const reqId = id++
        pending.set(reqId, resolve)
        ws.send(JSON.stringify({ id: reqId, method, params }))
      })
    }

    await send('Page.enable')
    await send('Network.enable')
    await send('Runtime.enable')
    await send('Performance.enable')

    // Emular red 4G rápida o normal
    await send('Emulation.setDeviceMetricsOverride', {
      width: 412,
      height: 915,
      deviceScaleFactor: 2.625,
      mobile: true
    })

    // Medir recursos de red
    const recursos = []
    let totalBytesTransferidos = 0

    // Navegar
    const startTime = Date.now()
    await send('Page.navigate', { url: urlDestino })

    // Esperar a que la página cargue y estabilice
    await sleep(3500)

    // Evaluar Core Web Vitals en el contexto de la página
    const evalScript = `
      (() => {
        const nav = performance.getEntriesByType('navigation')[0] || {}
        const paints = performance.getEntriesByType('paint')
        const fcp = paints.find(p => p.name === 'first-contentful-paint')?.startTime || 0
        const fp = paints.find(p => p.name === 'first-paint')?.startTime || 0

        // LCP
        let lcp = 0
        let lcpElement = ''
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
        if (lcpEntries.length > 0) {
          const ultimoLCP = lcpEntries[lcpEntries.length - 1]
          lcp = ultimoLCP.renderTime || ultimoLCP.loadTime || ultimoLCP.startTime
          if (ultimoLCP.element) {
            lcpElement = ultimoLCP.element.tagName + (ultimoLCP.element.className ? '.' + ultimoLCP.element.className.split(' ')[0] : '')
          }
        }

        // CLS
        let cls = 0
        const layoutShifts = performance.getEntriesByType('layout-shift')
        for (const shift of layoutShifts) {
          if (!shift.hadRecentInput) {
            cls += shift.value
          }
        }

        // Recursos y Payload
        const resources = performance.getEntriesByType('resource').map(r => ({
          name: r.name.split('/').pop().split('?')[0] || r.name,
          type: r.initiatorType,
          duration: Math.round(r.duration),
          transferSize: r.transferSize || 0
        }))

        // Memoria
        const memory = performance.memory ? {
          usedJSHeapSizeMB: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
          totalJSHeapSizeMB: (performance.memory.totalJSHeapSize / 1048576).toFixed(2)
        } : null

        return {
          ttfb: Math.round(nav.responseStart - nav.requestStart) || 0,
          domInteractive: Math.round(nav.domInteractive) || 0,
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd) || 0,
          loadEvent: Math.round(nav.loadEventEnd) || 0,
          fcp: Math.round(fcp),
          fp: Math.round(fp),
          lcp: Math.round(lcp),
          lcpElement,
          cls: parseFloat(cls.toFixed(4)),
          totalResources: resources.length,
          jsCount: resources.filter(r => r.type === 'script').length,
          cssCount: resources.filter(r => r.type === 'css' || r.type === 'link').length,
          imgCount: resources.filter(r => r.type === 'img').length,
          domNodesCount: document.getElementsByTagName('*').length,
          memory
        }
      })()
    `

    const evalResult = await send('Runtime.evaluate', {
      expression: evalScript,
      returnByValue: true
    })

    const metrics = evalResult.result?.result?.value || evalResult.result?.value || {}

    console.log(`\n⏱️  TIEMPOS DE CARGA & CORE WEB VITALS (Móvil Emulado):`)
    console.log(`------------------------------------------------------`)
    console.log(`⚡ TTFB (Time to First Byte):        ${metrics.ttfb} ms  ${metrics.ttfb < 200 ? '🟢 Óptimo' : '🟡 Aceptable'}`)
    console.log(`🎨 FCP (First Contentful Paint):      ${metrics.fcp} ms  ${metrics.fcp < 1800 ? '🟢 Óptimo (< 1.8s)' : '🔴 Lento'}`)
    console.log(`🖼️  LCP (Largest Contentful Paint):    ${metrics.lcp} ms  ${metrics.lcp < 2500 ? '🟢 Óptimo (< 2.5s)' : '🔴 Mejorar'}`)
    if (metrics.lcpElement) console.log(`   ↳ Elemento LCP:                   <${metrics.lcpElement}>`)
    console.log(`📐 CLS (Cumulative Layout Shift):     ${metrics.cls}     ${metrics.cls < 0.1 ? '🟢 Excelente (< 0.1)' : '🔴 Inestable'}`)
    console.log(`⚡ DOM Interactive:                  ${metrics.domInteractive} ms`)
    console.log(`🚀 Carga Completa (Load Event):      ${metrics.loadEvent} ms`)
    
    console.log(`\n📦 RECURSOS & ESTRUCTURA DEL DOM:`)
    console.log(`------------------------------------------------------`)
    console.log(`📄 Total Recursos Solicitados:       ${metrics.totalResources}`)
    console.log(`📜 Scripts JS:                       ${metrics.jsCount}`)
    console.log(`🎨 Estilos CSS:                      ${metrics.cssCount}`)
    console.log(`🖼️  Imágenes:                         ${metrics.imgCount}`)
    console.log(`🌳 Nodos del DOM:                    ${metrics.domNodesCount} elementos`)

    if (metrics.memory) {
      console.log(`\n🧠 CONSUMO DE MEMORIA (JS Heap):`)
      console.log(`------------------------------------------------------`)
      console.log(`Memoria JS Usada:                    ${metrics.memory.usedJSHeapSizeMB} MB / ${metrics.memory.totalJSHeapSizeMB} MB`)
    }

    ws.close()
    return metrics
  } finally {
    chromeProcess.kill('SIGTERM')
  }
}

async function main() {
  try {
    await auditarPagina('http://localhost:3000', 'Tienda Online (Catálogo Principal)')
    await auditarPagina('http://localhost:3000/configuracion/stock', 'Panel de Control de Stock')
    console.log(`\n✅ AUDITORÍA COMPLETADA CON ÉXITO\n`)
  } catch (err) {
    console.error('Error en auditoría:', err)
  }
}

main()
