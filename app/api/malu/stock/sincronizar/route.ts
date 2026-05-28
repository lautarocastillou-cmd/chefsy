// ─────────────────────────────────────────────────────
// app/api/malu/stock/sincronizar/route.ts
// Endpoint para scraping y sincronización de stock
// desde la tienda pública de Empretienda de la hermana.
// Soporta paginación automática y extracción de variantes.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'
import crypto from 'crypto'

function obtenerAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variables de entorno Supabase no configuradas')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function POST(request: Request) {
  try {
    // 1. Validar autenticación
    const auth = request.headers.get('x-malu-auth')
    if (auth !== process.env.MALU_PASS) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { url } = await request.json()
    if (!url || !url.trim()) {
      return NextResponse.json({ error: 'URL requerida.' }, { status: 400 })
    }

    const targetUrl = url.trim()
    console.log(`[Scraper Malú] Iniciando scraping de sesión en: ${targetUrl}`)

    // 2. Fetch de la página principal para obtener cookies de sesión y CSRF Token
    const pageRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      next: { revalidate: 0 }
    })

    if (!pageRes.ok) {
      return NextResponse.json({ error: `No se pudo acceder a la tienda (Código HTTP ${pageRes.status}).` }, { status: 400 })
    }

    // Extraer cookies de manera robusta
    const cookiesArr = pageRes.headers.getSetCookie() || []
    const cookies = cookiesArr.map(c => c.split(';')[0].trim()).join('; ')

    const html = await pageRes.text()
    const $ = cheerio.load(html)
    const csrfToken = $('meta[name="csrf-token"]').attr('content') || ''

    if (!csrfToken) {
      console.warn('[Scraper Malú] No se encontró meta csrf-token. Intentando continuar de todos modos.')
    }

    // 3. Extraer mapeo de categorías desde el JSON inline del HTML
    const categoryMap = new Map<number, string>()
    const catMatches = html.match(/\[\s*\{\s*"idCategorias"\s*:[\s\S]*?\}\s*\]/g)
    if (catMatches) {
      for (const match of catMatches) {
        try {
          const arr = JSON.parse(match)
          if (arr && Array.isArray(arr) && arr.length > 0 && arr[0].idCategorias) {
            arr.forEach(cat => {
              categoryMap.set(cat.idCategorias, cat.c_nombre)
            })
          }
        } catch {
          // Ignorar fallos de parseo en otros bloques JSON
        }
      }
    }
    console.log(`[Scraper Malú] Mapeo de categorías cargado: ${categoryMap.size} categorías encontradas.`)

    // Determinar la base del endpoint API v4
    // Ej: https://malucta.empretienda.com.ar/productos -> https://malucta.empretienda.com.ar
    let apiBase = targetUrl
    try {
      const parsedUrl = new URL(targetUrl)
      apiBase = parsedUrl.origin
    } catch {
      // Usar targetUrl como fallback
    }

    const productosScrapeados: Array<{
      external_id: string
      nombre: string
      precio: number
      stock: number
      imagen_url: string | null
      categoria: string | null
    }> = []

    let page = 0
    let hasMore = true
    const maxPages = 50 // Límite de seguridad para evitar loops infinitos
    const CONCURRENCY = 5

    // 4. Bucle paginado usando la API interna de Empretienda (v4/product) con la sesión activa (en paralelo)
    while (hasMore && page < maxPages) {
      const pageBatch: number[] = []
      for (let i = 0; i < CONCURRENCY; i++) {
        if (page + i < maxPages) {
          pageBatch.push(page + i)
        }
      }

      console.log(`[Scraper Malú] Obteniendo páginas ${pageBatch.join(', ')} en paralelo...`)

      const fetchPromises = pageBatch.map(pNum => {
        const apiEndpoint = `${apiBase}/v4/product?filter_page=${pNum}&filter_order=4`
        return fetch(apiEndpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'X-CSRF-TOKEN': csrfToken,
            'Cookie': cookies,
            'Referer': targetUrl
          },
          next: { revalidate: 0 }
        }).then(async res => {
          if (!res.ok) {
            return { page: pNum, ok: false, error: `Status ${res.status}`, data: [] }
          }
          const resData = await res.json()
          return { page: pNum, ok: true, error: null, data: resData.data || [] }
        }).catch(err => {
          return { page: pNum, ok: false, error: err.message || 'Error de red', data: [] }
        })
      })

      const results = await Promise.all(fetchPromises)
      results.sort((a, b) => a.page - b.page)

      for (const res of results) {
        if (!res.ok) {
          console.error(`[Scraper Malú] Error al pedir la página ${res.page} (${res.error})`)
          hasMore = false
          break
        }

        const productsList = res.data
        console.log(`[Scraper Malú] Página ${res.page} retornó ${productsList.length} productos.`)

        if (productsList.length === 0) {
          hasMore = false
          break
        }

        // Procesar productos de esta página
        productsList.forEach((p: any) => {
          // Calcular stock acumulando todas las variantes
          let stockSum = 0
          if (p.stock && Array.isArray(p.stock)) {
            stockSum = p.stock.reduce((sum: number, item: any) => sum + (item.s_cantidad || 0), 0)
          }

          // Obtener precio (usar precio de oferta si está activo)
          const price = p.p_oferta === 1 && p.p_precio_oferta > 0 ? p.p_precio_oferta : p.p_precio

          // Obtener imagen
          let imagen_url: string | null = null
          if (p.imagenes && Array.isArray(p.imagenes) && p.imagenes.length > 0) {
            const iLink = p.imagenes[0].i_link
            if (iLink) {
              imagen_url = iLink.startsWith('http') 
                ? iLink 
                : `https://d22fxaf9t8d39k.cloudfront.net/${iLink}`
            }
          }

          // Obtener categoría
          let categoryName = categoryMap.get(p.Categorias_idCategorias) || 'General'
          // Formatear/Capitalizar categoría
          categoryName = categoryName.split('-')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ')

          productosScrapeados.push({
            external_id: p.p_link || String(p.idProductos),
            nombre: p.p_nombre.trim(),
            precio: price,
            stock: stockSum,
            imagen_url,
            categoria: categoryName,
          })
        })

        // Si retornó menos de 12 elementos, es la última página del catálogo
        if (productsList.length < 12) {
          hasMore = false
          break
        }
      }

      if (!hasMore) {
        break
      }

      page += CONCURRENCY
    }

    console.log(`[Scraper Malú] Scraping completo. Total de productos extraídos de la web: ${productosScrapeados.length}`)

    if (productosScrapeados.length === 0) {
      return NextResponse.json({ error: 'No se encontraron productos en el catálogo de Empretienda.' }, { status: 400 })
    }

    // 5. Mapear y Sincronizar en la Base de Datos
    const supabase = obtenerAdmin()
    
    // Obtener productos locales actuales para comparar
    const { data: locales, error: dbError } = await supabase.from('malu_productos').select('*')
    if (dbError) throw dbError

    const mapaLocales = new Map<string, any>() // external_id -> producto local
    const mapaNombres = new Map<string, any>() // nombre normalizado -> producto local
    
    locales?.forEach(p => {
      if (p.external_id) {
        mapaLocales.set(p.external_id, p)
      }
      mapaNombres.set(p.nombre.toLowerCase().trim(), p)
    })

    const productosParaUpsert: any[] = []
    let creados = 0
    let actualizados = 0

    for (const scrapeado of productosScrapeados) {
      const existente = mapaLocales.get(scrapeado.external_id) || mapaNombres.get(scrapeado.nombre.toLowerCase().trim())

      if (existente) {
        // En la sincronización completa del stock, guardamos el stock numérico exacto de la web.
        productosParaUpsert.push({
          id: existente.id,
          codigo: existente.codigo || null,
          nombre: scrapeado.nombre,
          descripcion: existente.descripcion || 'Importado de Empretienda',
          precio: scrapeado.precio,
          stock: scrapeado.stock,
          imagen_url: existente.imagen_url || scrapeado.imagen_url,
          categoria: (existente.categoria && existente.categoria !== 'General') ? existente.categoria : scrapeado.categoria,
          talle: existente.talle || 'Único',
          color: existente.color || 'N/A',
          external_id: scrapeado.external_id || existente.external_id,
          activo: true
        })
        actualizados++
      } else {
        // Crear nuevo producto con un UUID generado localmente
        productosParaUpsert.push({
          id: crypto.randomUUID(),
          codigo: null,
          nombre: scrapeado.nombre,
          descripcion: 'Importado de Empretienda',
          precio: scrapeado.precio,
          stock: scrapeado.stock,
          imagen_url: scrapeado.imagen_url,
          categoria: scrapeado.categoria,
          talle: 'Único',
          color: 'N/A',
          external_id: scrapeado.external_id,
          activo: true
        })
        creados++
      }
    }

    console.log(`[Scraper Malú] Ejecutando batch upsert de ${productosParaUpsert.length} productos en la base de datos...`)
    const { error: upsertErr } = await supabase
      .from('malu_productos')
      .upsert(productosParaUpsert)

    if (upsertErr) {
      console.error('[Scraper Malú] Error en batch upsert:', upsertErr)
      throw upsertErr
    }

    return NextResponse.json({
      ok: true,
      mensaje: `Sincronización exitosa. Se importó todo el catálogo.`,
      detalles: { creados, actualizados, total: productosScrapeados.length }
    })

  } catch (e: any) {
    console.error('[API Scraper Malú] Error:', e)
    return NextResponse.json({ error: e.message || 'Error interno del servidor.' }, { status: 500 })
  }
}
