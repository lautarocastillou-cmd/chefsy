// ─────────────────────────────────────────────────────
// middleware.ts
// Interceptor de rutas privadas de Chefsy.
// Se ejecuta en el Edge Runtime de Next.js antes de
// que cualquier página o API procese la petición.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose/jwt/verify'

const NOMBRE_COOKIE = 'chefsy-token'

// Rutas privadas y los roles que tienen acceso
const REGLAS_ACCESO = [
  { prefijo: '/dashboard',  roles: ['admin'] },
  { prefijo: '/pedidos',    roles: ['admin'] },
  { prefijo: '/productos',  roles: ['admin'] },
  { prefijo: '/clientes',   roles: ['admin'] },
  { prefijo: '/cierre',     roles: ['admin'] },
  { prefijo: '/nuevo-pedido', roles: ['admin'] },
  { prefijo: '/cadeteria',  roles: ['admin', 'cadete'] },
  { prefijo: '/api/admin',  roles: ['admin'] },
]

function obtenerClave() {
  const secreto = process.env.CHEFSY_JWT_SECRET
  if (!secreto) {
    // En desarrollo sin .env.local, usar fallback para no romper el build
    return new TextEncoder().encode('chefsy-local-secret-super-seguro-cambiar-en-produccion-2024')
  }
  return new TextEncoder().encode(secreto)
}

function rechazarAcceso(request: NextRequest, esPeticionAPI: boolean) {
  if (esPeticionAPI) {
    return new NextResponse(
      JSON.stringify({ error: 'No autenticado. Acceso denegado.' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
  // Redirigir al dashboard (donde el LoginPage se renderiza si no hay sesión)
  const url = request.nextUrl.clone()
  url.pathname = '/dashboard'
  return NextResponse.redirect(url)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Buscar si la ruta coincide con alguna regla de acceso privado
  const regla = REGLAS_ACCESO.find((r) => pathname.startsWith(r.prefijo))

  // Si no hay regla, es una ruta pública — dejar pasar
  if (!regla) {
    return NextResponse.next()
  }

  const esPeticionAPI = pathname.startsWith('/api/')
  const token = request.cookies.get(NOMBRE_COOKIE)?.value

  // Sin token → rechazar de inmediato
  if (!token) {
    return rechazarAcceso(request, esPeticionAPI)
  }

  try {
    // Verificar firma y expiración del JWT en el Edge Runtime
    const { payload } = await jwtVerify(token, obtenerClave())
    const rolUsuario = payload.rol as string

    // Verificar que el rol del usuario tiene permiso para esta ruta
    if (!regla.roles.includes(rolUsuario)) {
      return NextResponse.rewrite(new URL('/dashboard', request.url))
    }

    // Acceso concedido — continuar con la petición
    return NextResponse.next()
  } catch {
    // JWT inválido, manipulado o expirado
    return rechazarAcceso(request, esPeticionAPI)
  }
}

// Limitar la ejecución del middleware a las rutas que necesitan protección
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pedidos/:path*',
    '/productos/:path*',
    '/clientes/:path*',
    '/cierre/:path*',
    '/nuevo-pedido/:path*',
    '/cadeteria/:path*',
    '/api/admin/:path*',
  ],
}
