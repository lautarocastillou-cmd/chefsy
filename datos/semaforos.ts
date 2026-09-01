// ─────────────────────────────────────────────────────────────────────────────
// datos/semaforos.ts
// Red de semáforos urbanos e intersecciones principales de San Fernando del Valle
// de Catamarca para visualización minimalista en mapas en vivo.
// ─────────────────────────────────────────────────────────────────────────────

export interface SemaforoData {
  id: string
  nombre: string
  lat: number
  lng: number
}

export const SEMAFOROS_CATAMARCA: SemaforoData[] = [
  // ── Av. Belgrano ────────────────────────────────────────────────────────────
  { id: 'sem-belgrano-virgen', nombre: 'Av. Belgrano & Av. Virgen del Valle', lat: -28.4632, lng: -65.7925 },
  { id: 'sem-belgrano-salta', nombre: 'Av. Belgrano & Salta', lat: -28.4638, lng: -65.7876 },
  { id: 'sem-belgrano-sarmiento', nombre: 'Av. Belgrano & Sarmiento', lat: -28.4641, lng: -65.7848 },
  { id: 'sem-belgrano-rivadavia', nombre: 'Av. Belgrano & Rivadavia', lat: -28.4645, lng: -65.7818 },
  { id: 'sem-belgrano-alem', nombre: 'Av. Belgrano & Av. Alem', lat: -28.4651, lng: -65.7768 },
  { id: 'sem-belgrano-legisladores', nombre: 'Av. Belgrano & Av. Los Legisladores', lat: -28.4612, lng: -65.7702 },
  { id: 'sem-belgrano-correa', nombre: 'Av. Belgrano & Av. Gob. Ramón Correa', lat: -28.4658, lng: -65.7715 },

  // ── Av. Virgen del Valle ────────────────────────────────────────────────────
  { id: 'sem-virgen-ocampo', nombre: 'Av. Virgen del Valle & Av. Ocampo', lat: -28.4735, lng: -65.7938 },
  { id: 'sem-virgen-illia', nombre: 'Av. Virgen del Valle & Av. Illia', lat: -28.4705, lng: -65.7932 },
  { id: 'sem-virgen-chacabuco', nombre: 'Av. Virgen del Valle & Chacabuco', lat: -28.4678, lng: -65.7928 },
  { id: 'sem-virgen-mateluna', nombre: 'Av. Virgen del Valle & Mate de Luna', lat: -28.4655, lng: -65.7927 },
  { id: 'sem-virgen-mexico', nombre: 'Av. Virgen del Valle & Av. México', lat: -28.4552, lng: -65.7915 },
  { id: 'sem-virgen-terebintos', nombre: 'Av. Virgen del Valle & Av. Los Terebintos', lat: -28.4485, lng: -65.7905 },

  // ── Av. Alem ────────────────────────────────────────────────────────────────
  { id: 'sem-alem-guemes', nombre: 'Av. Alem & Av. Güemes', lat: -28.4752, lng: -65.7782 },
  { id: 'sem-alem-zurita', nombre: 'Av. Alem & Zurita', lat: -28.4722, lng: -65.7778 },
  { id: 'sem-alem-sanmartin', nombre: 'Av. Alem & San Martín', lat: -28.4695, lng: -65.7774 },
  { id: 'sem-alem-republica', nombre: 'Av. Alem & República', lat: -28.4672, lng: -65.7771 },
  { id: 'sem-alem-mexico', nombre: 'Av. Alem & Av. México', lat: -28.4565, lng: -65.7755 },

  // ── Av. Güemes ──────────────────────────────────────────────────────────────
  { id: 'sem-guemes-virgen', nombre: 'Av. Güemes & Av. Virgen del Valle', lat: -28.4768, lng: -65.7942 },
  { id: 'sem-guemes-salta', nombre: 'Av. Güemes & Salta', lat: -28.4760, lng: -65.7892 },
  { id: 'sem-guemes-rivadavia', nombre: 'Av. Güemes & Rivadavia', lat: -28.4756, lng: -65.7835 },
  { id: 'sem-guemes-yrigoyen', nombre: 'Av. Güemes & Av. Hipólito Yrigoyen', lat: -28.4748, lng: -65.7735 },
  { id: 'sem-guemes-rodriguez', nombre: 'Av. Güemes & Av. Gob. Rodríguez', lat: -28.4785, lng: -65.7865 },

  // ── Av. Ocampo & Av. Presidente Illia ───────────────────────────────────────
  { id: 'sem-ocampo-conesa', nombre: 'Av. Ocampo & Conesa', lat: -28.4742, lng: -65.7975 },
  { id: 'sem-ocampo-ahumada', nombre: 'Av. Ocampo & Av. Ahumada y Barros', lat: -28.4755, lng: -65.8010 },
  { id: 'sem-ocampo-latzina', nombre: 'Av. Ocampo & Av. Latzina', lat: -28.4768, lng: -65.8085 },
  { id: 'sem-illia-figueroa', nombre: 'Av. Illia & Av. Figueroa', lat: -28.4695, lng: -65.8020 },

  // ── Av. Presidente Castillo & Av. Acosta Villafañe ──────────────────────────
  { id: 'sem-castillo-sanmartin', nombre: 'Av. Pte. Castillo & Av. San Martín', lat: -28.4685, lng: -65.7652 },
  { id: 'sem-castillo-acosta', nombre: 'Av. Pte. Castillo & Av. Acosta Villafañe', lat: -28.4665, lng: -65.7602 },
  { id: 'sem-castillo-trespuentes', nombre: 'Av. Pte. Castillo & Tres Puentes', lat: -28.4625, lng: -65.7485 },
  { id: 'sem-acosta-alem', nombre: 'Av. Acosta Villafañe & Av. Alem', lat: -28.4692, lng: -65.7765 },
  { id: 'sem-acosta-sanmartin', nombre: 'Av. Acosta Villafañe & Av. San Martín', lat: -28.4680, lng: -65.7705 },

  // ── Microcentro ─────────────────────────────────────────────────────────────
  { id: 'sem-centro-republica-sarmiento', nombre: 'República & Sarmiento', lat: -28.4690, lng: -65.7850 },
  { id: 'sem-centro-sanmartin-rivadavia', nombre: 'San Martín & Rivadavia', lat: -28.4705, lng: -65.7820 },
  { id: 'sem-centro-chacabuco-salta', nombre: 'Chacabuco & Salta', lat: -28.4675, lng: -65.7885 },
  { id: 'sem-centro-prado-maipu', nombre: 'Prado & Maipú', lat: -28.4715, lng: -65.7860 },
  { id: 'sem-centro-mateluna-junin', nombre: 'Mate de Luna & Junín', lat: -28.4662, lng: -65.7870 },

  // ── Zona Norte & Choya ──────────────────────────────────────────────────────
  { id: 'sem-norte-legisladores-poncho', nombre: 'Av. Los Legisladores & Fiesta del Poncho', lat: -28.4575, lng: -65.7685 },
  { id: 'sem-norte-mexico-choya', nombre: 'Av. México & Av. Choya', lat: -28.4550, lng: -65.7830 },
  { id: 'sem-norte-terebintos-choya', nombre: 'Av. Los Terebintos & Av. Choya', lat: -28.4475, lng: -65.7825 },
]
