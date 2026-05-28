'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'

type Operacion = '+' | '-' | '×' | '÷' | null

export default function CalculadoraFlotante() {
  const [abierta, setAbierta] = useState(false)
  const [display, setDisplay] = useState('0')
  const [operacion, setOperacion] = useState<Operacion>(null)
  const [valorAnterior, setValorAnterior] = useState<string | null>(null)
  const [esperandoOperando, setEsperandoOperando] = useState(false)
  const [historial, setHistorial] = useState('')

  // Drag logic
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null)
  const calcRef = useRef<HTMLDivElement>(null)

  // Cargar posición guardada
  useEffect(() => {
    const savedPos = localStorage.getItem('chefsy-calc-pos')
    if (savedPos) {
      try { setPos(JSON.parse(savedPos)) } catch {}
    }
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
      const newPos = { x: dragStart.current.posX + dx, y: dragStart.current.posY + dy }
      setPos(newPos)
      localStorage.setItem('chefsy-calc-pos', JSON.stringify(newPos))
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isDragging])

  const inputDigito = (digito: string) => {
    if (esperandoOperando) {
      setDisplay(digito)
      setEsperandoOperando(false)
    } else {
      setDisplay(prev => prev === '0' ? digito : prev.length >= 12 ? prev : prev + digito)
    }
  }

  const inputDecimal = () => {
    if (esperandoOperando) { setDisplay('0.'); setEsperandoOperando(false); return }
    if (!display.includes('.')) setDisplay(prev => prev + '.')
  }

  const limpiar = () => {
    setDisplay('0')
    setOperacion(null)
    setValorAnterior(null)
    setEsperandoOperando(false)
    setHistorial('')
  }

  const borrar = () => {
    if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0')
    } else {
      setDisplay(prev => prev.slice(0, -1))
    }
  }

  const toggleSigno = () => {
    setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev)
  }

  const porcentaje = () => {
    const val = parseFloat(display)
    if (!isNaN(val)) {
      const result = val / 100
      setDisplay(String(parseFloat(result.toFixed(10))))
    }
  }

  const calcular = useCallback((a: string, b: string, op: Operacion): string => {
    const fa = parseFloat(a)
    const fb = parseFloat(b)
    if (isNaN(fa) || isNaN(fb)) return '0'
    let resultado: number
    switch (op) {
      case '+': resultado = fa + fb; break
      case '-': resultado = fa - fb; break
      case '×': resultado = fa * fb; break
      case '÷': resultado = fb === 0 ? NaN : fa / fb; break
      default: return b
    }
    if (isNaN(resultado)) return 'Error'
    // Format nicely
    const str = parseFloat(resultado.toFixed(10)).toString()
    return str
  }, [])

  const aplicarOperacion = (nuevaOp: Operacion) => {
    if (valorAnterior !== null && operacion && !esperandoOperando) {
      const resultado = calcular(valorAnterior, display, operacion)
      setHistorial(`${resultado} ${nuevaOp || ''}`)
      setDisplay(resultado)
      setValorAnterior(resultado)
    } else {
      setHistorial(`${display} ${nuevaOp || ''}`)
      setValorAnterior(display)
    }
    setOperacion(nuevaOp)
    setEsperandoOperando(true)
  }

  const igual = () => {
    if (valorAnterior === null || operacion === null) return
    const resultado = calcular(valorAnterior, display, operacion)
    setHistorial(`${valorAnterior} ${operacion} ${display} =`)
    setDisplay(resultado)
    setValorAnterior(null)
    setOperacion(null)
    setEsperandoOperando(true)
  }

  // Keyboard support
  useEffect(() => {
    if (!abierta) return
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') inputDigito(e.key)
      else if (e.key === '.') inputDecimal()
      else if (e.key === '+') aplicarOperacion('+')
      else if (e.key === '-') aplicarOperacion('-')
      else if (e.key === '*') aplicarOperacion('×')
      else if (e.key === '/') { e.preventDefault(); aplicarOperacion('÷') }
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); igual() }
      else if (e.key === 'Escape') limpiar()
      else if (e.key === 'Backspace') borrar()
      else if (e.key === '%') porcentaje()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [abierta, display, operacion, valorAnterior, esperandoOperando])

  const btnBase = 'h-12 rounded-xl font-bold text-base transition-all duration-100 active:scale-95 select-none'
  const btnNum = cn(btnBase, 'bg-zinc-700 hover:bg-zinc-600 text-white')
  const btnOp = cn(btnBase, 'bg-chefsy hover:bg-chefsy-500 text-white')
  const btnEq = cn(btnBase, 'bg-chefsy-400 hover:bg-chefsy-500 text-white col-span-2')
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
          className="fixed z-50 select-none"
          style={{
            bottom: `${220 - pos.y}px`,
            right: `${24 - pos.x}px`,
            cursor: isDragging ? 'grabbing' : 'auto',
          }}
        >
          <div
            className="w-64 rounded-2xl overflow-hidden shadow-2xl border border-zinc-700"
            style={{ background: '#18181b' }}
          >
            {/* Header draggable */}
            <div
              onMouseDown={onMouseDown}
              className="flex items-center justify-between px-4 py-2.5 bg-zinc-800 cursor-grab active:cursor-grabbing border-b border-zinc-700"
            >
              <div className="flex items-center gap-2">
                <Calculator size={14} className="text-chefsy-300" />
                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
                  Calculadora
                </span>
              </div>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setAbierta(false)}
                className="text-zinc-500 hover:text-white transition-colors p-0.5 rounded"
              >
                <X size={14} />
              </button>
            </div>

            {/* Display */}
            <div className="px-4 pt-4 pb-2 bg-zinc-900">
              <p className="text-right text-[11px] text-zinc-500 font-mono h-4 truncate">
                {historial || ' '}
              </p>
              <p className={cn(
                'text-right font-mono font-bold text-white mt-1 truncate transition-all',
                display.length > 10 ? 'text-xl' : display.length > 7 ? 'text-2xl' : 'text-3xl'
              )}>
                {display}
              </p>
            </div>

            {/* Botones */}
            <div className="grid grid-cols-4 gap-1.5 p-3 bg-zinc-800/50">
              {/* Fila 1 */}
              <button onClick={limpiar} className={cn(btnSpec, 'col-span-2 text-sm')}>AC</button>
              <button onClick={borrar} className={cn(btnSpec, 'text-sm')}>⌫</button>
              <button onClick={() => aplicarOperacion('÷')} className={cn(btnOp, operacion === '÷' && esperandoOperando ? 'ring-2 ring-white/50' : '')}>÷</button>

              {/* Fila 2 */}
              <button onClick={() => inputDigito('7')} className={btnNum}>7</button>
              <button onClick={() => inputDigito('8')} className={btnNum}>8</button>
              <button onClick={() => inputDigito('9')} className={btnNum}>9</button>
              <button onClick={() => aplicarOperacion('×')} className={cn(btnOp, operacion === '×' && esperandoOperando ? 'ring-2 ring-white/50' : '')}>×</button>

              {/* Fila 3 */}
              <button onClick={() => inputDigito('4')} className={btnNum}>4</button>
              <button onClick={() => inputDigito('5')} className={btnNum}>5</button>
              <button onClick={() => inputDigito('6')} className={btnNum}>6</button>
              <button onClick={() => aplicarOperacion('-')} className={cn(btnOp, operacion === '-' && esperandoOperando ? 'ring-2 ring-white/50' : '')}>−</button>

              {/* Fila 4 */}
              <button onClick={() => inputDigito('1')} className={btnNum}>1</button>
              <button onClick={() => inputDigito('2')} className={btnNum}>2</button>
              <button onClick={() => inputDigito('3')} className={btnNum}>3</button>
              <button onClick={() => aplicarOperacion('+')} className={cn(btnOp, operacion === '+' && esperandoOperando ? 'ring-2 ring-white/50' : '')}>+</button>

              {/* Fila 5 */}
              <button onClick={toggleSigno} className={btnSpec}>+/−</button>
              <button onClick={() => inputDigito('0')} className={btnNum}>0</button>
              <button onClick={inputDecimal} className={btnNum}>.</button>
              <button onClick={porcentaje} className={btnSpec}>%</button>

              {/* Igual */}
              <button onClick={igual} className={btnEq}>=</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
