"use client"

import { useRef } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { usarPedidos } from "@/contexto/PedidosContexto"

interface ThemeToggleProps {
  className?: string
}

// Tipado mínimo para la View Transitions API
type TransicionVista = {
  finished: Promise<void>
}
type DocumentoConVT = Document & {
  startViewTransition?: (actualizar: () => void) => TransicionVista
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { modoOscuro, alternarModoOscuro } = usarPedidos()
  const enCursoRef = useRef(false)
  const botonRef = useRef<HTMLButtonElement>(null)

  const animarCambioTemaFallback = () => {
    const raiz = document.documentElement
    const eraOscuro = raiz.classList.contains("dark")
    const cubierta = document.createElement("div")
    cubierta.setAttribute("aria-hidden", "true")
    Object.assign(cubierta.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483646",
      pointerEvents: "none",
      background: eraOscuro ? "#f8fafc" : "#020617",
      clipPath: "inset(0 0 0 0)",
    })
    document.body.appendChild(cubierta)
    alternarModoOscuro()

    const animacion = cubierta.animate(
      [
        { clipPath: "inset(0 0 0 0)" },
        { clipPath: "inset(0 0 100% 0)" },
      ],
      { duration: 1400, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)", fill: "forwards" }
    )
    animacion.finished.then(() => cubierta.remove()).catch(() => cubierta.remove())
  }

  const manejarToggle = () => {
    if (enCursoRef.current) return
    const documento = document as DocumentoConVT
    const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Con movimiento reducido usamos una cubierta animada por Web Animations
    // API: no depende de las pseudo-capas que Chrome/Edge puede suprimir.
    if (
      document.hidden ||
      movimientoReducido ||
      typeof documento.startViewTransition !== "function"
    ) {
      animarCambioTemaFallback()
      return
    }

    // Nombramos únicamente el botón que recibió el click. La View Transition
    // separa su snapshot viejo del resto de la página, así el tembleque ocurre
    // apenas empieza la ola y nunca se aplica al botón del tema nuevo.
    enCursoRef.current = true
    const boton = botonRef.current
    boton?.style.setProperty("view-transition-name", "theme-toggle-pressed")

    // Congelar las transiciones propias de la página durante el barrido.
    const raiz = document.documentElement
    raiz.classList.add("vt-sin-transiciones")

    const transicion = documento.startViewTransition(() => {
      alternarModoOscuro()
    })

    const limpiar = () => {
      raiz.classList.remove("vt-sin-transiciones")
      boton?.style.removeProperty("view-transition-name")
      enCursoRef.current = false
    }
    transicion.finished.then(limpiar).catch(limpiar)
    window.setTimeout(limpiar, 2200)
  }

  return (
    <Button
      ref={botonRef}
      variant="ghost"
      size="icon"
      onClick={manejarToggle}
      aria-label={modoOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title="Alternar Modo Oscuro"
      className={cn(className)}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
