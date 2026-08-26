'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { Pedido } from '@/tipos'
import { formatearPrecio } from '@/lib/utils'

export default function TicketImpresion() {
  const { id } = useParams()
  const { pedidos, estaListo } = usarPedidos()
  const [pedido, setPedido] = useState<Pedido | null>(null)

  useEffect(() => {
    if (estaListo && id) {
      const p = pedidos.find(p => p.id === id) || null
      setPedido(p)
      
      // Auto-trigger print when ready
      if (p) {
        setTimeout(() => {
          window.print()
        }, 500)
      }
    }
  }, [estaListo, id, pedidos])

  if (!estaListo) return null
  if (!pedido) return <div className="p-4 text-center">Pedido no encontrado</div>

  const metodoPago = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    mixto: 'Mixto',
    sin_especificar: 'Sin especificar'
  }[pedido.metodoPago || 'sin_especificar'] || 'Desconocido'

  return (
    <div className="w-full max-w-[300px] mx-auto text-black font-mono text-sm p-2 print:p-0 print:m-0 print:max-w-none">
      <style dangerouslySetInnerHTML={{__html: `
        @page { margin: 0 !important; size: auto; }
        @media print {
          html, body { margin: 0 !important; padding: 0 2px !important; width: 80mm; }
          nav, header, footer { display: none !important; }
        }
      `}} />
      
      {/* Encabezado */}
      <div className="text-center border-b border-black border-dashed pb-2 mb-2 pt-0">
        <h1 className="text-xl font-bold uppercase tracking-wider mb-0.5 mt-0 pt-0">CHEFSY</h1>
        <p className="text-xs">Ticket de Pedido</p>
        <p className="text-xs">{pedido.fecha} {pedido.hora}</p>
        <p className="text-sm font-bold mt-1">Pedido #{pedido.id.slice(0,5)}</p>
      </div>

      {/* Info Cliente */}
      <div className="border-b border-black border-dashed pb-3 mb-3 text-xs space-y-1">
        <p><span className="font-bold">Cliente:</span> {pedido.cliente}</p>
        <p><span className="font-bold">Tel:</span> {pedido.telefono}</p>
        <p><span className="font-bold">Entrega:</span> {pedido.tipoEntrega.toUpperCase()}</p>
        {pedido.direccion && (
          <p><span className="font-bold">Dir:</span> {pedido.direccion}</p>
        )}
      </div>

      {/* Detalle Productos */}
      <div className="border-b border-black border-dashed pb-3 mb-3 text-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="pb-1">Cant</th>
              <th className="pb-1">Detalle</th>
              <th className="pb-1 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {pedido.productos.map((prod) => (
              <tr key={prod.id}>
                <td className="py-1 align-top">{prod.cantidad}</td>
                <td className="py-1 align-top">{prod.nombre}</td>
                <td className="py-1 align-top text-right">{formatearPrecio(prod.precio * prod.cantidad)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="border-b border-black border-dashed pb-3 mb-3 space-y-1 text-xs">
        {pedido.costoEnvio !== undefined && (
          <>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatearPrecio(pedido.total - pedido.costoEnvio)}</span>
            </div>
            <div className="flex justify-between">
              <span>Envío {pedido.distanciaKm ? `(${pedido.distanciaKm} km)` : ''}:</span>
              <span>{formatearPrecio(pedido.costoEnvio)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL</span>
          <span>{formatearPrecio(pedido.total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Pago:</span>
          <span>{metodoPago}</span>
        </div>
      </div>

      {/* Observaciones */}
      {pedido.observaciones && (
        <div className="border-b border-black border-dashed pb-3 mb-3 text-xs">
          <span className="font-bold">NOTAS:</span>
          <p className="mt-1 uppercase">{pedido.observaciones}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs space-y-2 mt-4">
        <p className="font-bold">¡Gracias por su compra!</p>
        <p className="text-[10px]">Sistema Chefsy</p>
      </div>
    </div>
  )
}
