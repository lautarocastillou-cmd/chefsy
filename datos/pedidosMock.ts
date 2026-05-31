// ─────────────────────────────────────────────────────
// datos/pedidosMock.ts
// Datos de prueba para desarrollo. Reemplazar con
// llamadas a API cuando se integre el backend.
// ─────────────────────────────────────────────────────

import { Pedido } from '@/tipos'

export const pedidosMock: Pedido[] = [
  {
    id: 'ped-001',
    cliente: 'María González',
    telefono: '381-555-0101',
    tipoEntrega: 'delivery',
    direccion: 'Rivadavia 540, San Fernando del Valle',
    productos: [
      { id: 'prod-1', nombre: 'Pizza Muzzarella', cantidad: 1, precio: 2500 },
      { id: 'prod-2', nombre: 'Coca Cola 1.5L', cantidad: 2, precio: 800 },
    ],
    total: 4100,
    estado: 'en_cocina',
    metodoPago: 'efectivo',
    observaciones: 'Sin cebolla por favor',
    hora: '19:30',
    fecha: '2024-01-15',
  },
  {
    id: 'ped-002',
    cliente: 'Carlos Rodríguez',
    telefono: '381-555-0202',
    tipoEntrega: 'delivery',
    direccion: 'Sarmiento 1200, Capital',
    productos: [
      { id: 'prod-3', nombre: 'Empanadas x6', cantidad: 1, precio: 1800 },
      { id: 'prod-4', nombre: 'Ensalada César', cantidad: 1, precio: 1200 },
    ],
    total: 3000,
    estado: 'entregado',
    metodoPago: 'transferencia',
    hora: '19:15',
    fecha: '2024-01-15',
  },
  {
    id: 'ped-003',
    cliente: 'Ana Martínez',
    telefono: '381-555-0303',
    tipoEntrega: 'retiro',
    direccion: '',
    productos: [
      { id: 'prod-5', nombre: 'Milanesa Napolitana', cantidad: 2, precio: 3000 },
      { id: 'prod-6', nombre: 'Papas Fritas', cantidad: 2, precio: 900 },
    ],
    total: 7800,
    estado: 'nuevo',
    metodoPago: 'tarjeta',
    observaciones: 'Timbre 3B',
    hora: '19:45',
    fecha: '2024-01-15',
  },
  {
    id: 'ped-004',
    cliente: 'José López',
    telefono: '381-555-0404',
    tipoEntrega: 'consumo_local',
    direccion: '',
    productos: [
      { id: 'prod-7', nombre: 'Hamburguesa Completa', cantidad: 3, precio: 2200 },
      { id: 'prod-8', nombre: 'Agua Mineral', cantidad: 3, precio: 500 },
    ],
    total: 8100,
    estado: 'listo',
    metodoPago: 'efectivo',
    hora: '19:00',
    fecha: '2024-01-15',
  },
  {
    id: 'ped-005',
    cliente: 'Laura Fernández',
    telefono: '381-555-0505',
    tipoEntrega: 'delivery',
    direccion: 'Tucumán 780, Piso 2',
    productos: [
      { id: 'prod-9', nombre: 'Pizza Especial', cantidad: 1, precio: 3200 },
    ],
    total: 3200,
    estado: 'entregado',
    metodoPago: 'tarjeta',
    hora: '18:30',
    fecha: '2024-01-15',
  },
  {
    id: 'ped-006',
    cliente: 'Roberto Díaz',
    telefono: '381-555-0606',
    tipoEntrega: 'delivery',
    direccion: 'Belgrano 120, Piso 1 Depto A',
    productos: [
      { id: 'prod-10', nombre: 'Lomito Completo', cantidad: 2, precio: 2800 },
      { id: 'prod-11', nombre: 'Jugo de Naranja', cantidad: 2, precio: 700 },
    ],
    total: 7000,
    estado: 'cancelado',
    metodoPago: 'efectivo',
    observaciones: 'Cliente no contestó el teléfono',
    hora: '18:00',
    fecha: '2024-01-15',
  },
]
