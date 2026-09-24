/**
 * lib/vueloCarrito.ts
 * Animación fluida de alta performance (60/120 FPS) que hace volar el nombre
 * del producto hacia el botón del carrito al agregarlo, usando Web Animations API en GPU.
 */

export interface OpcionesVueloCarrito {
  texto: string
  origenRect: {
    left: number
    top: number
    width: number
    height: number
  }
  destinoId?: string
}

function obtenerContenedorPortal(): HTMLElement {
  let portal = document.getElementById('chefsy-vuelo-portal')
  if (!portal) {
    portal = document.createElement('div')
    portal.id = 'chefsy-vuelo-portal'
    portal.style.position = 'fixed'
    portal.style.inset = '0'
    portal.style.pointerEvents = 'none'
    portal.style.zIndex = '999999'
    portal.style.overflow = 'hidden'
    document.body.appendChild(portal)
  }
  return portal
}

function escaparHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function dispararVueloAlCarrito(opciones: OpcionesVueloCarrito): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  // Respetar preferencia de accesibilidad para movimiento reducido
  const movimientoReducido = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  if (movimientoReducido) {
    window.dispatchEvent(new CustomEvent('chefsy:cart-pop'))
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15)
    }
    return
  }

  // Buscar el elemento de destino del carrito (desktop o mobile)
  let destinoElem: HTMLElement | null = null
  if (opciones.destinoId) {
    destinoElem = document.getElementById(opciones.destinoId)
  }

  if (!destinoElem) {
    const esDesktop = window.innerWidth >= 768
    destinoElem = esDesktop
      ? document.getElementById('cart-button-desktop')
      : document.getElementById('cart-button-mobile')
  }

  // Calcular coordenadas de destino
  let destinoX: number
  let destinoY: number

  if (destinoElem) {
    const dRect = destinoElem.getBoundingClientRect()
    destinoX = dRect.left + dRect.width / 2
    destinoY = dRect.top + dRect.height / 2
  } else {
    // Fallback si no está montado aún
    if (window.innerWidth >= 768) {
      destinoX = window.innerWidth - 65
      destinoY = window.innerHeight - 50
    } else {
      destinoX = window.innerWidth * 0.85
      destinoY = window.innerHeight - 35
    }
  }

  // Coordenadas de origen
  const origenX = opciones.origenRect.left + opciones.origenRect.width / 2
  const origenY = opciones.origenRect.top + opciones.origenRect.height / 2

  // Calcular vértice de la parábola (arco en Y)
  const dx = destinoX - origenX
  const dy = destinoY - origenY
  const distX = Math.abs(dx)
  const alturaArco = Math.max(90, Math.min(260, distX * 0.35 + 40))

  const verticeX = (origenX + destinoX) / 2
  const verticeY = Math.min(origenY, destinoY) - alturaArco

  const portal = obtenerContenedorPortal()

  // Crear el chip volador
  const chip = document.createElement('div')
  chip.className =
    'fixed inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black text-white ' +
    'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 ' +
    'border border-emerald-300/40 shadow-[0_10px_25px_rgba(16,185,129,0.55)] ' +
    'pointer-events-none select-none z-[999999]'

  chip.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white shrink-0">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <path d="M3 6h18"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
    <span class="truncate max-w-[150px] sm:max-w-[200px] leading-tight">${escaparHtml(opciones.texto)}</span>
  `

  chip.style.left = '0px'
  chip.style.top = '0px'
  chip.style.transformOrigin = 'center center'
  chip.style.willChange = 'transform, opacity'

  portal.appendChild(chip)

  // Generar 28 keyframes para la curva cuadrática Bézier B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
  const TOTAL_PUNTOS = 28
  const keyframes: Keyframe[] = []

  for (let i = 0; i <= TOTAL_PUNTOS; i++) {
    const t = i / TOTAL_PUNTOS
    const unMenosT = 1 - t

    const x = unMenosT * unMenosT * origenX + 2 * unMenosT * t * verticeX + t * t * destinoX
    const y = unMenosT * unMenosT * origenY + 2 * unMenosT * t * verticeY + t * t * destinoY

    // Efecto de escala: inicia en 1.0, sube a 1.12 en el aire, y se achica hacia 0.25 entrando al carrito
    let scale = 1.0
    if (t < 0.25) {
      scale = 1.0 + (t / 0.25) * 0.12
    } else if (t < 0.7) {
      scale = 1.12 - ((t - 0.25) / 0.45) * 0.22
    } else {
      scale = 0.9 - ((t - 0.7) / 0.3) * 0.65
    }

    // Opacidad: visible hasta el 88%, luego se desvanece entrando al carrito
    const opacity = t > 0.88 ? Math.max(0, 1 - (t - 0.88) / 0.12) : 1

    // Inclinación dinámica según la dirección del vuelo
    const tilt = Math.sin(t * Math.PI) * (dx > 0 ? 8 : -8)

    keyframes.push({
      transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale}) rotate(${tilt}deg)`,
      opacity,
    })
  }

  try {
    // Control de límite de elementos concurrentes en el portal para clicks rápidos
    while (portal.children.length > 4) {
      portal.firstChild?.remove()
    }

    const duracion = Math.min(750, Math.max(550, 450 + distX * 0.25))

    const animacion = chip.animate(keyframes, {
      duration: duracion,
      easing: 'cubic-bezier(0.25, 0.9, 0.35, 1)',
      fill: 'forwards',
    })

    let finalizado = false
    const completarVuelo = () => {
      if (finalizado) return
      finalizado = true
      chip.remove()

      // Disparar evento para que el badge del carrito haga rebote / micro-pop
      window.dispatchEvent(new CustomEvent('chefsy:cart-pop'))

      // Feedback táctil suave si el dispositivo lo soporta
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(15)
        } catch (_) {}
      }

      // Micro-efecto de destello / onda expansiva de absorción en el destino
      try {
        const burst = document.createElement('div')
        burst.className =
          'fixed w-6 h-6 rounded-full border-2 border-emerald-400 bg-emerald-400/30 pointer-events-none z-[999999]'
        burst.style.left = `${destinoX}px`
        burst.style.top = `${destinoY}px`
        burst.style.transform = 'translate(-50%, -50%)'
        portal.appendChild(burst)

        burst.animate(
          [
            { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0.9 },
            { transform: 'translate(-50%, -50%) scale(2.2)', opacity: 0 },
          ],
          {
            duration: 280,
            easing: 'ease-out',
            fill: 'forwards',
          }
        ).onfinish = () => burst.remove()
      } catch (_) {}
    }

    animacion.onfinish = completarVuelo
    animacion.oncancel = () => {
      if (!finalizado) {
        finalizado = true
        chip.remove()
      }
    }

    // Timer de seguridad por si el navegador suspende la animación (background tab, low power mode)
    setTimeout(() => {
      if (!finalizado) completarVuelo()
    }, duracion + 150)
  } catch (err) {
    // Si falla la animación por cualquier motivo del motor, limpiar y notificar
    chip.remove()
    window.dispatchEvent(new CustomEvent('chefsy:cart-pop'))
  }
}
