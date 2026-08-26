// ─────────────────────────────────────────────────────
// app/api/admin/gps-diagnostico/route.ts
// Endpoint de diagnóstico GPS en tiempo real para testing del sistema de cadetes.
// Solo accesible para administradores.
// ─────────────────────────────────────────────────────

import { NextResponse } from "next/server"
import { obtenerSupabaseAdmin } from "@/lib/supabase-admin"
import { obtenerSesion } from "@/lib/auth-server"

export async function GET() {
  const inicio = Date.now()

  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 401 })
    }

    const supabase = obtenerSupabaseAdmin()

    // 1. Datos de la tabla cadetes (GPS, ubicación, batería)
    const { data: cadetesData, error: cadetesError } = await supabase
      .from("cadetes")
      .select("id, lat, lng, gps_activo, bateria, updated_at, accuracy, speed, heading")

    if (cadetesError) throw cadetesError

    // 2. Nombres desde la tabla usuarios
    const { data: usuariosData, error: usuariosError } = await supabase
      .from("usuarios")
      .select("usuario, nombre")
      .eq("rol", "cadete")

    if (usuariosError) throw usuariosError

    // 3. Pedidos activos por cadete
    const { data: pedidosData, error: pedidosError } = await supabase
      .from("pedidos")
      .select("id, cliente, estado, cadete_id")
      .in("estado", ["en_cocina", "listo", "en_camino"])
      .eq("archivado", false)

    if (pedidosError) throw pedidosError

    const ahora = Date.now()
    const latenciaMs = ahora - inicio

    const cadetes = (cadetesData || []).map((c: any) => {
      const usuario = (usuariosData || []).find((u: any) => u.usuario === c.id)
      const pedidosActivos = (pedidosData || []).filter((p: any) => p.cadete_id === c.id)

      const updatedAt = c.updated_at ? new Date(c.updated_at).getTime() : null
      const segundosOffline = updatedAt ? Math.floor((ahora - updatedAt) / 1000) : null
      const gpsActivo = c.gps_activo === true && segundosOffline !== null && segundosOffline < 120

      return {
        id: c.id,
        nombre: usuario?.nombre || c.id,
        gps_activo: gpsActivo,
        gps_activo_db: c.gps_activo,
        lat: c.lat ?? null,
        lng: c.lng ?? null,
        accuracy: c.accuracy ?? null,
        speed: c.speed ?? null,
        heading: c.heading ?? null,
        bateria: c.bateria ?? null,
        updated_at: c.updated_at ?? null,
        segundos_offline: segundosOffline,
        pedidos_activos: pedidosActivos.map((p: any) => ({
          id: p.id,
          cliente: p.cliente,
          estado: p.estado,
        })),
      }
    })

    cadetes.sort((a, b) => {
      if (a.gps_activo && !b.gps_activo) return -1
      if (!a.gps_activo && b.gps_activo) return 1
      return a.nombre.localeCompare(b.nombre)
    })

    return NextResponse.json({
      cadetes,
      meta: {
        timestamp: new Date().toISOString(),
        latencia_ms: latenciaMs,
        total_cadetes: cadetes.length,
        cadetes_activos: cadetes.filter((c) => c.gps_activo).length,
        cadetes_offline: cadetes.filter((c) => !c.gps_activo).length,
      },
    })
  } catch (error) {
    console.error("[GPS Diagnóstico] Error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
