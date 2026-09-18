'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { reportarErrorManualmente } from '@/lib/logger'

interface Props {
  children: ReactNode
  pedidoId?: string
  cliente?: string
}

interface State {
  tieneError: boolean
  error: Error | null
}

export default class TarjetaPedidoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { tieneError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { tieneError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportarErrorManualmente(error, 'TarjetaPedido Crash', {
      pedidoId: this.props.pedidoId,
      cliente: this.props.cliente,
      componentStack: errorInfo.componentStack,
    })
  }

  handleReintentar = () => {
    this.setState({ tieneError: false, error: null })
  }

  render() {
    if (this.state.tieneError) {
      return (
        <div className="bg-red-950/40 border border-red-800/80 rounded-2xl p-4 text-white flex flex-col gap-2.5 shadow-sm">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
            <AlertTriangle size={18} className="shrink-0 text-red-400" />
            <span>Error en pedido #{this.props.pedidoId?.slice(0, 6) || '???'}</span>
          </div>
          <p className="text-xs text-red-200/80 line-clamp-2">
            {this.state.error?.message || 'Error inesperado al renderizar la tarjeta'}
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-red-900/40 mt-1">
            <span className="text-[11px] text-gray-400">
              Cliente: {this.props.cliente || 'Desconocido'}
            </span>
            <button
              onClick={this.handleReintentar}
              className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
              Reintentar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
