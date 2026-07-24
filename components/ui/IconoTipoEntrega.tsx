import React from 'react'
import { Bike, Store, Utensils } from 'lucide-react'
import { TipoEntrega } from '@/tipos'
import { cn } from '@/lib/utils'

interface Props {
  tipo: TipoEntrega
  className?: string
}

export default function IconoTipoEntrega({ tipo, className }: Props) {
  if (tipo === 'delivery') {
    return <Bike className={cn("w-4 h-4 shrink-0", className)} />
  }
  if (tipo === 'retiro') {
    return <Store className={cn("w-4 h-4 shrink-0", className)} />
  }
  if (tipo === 'consumo_local') {
    return <Utensils className={cn("w-4 h-4 shrink-0", className)} />
  }
  return <Bike className={cn("w-4 h-4 shrink-0", className)} />
}
