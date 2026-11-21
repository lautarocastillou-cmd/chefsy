export interface EstadoDestinoDirecto {
  estado: string
  esProximaEntrega: boolean
  gpsActivo: boolean
  tieneCoordenadasCadete: boolean
}

export function debeMostrarDestinoDirecto(estado: EstadoDestinoDirecto): boolean {
  return estado.estado === 'en_camino'
    && estado.esProximaEntrega
    && estado.gpsActivo
    && estado.tieneCoordenadasCadete
}
