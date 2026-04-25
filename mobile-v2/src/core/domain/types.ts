export type AppFonte = "Uber" | "99" | "Outros";
export type RideMode = "app" | "tracking_livre";
export type FreeTrackingLabel = "Ocioso" | "Particular" | "Deslocamento";

export interface Ride {
  id: string;
  dataISO: string;
  kmRodado: number;
  receitaBruta: number;
  app: AppFonte;
  mode?: RideMode;
  trackingLabel?: FreeTrackingLabel;
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
  metaDiariaBruta: number;
  metaMinRSKm: number;
  radarMinValor: number;
  radarMinRSKm: number;
  radarMinRSHora: number;
}

export interface RideTracking {
  id: string;
  startedAt: string;
  endedAt?: string;
  distanceMeters: number;
  points: Array<{ lat: number; lon: number; t: number }>;
}
