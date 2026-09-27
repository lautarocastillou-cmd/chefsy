'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { reportarErrorManualmente } from '@/lib/logger'

interface Props {
  children: ReactNode
  contexto?: string
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode)
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const contexto = this.props.contexto || 'ErrorBoundary Component'
    console.error(`[${contexto}] Error capturado:`, error, errorInfo)
    
    try {
      reportarErrorManualmente(error, contexto, {
        componentStack: errorInfo.componentStack?.slice(0, 1000)
      })
    } catch (_) {}
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          reset: this.handleReset
        })
      }

      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="w-full p-4 sm:p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-slate-200 flex flex-col items-center justify-center text-center my-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-3 text-rose-400">
            <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Algo no funcionó en este módulo
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
            {this.state.error.message || 'Se produjo un error inesperado al renderizar este componente.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
