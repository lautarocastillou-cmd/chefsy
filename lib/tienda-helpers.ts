// ─────────────────────────────────────────────────────
// lib/tienda-helpers.ts
// Funciones helper puras de la tienda (sin estado React).
// Extraídas de page.tsx para reutilizarse en múltiples componentes.
// ─────────────────────────────────────────────────────

// --- DESCRIPCIONES E IMÁGENES COMPLEMENTARIAS DE PRODUCTOS ---
export const OBTENER_DETALLES_COMPLEMENTARIOS = (categoriaId: string, nombre: string) => {
  const nombreLimpio = nombre.toLowerCase()
  
  if (categoriaId === 'lomos-y-milas') {
    return {
      desc: '',
      img: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'patys') {
    return {
      desc: '',
      img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'pizzas') {
    return {
      desc: '',
      img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'zapping') {
    return {
      desc: '',
      img: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'choripan') {
    return {
      desc: '',
      img: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'mila-al-plato') {
    return {
      desc: '',
      img: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'tartas-xl') {
    return {
      desc: '',
      img: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'bebidas') {
    return {
      desc: '',
      img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'promos') {
    return {
      desc: '',
      img: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  return {
    desc: '',
    img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
  }
}

// --- DETALLES DE CATEGORÍAS (EMOJIS Y DESCRIPCIONES DE ENCABEZADO) ---
export const OBTENER_DETALLES_CATEGORIA = (catId: string) => {
  switch (catId) {
    case 'todos': 
      return { nombre: 'Nuestro Menú', subtitulo: 'Elegí, personalizá y pedí 🔥', icono: '/burger-icon.png' }
    case 'lomos':
    case 'milas':
    case 'cat-1780506096615':
      return { nombre: 'Lomos', subtitulo: 'Sándwiches gigantes con papas fritas', icono: '/lomos-icon.png' }
    case 'lomos-y-milas': 
      return { nombre: 'Milas', subtitulo: 'Milanesas completas con papas fritas', icono: '/lomos-icon.png' }
    case 'zapping': 
      return { nombre: 'Zapping', subtitulo: 'Tostados gigantes rellenos', icono: '/zapping-icon.png' }
    case 'patys': 
    case 'cat-1781570568487':
      return { nombre: 'Burgers / Patys', subtitulo: 'Con papas crujientes y aderezo especial', icono: '/patys-icon.png' }
    case 'pizzas': 
      return { nombre: 'Pizzas', subtitulo: 'Masa casera cocida al horno de piedra', icono: '/pizzas-icon.png' }
    case 'choripan': 
      return { nombre: 'Choripanes', subtitulo: 'Chorizos premium en pan de campo crocante', icono: '/choripan-icon.png' }
    case 'mila-al-plato': 
      return { nombre: 'Mila al Plato', subtitulo: 'Milanesas abundantes para compartir', icono: '/mila-plato-icon.png' }
    case 'tartas-xl': 
      return { nombre: 'Tartas XL', subtitulo: 'Tartas saladas con masa de hojaldre casera', icono: '/tartas-icon.png' }
    case 'bebidas': 
      return { nombre: 'Bebidas', subtitulo: 'Refrescos, aguas y latas de cerveza heladas', icono: '/bebidas-icon.png' }
    case 'promos': 
      return { nombre: 'Promos', subtitulo: 'Los combos perfectos para ahorrar y compartir', icono: '/promos-icon.png' }
    case 'porciones-de-papas':
    case 'porciones_de_papas':
    case 'papas':
    case 'papas-fritas':
    case 'papas_fritas':
    case 'cat-1781574714354':
      return { nombre: 'Porciones de Papas', subtitulo: 'Crujientes y doradas, ideales para compartir', icono: '/papas-icon.png' }
    default: 
      return { nombre: 'Menú Especial', subtitulo: 'Platos frescos de la cocina', icono: '/especial-icon.png' }
  }
}
