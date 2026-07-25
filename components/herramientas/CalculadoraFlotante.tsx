'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'
import { setCache, getCache } from '@/lib/localCache'

// TTL de preferencias de UI del admin: 90 días
const TTL_UI_HS = 90 * 24

const evaluarExpresion = (expr: string): string => {
  try {
    const sanitizada = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.')
    if (!/^[0-9+\-*/. ()]+$/.test(sanitizada)) return 'Error'
    // eslint-disable-next-line no-new-func
    const resultado = new Function(`return ${sanitizada}`)()
    if (!Number.isFinite(resultado) || isNaN(resultado)) return 'Error'
    return parseFloat(resultado.toFixed(8)).toString()
  } catch {
    return 'Error'
  }
}

export default function CalculadoraFlotante() {
  const [abierta, setAbierta] = useState(false)
  const [display, setDisplay] = useState('0')
  const [historial, setHistorial] = useState('')
  const [evaluado, setEvaluado] = useState(false) // indica si la pantalla actual es resultado de '='

  // Drag logic
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null)
  const calcRef = useRef<HTMLDivElement>(null)

  // Cargar posición guardada (TTL 90 días)
  useEffect(() => {
    const savedPos = getCache<{ x: number; y: number }>('chefsy-calc-pos-v2', TTL_UI_HS)
    if (savedPos) setPos(savedPos)
  }, [])

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y }
  }

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return
      const dx = e.clientX - dragStart.current.mouseX
      const dy = e.clientY - dragStart.current.mouseY
      
      let nextX = dragStart.current.posX + dx
      let nextY = dragStart.current.posY + dy

      // Límites de arrastre
      const minX = 24 - window.innerWidth + 270
      const maxX = 24
      const minY = 220 - window.innerHeight + 100
      const maxY = 220

      nextX = Math.max(minX, Math.min(nextX, maxX))
      nextY = Math.max(minY, Math.min(nextY, maxY))

      const newPos = { x: nextX, y: nextY }
      setPos(newPos)
      setCache('chefsy-calc-pos-v2', newPos)
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isDragging])

  const inputDigito = (d: string) => {
    if (evaluado || display === 'Error' || display === '0') {
      setDisplay(d)
      setEvaluado(false)
    } else {
      // Limitar largo visual
      if (display.length < 35) setDisplay(display + d)
    }
  }

  const inputOperacion = (op: string) => {
    if (display === 'Error') return
    setEvaluado(false)
    
    // Si el último caracter es una operación, la reemplazamos
    if (/[+\-×÷.]$/.test(display)) {
      setDisplay(display.slice(0, -1) + op)
    } else {
      setDisplay(display + op)
    }
  }

  const inputDecimal = () => {
    if (display === 'Error') return
    if (evaluado) {
      setDisplay('0.')
      setEvaluado(false)
      return
    }
    
    const partes = display.split(/[+\-×÷]/)
    const ultimaParte = partes[partes.length - 1]
    if (!ultimaParte.includes('.')) {
      setDisplay(display + '.')
    }
  }

  const limpiar = () => {
    setDisplay('0')
    setHistorial('')
    setEvaluado(false)
  }

  const borrar = () => {
    if (evaluado || display === 'Error') {
      setDisplay('0')
      setEvaluado(false)
    } else {
      if (display.length <= 1) setDisplay('0')
      else setDisplay(display.slice(0, -1))
    }
  }

  const igual = () => {
    if (display === 'Error' || /[+\-×÷.]$/.test(display)) return
    const res = evaluarExpresion(display)
    setHistorial(display + ' =')
    setDisplay(res)
    setEvaluado(true)
  }

  const porcentaje = () => {
    if (display === 'Error' || /[+\-×÷.]$/.test(display)) return
    
    const partes = display.split(/([+\-×÷])/)
    const ultimaParte = partes[partes.length - 1]
    if (ultimaParte && !isNaN(Number(ultimaParte))) {
      const val = Number(ultimaParte) / 100
      partes[partes.length - 1] = val.toString()
      setDisplay(partes.join(''))
    }
  }

  const toggleSigno = () => {
    if (display === 'Error' || display === '0') return
    
    // Solo permitir cambiar signo si es un solo número en display
    if (/^\-?[0-9.]+$/.test(display)) {
      setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display)
    } else {
      // Si es una expresión compleja, calculamos primero y luego cambiamos signo
      const res = evaluarExpresion(display)
      if (res !== 'Error') {
        setDisplay(res.startsWith('-') ? res.slice(1) : '-' + res)
        setHistorial(display + ' =')
        setEvaluado(true)
      }
    }
  }

  // Keyboard support
  useEffect(() => {
    if (!abierta) return
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') inputDigito(e.key)
      else if (e.key === '.') inputDecimal()
      else if (e.key === '+') inputOperacion('+')
      else if (e.key === '-') inputOperacion('-')
      else if (e.key === '*') inputOperacion('×')
      else if (e.key === '/') { e.preventDefault(); inputOperacion('÷') }
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); igual() }
      else if (e.key === 'Escape') limpiar()
      else if (e.key === 'Backspace') borrar()
      else if (e.key === '%') porcentaje()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [abierta, display, evaluado])

  const btnBase = 'h-12 rounded-xl font-bold text-base transition-all duration-100 active:scale-95 select-none focus:outline-none'
  const btnNum = cn(btnBase, 'bg-zinc-700 hover:bg-zinc-600 text-white')
  const btnOp = cn(btnBase, 'bg-chefsy hover:bg-chefsy-500 text-white text-lg')
  const btnEq = cn(btnBase, 'bg-chefsy-400 hover:bg-chefsy-500 text-white col-span-2 text-lg')
  const btnSpec = cn(btnBase, 'bg-zinc-600 hover:bg-zinc-500 text-zinc-100')

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setAbierta(v => !v)}
        className={cn(
          'fixed bottom-[9rem] right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95',
          abierta
            ? 'bg-zinc-700 hover:bg-zinc-600 text-white shadow-zinc-700/30'
            : 'bg-chefsy hover:bg-chefsy-700 text-white shadow-chefsy/20'
        )}
        title="Calculadora"
      >
        <Calculator size={20} />
      </button>

      {/* Calculadora flotante y draggable */}
      {abierta && (
        <div
          ref={calcRef}
          className="fixed z-50 select-none shadow-2xl rounded-2xl"
          style={{
            bottom: `${220 - pos.y}px`,
            right: `${24 - pos.x}px`,
            cursor: isDragging ? 'grabbing' : 'auto',
          }}
        >
          <div
            className="w-64 rounded-2xl overflow-hidden border border-[#3a3a3a]"
            style={{ background: '#252525' }}
          >
            {/* Header draggable */}
            <div
              onMouseDown={onMouseDown}
              className="flex items-center justify-between px-4 py-2.5 bg-[#2e2e2e] cursor-grab active:cursor-grabbing border-b border-[#3a3a3a]"
            >
              <div className="flex items-center gap-2">
                <Calculator size={14} className="text-chefsy-300" />
                <span className="text-[11px] font-black uppercase tracking-widest text-[#a8a8a8]">
                  Calculadora
                </span>
              </div>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setAbierta(false)}
                className="text-[#686868] hover:text-white transition-colors p-0.5 rounded"
              >
                <X size={14} />
              </button>
            </div>

            {/* Display */}
            <div className="px-4 pt-4 pb-2 bg-[#1a1a1a]">
              <p className="text-right text-[11px] text-[#686868] font-mono h-4 truncate">
                {historial || ' '}
              </p>
              <p className={cn(
                'text-right font-mono font-bold text-white mt-1 truncate transition-all',
                display.length > 12 ? 'text-xl' : display.length > 9 ? 'text-2xl' : 'text-3xl'
              )}>
                {display}
              </p>
            </div>

            {/* Botones */}
            <div className="grid grid-cols-4 gap-1.5 p-3 bg-[#252525]">
              {/* Fila 1 */}
              <button onClick={limpiar} className={cn(btnSpec, 'col-span-2 text-sm')}>AC</button>
              <button onClick={borrar} className={cn(btnSpec, 'text-sm')}>⌫</button>
              <button onClick={() => inputOperacion('÷')} className={btnOp}>÷</button>

              {/* Fila 2 */}
              <button onClick={() => inputDigito('7')} className={btnNum}>7</button>
              <button onClick={() => inputDigito('8')} className={btnNum}>8</button>
              <button onClick={() => inputDigito('9')} className={btnNum}>9</button>
              <button onClick={() => inputOperacion('×')} className={btnOp}>×</button>

              {/* Fila 3 */}
              <button onClick={() => inputDigito('4')} className={btnNum}>4</button>
              <button onClick={() => inputDigito('5')} className={btnNum}>5</button>
              <button onClick={() => inputDigito('6')} className={btnNum}>6</button>
              <button onClick={() => inputOperacion('-')} className={btnOp}>−</button>

              {/* Fila 4 */}
              <button onClick={() => inputDigito('1')} className={btnNum}>1</button>
              <button onClick={() => inputDigito('2')} className={btnNum}>2</button>
              <button onClick={() => inputDigito('3')} className={btnNum}>3</button>
              <button onClick={() => inputOperacion('+')} className={btnOp}>+</button>

              {/* Fila 5 */}
              <button onClick={toggleSigno} className={btnSpec}>+/−</button>
              <button onClick={() => inputDigito('0')} className={btnNum}>0</button>
              <button onClick={inputDecimal} className={btnNum}>.</button>
              <button onClick={porcentaje} className={btnSpec}>%</button>

              {/* Igual */}
              <button onClick={igual} className={cn(btnEq, 'col-span-4 mt-1')}>=</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
