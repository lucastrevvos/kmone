export type GpsPoint = {
  lat: number;
  lon: number;
  accuracy?: number;
  speed?: number;
  t: number;
};

export interface IGpsPort {
  ensurePermissions(): Promise<"granted" | "denied">;
  startForeground(onPoint: (p: GpsPoint) => void): Promise<void>;
  stop(): Promise<void>;
}
