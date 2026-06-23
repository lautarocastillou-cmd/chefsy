'use client'

// ─────────────────────────────────────────────────────
// modules/malu/componentes/CalculadoraFlotanteMalu.tsx
// Calculadora flotante draggable para Malú.
// Estética Champagne Gold.
// ─────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { X, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export default function CalculadoraFlotanteMalu() {
  const [abierta, setAbierta] = useState(false)
  const [display, setDisplay] = useState('0')
  const [historial, setHistorial] = useState('')
  const [evaluado, setEvaluado] = useState(false)

  // Drag logic
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null)
  const calcRef = useRef<HTMLDivElement>(null)

  // Cargar posición guardada
  useEffect(() => {
    const savedPos = localStorage.getItem('malu-calc-pos-v2')
    const savedAbierta = localStorage.getItem('malu-calc-abierta-v2')
    if (savedPos) {
      try { setPos(JSON.parse(savedPos)) } catch {}
    }
    if (savedAbierta === 'true') {
      setAbierta(true)
    }
  }, [])

  const toggleAbierta = () => {
    setAbierta(prev => {
      const next = !prev
      localStorage.setItem('malu-calc-abierta-v2', String(next))
      return next
    })
  }

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
      localStorage.setItem('malu-calc-pos-v2', JSON.stringify(newPos))
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
      if (display.length < 35) setDisplay(display + d)
    }
  }

  const inputOperacion = (op: string) => {
    if (display === 'Error') return
    setEvaluado(false)
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
    if (/^\-?[0-9.]+$/.test(display)) {
      setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display)
    } else {
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
      else if (e.key === 'Escape') {
        if (display !== '0' || historial) limpiar()
        else setAbierta(false)
      }
      else if (e.key === 'Backspace') borrar()
      else if (e.key === '%') porcentaje()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [abierta, display, evaluado, historial])

  const btnBase = 'h-12 rounded-xl font-bold text-base transition-all duration-100 active:scale-95 select-none focus:outline-none'
  const btnNum = cn(btnBase, 'bg-zinc-800 hover:bg-zinc-700/80 text-white border border-white/5')
  const btnOp = cn(btnBase, 'text-[#0a0a0a] transition-all')
  const btnEq = cn(btnBase, 'col-span-4 mt-0.5 text-[#0a0a0a]')
  const btnSpec = cn(btnBase, 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border border-white/5')

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={toggleAbierta}
        className={cn(
          'fixed bottom-[9rem] right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 border',
          abierta
            ? 'bg-zinc-800 text-white border-zinc-700'
            : 'bg-gradient-to-br from-[#E5D3B3] to-[#C9B497] text-[#0a0a0a] border-transparent shadow-[#E5D3B3]/10'
        )}
        title="Calculadora"
      >
        <Calculator size={20} />
      </button>

      {/* Calculadora flotante y draggable */}
      {abierta && (
        <div
          ref={calcRef}
          className="fixed z-50 select-none animate-fade-in"
          style={{
            bottom: `${220 - pos.y}px`,
            right: `${24 - pos.x}px`,
            cursor: isDragging ? 'grabbing' : 'auto',
          }}
        >
          <div
            className="w-64 rounded-2xl overflow-hidden shadow-2xl border"
            style={{ 
              background: '#161616',
              borderColor: 'rgba(229, 211, 179, 0.18)',
              backdropFilter: 'blur(15px)'
            }}
          >
            {/* Header draggable */}
            <div
              onMouseDown={onMouseDown}
              className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/60 cursor-grab active:cursor-grabbing border-b select-none"
              style={{ borderColor: 'rgba(229, 211, 179, 0.1)' }}
            >
              <div className="flex items-center gap-2">
                <Calculator size={14} className="text-[#E5D3B3]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-serif-elegant">
                  Calculadora
                </span>
              </div>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={toggleAbierta}
                className="text-neutral-500 hover:text-white transition-colors p-0.5 rounded focus:outline-none"
              >
                <X size={14} />
              </button>
            </div>

            {/* Display */}
            <div className="px-4 pt-4 pb-2 bg-zinc-950/80">
              <p className="text-right text-[10px] text-neutral-500 font-mono h-4 truncate">
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
            <div className="grid grid-cols-4 gap-1.5 p-3 bg-zinc-900/40">
              {/* Fila 1 */}
              <button onClick={limpiar} className={cn(btnSpec, 'col-span-2 text-xs')}>AC</button>
              <button onClick={borrar} className={cn(btnSpec, 'text-xs')}>⌫</button>
              <button 
                onClick={() => inputOperacion('÷')} 
                className={cn(btnOp, 'bg-zinc-800 text-[#E5D3B3] hover:bg-zinc-700/80 border border-white/5')}
              >
                ÷
              </button>

              {/* Fila 2 */}
              <button onClick={() => inputDigito('7')} className={btnNum}>7</button>
              <button onClick={() => inputDigito('8')} className={btnNum}>8</button>
              <button onClick={() => inputDigito('9')} className={btnNum}>9</button>
              <button 
                onClick={() => inputOperacion('×')} 
                className={cn(btnOp, 'bg-zinc-800 text-[#E5D3B3] hover:bg-zinc-700/80 border border-white/5')}
              >
                ×
              </button>

              {/* Fila 3 */}
              <button onClick={() => inputDigito('4')} className={btnNum}>4</button>
              <button onClick={() => inputDigito('5')} className={btnNum}>5</button>
              <button onClick={() => inputDigito('6')} className={btnNum}>6</button>
              <button 
                onClick={() => inputOperacion('-')} 
                className={cn(btnOp, 'bg-zinc-800 text-[#E5D3B3] hover:bg-zinc-700/80 border border-white/5')}
              >
                −
              </button>

              {/* Fila 4 */}
              <button onClick={() => inputDigito('1')} className={btnNum}>1</button>
              <button onClick={() => inputDigito('2')} className={btnNum}>2</button>
              <button onClick={() => inputDigito('3')} className={btnNum}>3</button>
              <button 
                onClick={() => inputOperacion('+')} 
                className={cn(btnOp, 'bg-zinc-800 text-[#E5D3B3] hover:bg-zinc-700/80 border border-white/5')}
              >
                +
              </button>

              {/* Fila 5 */}
              <button onClick={toggleSigno} className={btnSpec}>+/−</button>
              <button onClick={() => inputDigito('0')} className={btnNum}>0</button>
              <button onClick={inputDecimal} className={btnNum}>.</button>
              <button onClick={porcentaje} className={btnSpec}>%</button>

              {/* Igual */}
              <button 
                onClick={igual} 
                className={cn(btnEq, 'bg-gradient-to-br from-[#E5D3B3] to-[#C9B497]')}
              >
                =
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
