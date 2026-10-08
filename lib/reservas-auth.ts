import { SignJWT, jwtVerify } from 'jose'
import { timingSafeEqual } from 'node:crypto'

const ISSUER = 'chefsy-reservas'
const AUDIENCE = 'malu-reservas'
const TOKEN_TTL = '30d'

function secret() {
  const value = process.env.RESERVAS_SESSION_SECRET
  if (!value || value.length < 32) throw new Error('RESERVAS_SESSION_SECRET debe tener al menos 32 caracteres.')
  return new TextEncoder().encode(value)
}

export function validarPin(pin: unknown): boolean {
  const expected = process.env.RESERVAS_PIN?.trim()
  const received = typeof pin === 'string' ? pin.trim() : ''
  if (!expected || !/^\d{6}$/.test(expected) || !/^\d{6}$/.test(received)) return false
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected))
}

export async function crearTokenReservas() {
  return new SignJWT({ app: 'malu-reservas' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret())
}

export async function tokenReservasValido(token: string | null | undefined) {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: AUDIENCE })
    return payload.app === 'malu-reservas'
  } catch {
    return false
  }
}

export function corsHeaders(origin: string | null) {
  const allowed = process.env.RESERVAS_ALLOWED_ORIGIN
  const headers = new Headers({ Vary: 'Origin', 'Cache-Control': 'no-store' })
  if (origin && allowed && origin === allowed) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    headers.set('Access-Control-Max-Age', '600')
  }
  return headers
}

export async function autorizarReservas(request: Request) {
  return tokenReservasValido(request.headers.get('authorization')?.replace(/^Bearer\s+/i, ''))
}
