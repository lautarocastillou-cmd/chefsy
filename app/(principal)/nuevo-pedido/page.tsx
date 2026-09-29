'use client'

// ─────────────────────────────────────────────────────
// app/(principal)/nuevo-pedido/page.tsx
// Redirecciona a /pedidos abriendo el modal flotante oficial.
// ─────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usarPedidos } from '@/contexto/PedidosContexto'

export default function PaginaNuevoPedido() {
  const router = useRouter()
  const { abrirModalNuevoPedido } = usarPedidos()

  useEffect(() => {
    abrirModalNuevoPedido()
    router.replace('/pedidos')
  }, [abrirModalNuevoPedido, router])

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-chefsy border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
