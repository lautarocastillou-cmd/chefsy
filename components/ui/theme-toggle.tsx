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

  const manejarToggle = () => {
    if (enCursoRef.current) return
    const documento = document as DocumentoConVT

    // Sin animación si la pestaña está oculta o el navegador no soporta View
    // Transitions: cambio directo. La preferencia de movimiento reducido del
    // sistema se ignora a propósito para que la ola siempre se vea.
    if (
      document.hidden ||
      typeof documento.startViewTransition !== "function"
    ) {
      alternarModoOscuro()
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
