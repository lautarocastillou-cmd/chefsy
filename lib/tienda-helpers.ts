// ─────────────────────────────────────────────────────
// lib/tienda-helpers.ts
// Funciones helper puras de la tienda (sin estado React).
// Extraídas de page.tsx para reutilizarse en múltiples componentes.
// ─────────────────────────────────────────────────────

// --- DESCRIPCIONES E IMÁGENES COMPLEMENTARIAS DE PRODUCTOS ---
export const OBTENER_DETALLES_COMPLEMENTARIOS = (categoriaId: string, nombre: string) => {
  const nombreLimpio = nombre.toLowerCase()
  
  if (categoriaId === 'lomos-y-milas') {
    const desc = nombreLimpio.includes('común') ? 'Pan de lomo casero · medallón de carne · lechuga fresca · tomate seleccionado · mayonesa casera.' :
                 nombreLimpio.includes('especial') ? 'Pan de lomo casero · bife premium · jamón cocido · queso derretido · huevo frito · lechuga · tomate · aderezos.' :
                 nombreLimpio.includes('chefsy') ? 'Bife de lomo premium · queso cheddar fundido · panceta crujiente · cebolla caramelizada · aderezo especial de la casa.' :
                 nombreLimpio.includes('american') ? 'Bife de lomo tierno · cheddar premium · panceta ahumada · cebolla crujiente · aderezo barbacoa artesanal.' :
                 'Bife de lomo premium fundido con una fina y cremosa combinación de 4 quesos seleccionados.';
    return {
      desc,
      img: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'patys') {
    const desc = nombreLimpio.includes('común') ? 'Medallón artesanal a la parrilla · lechuga crujiente · rodajas de tomate fresco · mayonesa casera.' :
                 nombreLimpio.includes('especial') ? 'Medallón artesanal · jamón cocido · queso fundido · huevo frito · lechuga · tomate.' :
                 nombreLimpio.includes('chefsy') ? 'Doble medallón de carne · doble queso cheddar · panceta ahumada · cebolla caramelizada suave.' :
                 nombreLimpio.includes('american') ? 'Medallón artesanal · queso cheddar · panceta crujiente · aros de cebolla fritos · salsa barbacoa.' :
                 'Medallón de carne premium fundido con queso azul, provolone, muzzarella y parmesano.';
    return {
      desc,
      img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'pizzas') {
    const desc = nombreLimpio.includes('muzzarella') ? 'Masa de piedra artesanal · salsa de tomate natural · abundante muzzarella fundida · orégano · aceitunas verdes.' :
                 nombreLimpio.includes('especial') ? 'Salsa de tomate casera · muzzarella premium · jamón cocido · morrones asados al horno · aceitunas seleccionadas.' :
                 nombreLimpio.includes('napolitana') ? 'Masa a la piedra · muzzarella · rodajas de tomate natural · ajo fresco · perejil picado · aceite de oliva.' :
                 nombreLimpio.includes('fugazzeta') ? 'Abundante cebolla dulce caramelizada · queso muzzarella premium · orégano · aceite de oliva extra virgen.' :
                 nombreLimpio.includes('calabresa') ? 'Muzzarella fundida · rodajas de longaniza calabresa picante · morrones dulces · orégano.' :
                 'Combinación cremosa de muzzarella, roquefort premium, provolone rallado y parmesano gratinado al horno.';
    return {
      desc,
      img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'zapping') {
    return {
      desc: 'Sándwich tostado gigante en pan lactal especial · jamón cocido · queso fundido · manteca · aderezos clásicos de Chefsy.',
      img: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'choripan') {
    return {
      desc: 'Chorizo parrillero premium abierto al libro · pan de campo crujiente · salsa chimichurri artesanal o salsa criolla fresca.',
      img: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'mila-al-plato') {
    return {
      desc: 'Milanesa de ternera gigante frita al momento · acompañado con una porción abundante de papas fritas bastón crujientes.',
      img: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'tartas-xl') {
    return {
      desc: 'Tarta casera XL hojaldrada recién horneada · rellena generosamente con ingredientes frescos de la mejor calidad.',
      img: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'bebidas') {
    return {
      desc: 'Bebida helada de tu elección para acompañar tu menú de Chefsy de la mejor manera.',
      img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  if (categoriaId === 'promos') {
    return {
      desc: 'El combo ideal pensado para compartir en familia o con amigos al mejor precio del mercado.',
      img: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=600&q=80'
    }
  }
  
  return {
    desc: 'Exquisito plato elaborado al instante con ingredientes seleccionados y frescos de la cocina de Chefsy.',
    img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
  }
}

// --- DETALLES DE CATEGORÍAS (EMOJIS Y DESCRIPCIONES DE ENCABEZADO) ---
export const OBTENER_DETALLES_CATEGORIA = (catId: string) => {
  switch (catId) {
    case 'todos': 
      return { nombre: 'Nuestro Menú', subtitulo: 'Elegí, personalizá y pedí 🔥', icono: '🍔' }
    case 'lomos-y-milas': 
      return { nombre: 'Milas', subtitulo: 'Sándwiches gigantes con papas fritas', icono: '🥩' }
    case 'zapping': 
      return { nombre: 'Zapping', subtitulo: 'Tostados gigantes rellenos', icono: '🌯' }
    case 'patys': 
      return { nombre: 'Burgers / Patys', subtitulo: 'Con papas crujientes y aderezo especial', icono: '🍔' }
    case 'pizzas': 
      return { nombre: 'Pizzas', subtitulo: 'Masa casera cocida al horno de piedra', icono: '🍕' }
    case 'choripan': 
      return { nombre: 'Choripanes', subtitulo: 'Chorizos premium en pan de campo crocante', icono: '🌭' }
    case 'mila-al-plato': 
      return { nombre: 'Mila al Plato', subtitulo: 'Milanesas abundantes para compartir', icono: '🍽️' }
    case 'tartas-xl': 
      return { nombre: 'Tartas XL', subtitulo: 'Tartas saladas con masa de hojaldre casera', icono: '🥮' }
    case 'bebidas': 
      return { nombre: 'Bebidas', subtitulo: 'Refrescos, aguas y latas de cerveza heladas', icono: '🥤' }
    case 'promos': 
      return { nombre: 'Promos', subtitulo: 'Los combos perfectos para ahorrar y compartir', icono: '🎁' }
    case 'porciones-de-papas':
    case 'papas':
    case 'papas-fritas':
      return { nombre: 'Porciones de Papas', subtitulo: 'Crujientes y doradas, ideales para compartir', icono: '🍟' }
    default: 
      return { nombre: 'Menú Especial', subtitulo: 'Platos frescos de la cocina', icono: '👨‍🍳' }
  }
}
