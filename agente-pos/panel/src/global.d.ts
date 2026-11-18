// Configuracion inyectada por el agente al servir /panel (ver index.html).
export interface ConfigAgente {
  token: string;
  puerto: string;
}

declare global {
  interface Window {
    __AGENTE_POS__?: ConfigAgente;
  }
}

export {};
