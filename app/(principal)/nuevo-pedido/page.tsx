// ─────────────────────────────────────────────────────
// app/(principal)/nuevo-pedido/page.tsx
// Página para registrar un nuevo pedido.
// ─────────────────────────────────────────────────────

import FormularioPedido from '@/components/pedidos/FormularioPedido'

export default function PaginaNuevoPedido() {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        Elegí el tipo de pedido (delivery, retiro o consumo en local). Los campos marcados con{' '}
        <span className="text-red-400">*</span> son obligatorios. La dirección solo se pide en delivery.
      </p>
      <FormularioPedido />
    </div>
  )
}
