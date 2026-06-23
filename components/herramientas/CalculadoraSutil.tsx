'use client'

import { useState, useEffect } from 'react'
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

export default function CalculadoraSutil() {
  const [abierta, setAbierta] = useState(false)
  const [display, setDisplay] = useState('0')
  const [historial, setHistorial] = useState('')
  const [evaluado, setEvaluado] = useState(false)

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

  const btnBase = 'h-10 rounded-lg font-bold text-sm transition-all duration-100 active:scale-95 select-none focus:outline-none'
  const btnNum = cn(btnBase, 'bg-zinc-800 hover:bg-zinc-700 text-white')
  const btnOp = cn(btnBase, 'bg-chefsy hover:bg-chefsy-500 text-white')
  const btnEq = cn(btnBase, 'bg-chefsy-400 hover:bg-chefsy-500 text-white')
  const btnSpec = cn(btnBase, 'bg-zinc-700 hover:bg-zinc-650 text-zinc-100')

  return (
    <>
      {/* Botón flotante sutil */}
      <button
        onClick={() => setAbierta(v => !v)}
        className="fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full shadow-md bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 text-white/80 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 backdrop-blur-sm"
        title="Calculadora"
      >
        <Calculator size={18} />
      </button>

      {/* Modal/Overlay de calculadora */}
      {abierta && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setAbierta(false)}
        >
          <div
            className="w-60 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden scale-100 active:scale-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900 border-b border-zinc-850">
              <div className="flex items-center gap-1.5">
                <Calculator size={13} className="text-chefsy-300" />
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Calculadora
                </span>
              </div>
              <button
                onClick={() => setAbierta(false)}
                className="text-zinc-500 hover:text-white transition-colors p-0.5 rounded focus:outline-none"
              >
                <X size={13} />
              </button>
            </div>

            {/* Display */}
            <div className="px-3.5 pt-3 pb-1.5 bg-zinc-900/50">
              <p className="text-right text-[10px] text-zinc-500 font-mono h-3.5 truncate">
                {historial || ' '}
              </p>
              <p className={cn(
                'text-right font-mono font-bold text-white truncate transition-all',
                display.length > 12 ? 'text-lg' : display.length > 9 ? 'text-xl' : 'text-2xl'
              )}>
                {display}
              </p>
            </div>

            {/* Botones */}
            <div className="grid grid-cols-4 gap-1 p-2.5 bg-zinc-950">
              {/* Fila 1 */}
              <button onClick={limpiar} className={cn(btnSpec, 'col-span-2 text-xs')}>AC</button>
              <button onClick={borrar} className={cn(btnSpec, 'text-xs')}>⌫</button>
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
              <button onClick={igual} className={cn(btnEq, 'col-span-4 mt-0.5')}>=</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
