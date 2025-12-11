export type AppFonte = "Uber" | "99" | "Outros";

export interface Ride {
  id: string;
  dataISO: string;
  kmRodado: number;
  receitaBruta: number;
  app: AppFonte;
  obs?: string;

  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
}

export interface FuelToUp {
  id: string;
  dataISO: string;
  valor: number;
  litros?: number;
  tipo?: "gasolina" | "etanol" | "diesel";
}

export interface Settings {
  metaDiariaBruta: number; // 260
  metaMinRSKm: number; // 1.5
}

export interface RideTracking {
  id: string;
  startedAt: string;
  endedAt?: string;
  distanceMeters: number; // acumulado
  points: Array<{ lat: number; lon: number; t: number }>; // opcional salvar cada N pontos
}
