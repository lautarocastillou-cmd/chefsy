// ─────────────────────────────────────────────────────
// tipos/modulos-externos.d.ts
// Declaraciones de tipos para librerías dinámicas o externas
// ─────────────────────────────────────────────────────

declare module 'heic-convert' {
  interface HeicConvertOptions {
    buffer: Buffer | Uint8Array
    format: 'JPEG' | 'PNG'
    quality?: number
  }
  function heicConvert(options: HeicConvertOptions): Promise<Buffer>
  export default heicConvert
}

declare module '@imgly/background-removal' {
  export function removeBackground(
    image: string | Blob | ImageData | ArrayBuffer | Uint8Array,
    configuration?: Record<string, unknown>
  ): Promise<Blob>
}
