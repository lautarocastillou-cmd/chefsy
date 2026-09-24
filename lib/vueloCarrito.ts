/**
 * lib/vueloCarrito.ts
 * Animación fluida de alta performance (60/120 FPS) que hace volar el nombre
 * del producto en un badge esmeralda hacia el botón del carrito al agregarlo.
 */

export interface OpcionesVueloCarrito {
  texto: string
  origenRect?: {
    left: number
    top: number
    width: number
    height: number
  }
  destinoId?: string
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

  // 1. Determinar origen del vuelo: preferir el título del producto en el modal o el origenRect provisto
  let origenX = window.innerWidth / 2
  let origenY = window.innerHeight / 2

  const elementoTitulo = document.getElementById('modal-producto-nombre')
  if (elementoTitulo) {
    const tRect = elementoTitulo.getBoundingClientRect()
    if (tRect.width > 0 && tRect.height > 0) {
      origenX = tRect.left + tRect.width / 2
      origenY = tRect.top + tRect.height / 2
    }
  } else if (opciones.origenRect && opciones.origenRect.width > 0) {
    origenX = opciones.origenRect.left + opciones.origenRect.width / 2
    origenY = opciones.origenRect.top + opciones.origenRect.height / 2
  }

  // 2. Determinar destino (buscar botón en Desktop o Mobile que esté realmente visible en el DOM)
  let destinoElem: HTMLElement | null = null
  if (opciones.destinoId) {
    destinoElem = document.getElementById(opciones.destinoId)
  }

  if (!destinoElem) {
    const desktopCart = document.getElementById('cart-button-desktop')
    const mobileCart = document.getElementById('cart-button-mobile')

    if (desktopCart && mobileCart) {
      const dRect = desktopCart.getBoundingClientRect()
      const mRect = mobileCart.getBoundingClientRect()
      // Si desktopCart es visible y tiene tamaño en pantalla
      if (dRect.width > 0 && dRect.height > 0 && window.innerWidth >= 768) {
        destinoElem = desktopCart
      } else {
        destinoElem = mobileCart
      }
    } else {
      destinoElem = desktopCart || mobileCart
    }
  }

  let destinoX = 0
  let destinoY = 0

  if (destinoElem) {
    const dRect = destinoElem.getBoundingClientRect()
    if (dRect.width > 0 && dRect.height > 0) {
      destinoX = dRect.left + dRect.width / 2
      destinoY = dRect.top + dRect.height / 2
    }
  }

  // Coordenadas de respaldo seguras si el elemento destino no está visible aún en pantalla
  if (!destinoX || !destinoY || isNaN(destinoX) || isNaN(destinoY)) {
    if (window.innerWidth >= 768) {
      destinoX = window.innerWidth - 65
      destinoY = window.innerHeight - 50
    } else {
      destinoX = window.innerWidth * 0.88
      destinoY = window.innerHeight - 35
    }
  }

  // 3. Crear el contenedor de vuelo si no existe (portal global)
  let portal = document.getElementById('chefsy-vuelo-portal')
  if (!portal) {
    portal = document.createElement('div')
    portal.id = 'chefsy-vuelo-portal'
    portal.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999999;overflow:visible;'
    document.body.appendChild(portal)
  }

  // Limpiar chips viejos si se hicieron clicks rápidos
  while (portal.children.length > 3) {
    portal.firstChild?.remove()
  }

  // 4. Crear el chip volador con estilos inline 100% seguros (inmunes a purge de CSS)
  const chip = document.createElement('div')
  chip.style.cssText = [
    'position: fixed',
    'left: 0px',
    'top: 0px',
    'z-index: 99999999',
    'display: inline-flex',
    'align-items: center',
    'gap: 8px',
    'padding: 8px 16px',
    'border-radius: 9999px',
    'font-size: 13px',
    'font-weight: 900',
    'font-family: inherit',
    'letter-spacing: 0.02em',
    'color: #ffffff',
    'background: linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)',
    'border: 1.5px solid rgba(167, 243, 208, 0.8)',
    'box-shadow: 0 10px 30px rgba(5, 150, 105, 0.7), 0 0 16px rgba(52, 211, 153, 0.6)',
    'pointer-events: none',
    'user-select: none',
    'will-change: transform, opacity',
    'transform-origin: center center',
    'transform: translate3d(-9999px, -9999px, 0)'
  ].join(';') + ';'

  chip.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <path d="M3 6h18"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
    <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px;line-height:1.2;">${escaparHtml(opciones.texto)}</span>
  `

  portal.appendChild(chip)

  // 5. Parábola Bézier Cuadrática B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
  const dx = destinoX - origenX
  const dy = destinoY - origenY
  const distX = Math.abs(dx)

  // El arco siempre se eleva de forma prominente hacia arriba sin salirse de la pantalla
  const alturaArco = Math.max(130, Math.min(320, distX * 0.45 + 70))
  const verticeX = (origenX + destinoX) / 2
  const verticeY = Math.max(35, Math.min(origenY, destinoY) - alturaArco)

  const TOTAL_PUNTOS = 32
  const keyframes: Keyframe[] = []

  for (let i = 0; i <= TOTAL_PUNTOS; i++) {
    const t = i / TOTAL_PUNTOS
    const unMenosT = 1 - t

    const x = unMenosT * unMenosT * origenX + 2 * unMenosT * t * verticeX + t * t * destinoX
    const y = unMenosT * unMenosT * origenY + 2 * unMenosT * t * verticeY + t * t * destinoY

    // Efecto de escala: pop inicial a 1.25 en el aire, luego se reduce a 0.2 entrando al carrito
    let scale = 1.0
    if (t < 0.28) {
      scale = 1.0 + (t / 0.28) * 0.25
    } else if (t < 0.72) {
      scale = 1.25 - ((t - 0.28) / 0.44) * 0.35
    } else {
      scale = 0.9 - ((t - 0.72) / 0.28) * 0.7
    }

    // Opacidad: 100% visible hasta el 90%, luego desvanecimiento rápido de absorción
    const opacity = t > 0.9 ? Math.max(0, 1 - (t - 0.9) / 0.1) : 1
    const tilt = Math.sin(t * Math.PI) * (dx > 0 ? 10 : -10)

    keyframes.push({
      transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale}) rotate(${tilt}deg)`,
      opacity
    })
  }

  try {
    const duracion = 750 // 750ms: tiempo perfecto para apreciar la trayectoria sin demoras

    const animacion = chip.animate(keyframes, {
      duration: duracion,
      easing: 'cubic-bezier(0.2, 0.85, 0.3, 1)',
      fill: 'forwards'
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
        try { navigator.vibrate(15) } catch (_) {}
      }

      // Micro-efecto de destello / onda expansiva de absorción en el destino
      try {
        const burst = document.createElement('div')
        burst.style.cssText = [
          'position: fixed',
          `left: ${destinoX}px`,
          `top: ${destinoY}px`,
          'width: 28px',
          'height: 28px',
          'border-radius: 9999px',
          'border: 2px solid #34d399',
          'background: rgba(52, 211, 153, 0.4)',
          'transform: translate(-50%, -50%) scale(0.6)',
          'pointer-events: none',
          'z-index: 99999999'
        ].join(';') + ';'

        portal!.appendChild(burst)

        burst.animate(
          [
            { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 1 },
            { transform: 'translate(-50%, -50%) scale(2.4)', opacity: 0 }
          ],
          { duration: 320, easing: 'ease-out', fill: 'forwards' }
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

    setTimeout(() => {
      if (!finalizado) completarVuelo()
    }, duracion + 150)
  } catch (err) {
    chip.remove()
    window.dispatchEvent(new CustomEvent('chefsy:cart-pop'))
  }
}
