'use client'

import React from 'react'
import ModalImportarCarpetaYDrive from './ModalImportarCarpetaYDrive'

interface ModalImportarGoogleDriveProps {
  abierto: boolean
  onCerrar: () => void
  onFotosImportadas: (urls: string[]) => void
  titulo?: string
  descripcion?: string
}

export default function ModalImportarGoogleDrive(props: ModalImportarGoogleDriveProps) {
  return <ModalImportarCarpetaYDrive {...props} />
}
