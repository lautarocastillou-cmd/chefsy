import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variables Supabase faltantes')
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const supabaseAdmin = obtenerSupabaseAdmin()

    // Listar fotos del bucket images
    const { data: files, error } = await supabaseAdmin.storage
      .from('images')
      .list('', {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error) {
      console.warn('[BancoFotos API] Error listando bucket:', error)
      return NextResponse.json({ fotos: [] })
    }

    const fotos = (files || [])
      .filter(f => f.name && !f.name.startsWith('.'))
      .map(f => {
        const { data } = supabaseAdmin.storage.from('images').getPublicUrl(f.name)
        return {
          nombre: f.name,
          url: data.publicUrl,
          createdAt: f.created_at,
          tamano: f.metadata?.size,
        }
      })

    return NextResponse.json({ fotos })
  } catch (err: any) {
    console.error('[BancoFotos API] Error:', err)
    return NextResponse.json({ fotos: [] })
  }
}

export async function DELETE(req: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { url, nombre } = await req.json()
    if (!url && !nombre) {
      return NextResponse.json({ error: 'URL o nombre requerido' }, { status: 400 })
    }

    const supabaseAdmin = obtenerSupabaseAdmin()

    // 1. Extraer nombre de archivo en Supabase Storage
    let fileName = nombre || ''
    if (!fileName && url) {
      if (url.includes('/storage/v1/object/public/images/')) {
        const parts = url.split('/storage/v1/object/public/images/')
        fileName = decodeURIComponent(parts[1] || '')
      } else {
        try {
          const urlObj = new URL(url)
          const pathSegments = urlObj.pathname.split('/')
          fileName = decodeURIComponent(pathSegments[pathSegments.length - 1] || '')
        } catch {
          fileName = ''
        }
      }
    }

    if (fileName) {
      const { error: errorStorage } = await supabaseAdmin.storage.from('images').remove([fileName])
      if (errorStorage) {
        console.warn('[BancoFotos DELETE] Error eliminando de storage:', errorStorage)
      }
    }

    // 2. Limpiar referencias de tienda_metadata si algún producto la tenía asignada
    if (url) {
      const { data: items } = await supabaseAdmin.from('tienda_metadata').select('*')
      if (items && items.length > 0) {
        for (const item of items) {
          if (!item.imagen_url) continue

          let fotos: string[] = []
          if (typeof item.imagen_url === 'string' && item.imagen_url.includes(' | ')) {
            fotos = item.imagen_url.split(' | ').map((u: string) => u.trim()).filter(Boolean)
          } else if (item.imagen_url.startsWith('[') && item.imagen_url.endsWith(']')) {
            try {
              fotos = JSON.parse(item.imagen_url)
            } catch {
              fotos = [item.imagen_url]
            }
          } else {
            fotos = [item.imagen_url]
          }

          if (Array.isArray(fotos) && fotos.includes(url)) {
            const nuevasFotos = fotos.filter((f: string) => f !== url)
            const nuevaImagenUrl = nuevasFotos.length === 0 ? null : nuevasFotos.join(' | ')

            await supabaseAdmin
              .from('tienda_metadata')
              .update({
                imagen_url: nuevaImagenUrl,
                updated_at: new Date().toISOString(),
              })
              .eq('producto_id', item.producto_id)
          }
        }
      }
    }

    return NextResponse.json({ ok: true, deleted: fileName || url })
  } catch (err: any) {
    console.error('[BancoFotos DELETE] Error:', err)
    return NextResponse.json({ error: err.message || 'Error al eliminar foto' }, { status: 500 })
  }
}
