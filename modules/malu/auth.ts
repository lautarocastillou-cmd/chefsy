// ─────────────────────────────────────────────────────
// modules/malu/auth.ts
// Lógica de autenticación de Malú Clothing.
// Completamente independiente del auth de Chefsy.
// ─────────────────────────────────────────────────────

export const DURACION_SESION_HORAS = 24

export function esSesionMaluValida(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem('malu-sesion')
    if (!raw) return false
    const { expiraEn } = JSON.parse(raw)
    return Date.now() < expiraEn
  } catch {
    return false
  }
}

export function guardarSesionMalu(contrasena: string): void {
  const expiraEn = Date.now() + DURACION_SESION_HORAS * 3600 * 1000
  localStorage.setItem('malu-sesion', JSON.stringify({ autenticada: true, expiraEn }))
  // Guardar contraseña para las requests de API (se limpia al cerrar sesión)
  localStorage.setItem('malu-sesion-pass', contrasena)
}

export function cerrarSesionMalu(): void {
  localStorage.removeItem('malu-sesion')
  localStorage.removeItem('malu-sesion-pass')
}
