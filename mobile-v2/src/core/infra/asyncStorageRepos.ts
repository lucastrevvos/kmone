import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Ride } from "@core/domain/types";

/* =============== SETTINGS =============== */
export type Settings = {
  metaDiariaBruta: number;
  metaMinRSKm: number;
};

const SETTINGS_KEY = "kmone:settings";

function makeSettingsRepo() {
  return {
    async get(): Promise<Settings | null> {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed.metaDiariaBruta === "number" &&
          typeof parsed.metaMinRSKm === "number"
        ) {
          return parsed as Settings;
        }
      } catch {}
      return null;
    },
    async save(settings: Settings): Promise<void> {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    },
    async patch(partial: Partial<Settings>): Promise<void> {
      const current = await this.get();
      const next: Settings = {
        metaDiariaBruta: current?.metaDiariaBruta ?? 0,
        metaMinRSKm: current?.metaMinRSKm ?? 1,
        ...partial,
      };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    },
  };
}

export const settingsRepo = makeSettingsRepo();

/* =============== RIDE =============== */

const RIDE_PREFIX = "kmone:rides:";

function rideKeyFor(dateISO: string) {
  const clean = (dateISO || "").replace(/[^\d-]/g, "");
  return `${RIDE_PREFIX}${clean}`;
}

async function readRideDay(dateISO: string): Promise<Ride[]> {
  const key = rideKeyFor(dateISO);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Ride[];
    if (parsed && Array.isArray(parsed.items)) return parsed.items as Ride[];
    if (parsed && parsed.id) return [parsed as Ride];
  } catch (e) {
    console.warn("[RideRepo.read] JSON inválido para", key, e);
  }
  return [];
}

async function writeRideDay(dateISO: string, list: Ride[]) {
  const key = rideKeyFor(dateISO);
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

function makeRideRepo() {
  return {
    async create(ride: Ride): Promise<void> {
      const list = await readRideDay(ride.dataISO);
      const idx = list.findIndex((r) => r.id === ride.id);
      if (idx >= 0) list[idx] = ride;
      else list.push(ride);
      await writeRideDay(ride.dataISO, list);
    },
    async update(ride: Ride): Promise<void> {
      const list = await readRideDay(ride.dataISO);
      const idx = list.findIndex((r) => r.id === ride.id);
      if (idx >= 0) list[idx] = ride;
      await writeRideDay(ride.dataISO, list);
    },
    async remove(id: string, dateISO: string): Promise<void> {
      const key = rideKeyFor(dateISO);
      const raw = await AsyncStorage.getItem(key);
      if (!raw) {
        console.log("[RideRepo.remove] nada salvo para", key);
        return;
      }
      let list: Ride[] = [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed as Ride[];
        else if (parsed && Array.isArray(parsed.items))
          list = parsed.items as Ride[];
      } catch (e) {
        console.warn("[RideRepo.remove] JSON inválido para", key, e);
      }

      const before = list.length;
      const next = list.filter((r) => r.id !== id);
      await AsyncStorage.setItem(key, JSON.stringify(next));
      console.log(
        "[RideRepo.remove] key:",
        key,
        "| id:",
        id,
        "| antes:",
        before,
        "| depois:",
        next.length
      );
    },
    async listByDate(dateISO: string): Promise<Ride[]> {
      return readRideDay(dateISO);
    },
  };
}

/** 👉 SINGLETONS para importar em TODO lugar */
export const rideRepo = makeRideRepo();

/* =============== FUEL (opcional) =============== */
export type Fuel = {
  id: string;
  dataISO: string;
  valor: number;
  litros?: number;
  tipo?: "gasolina" | "etanol" | "diesel";
};

const FUEL_PREFIX = "kmone:fuels:";

function fuelKeyFor(dateISO: string) {
  const clean = (dateISO || "").replace(/[^\d-]/g, "");
  return `${FUEL_PREFIX}${clean}`;
}

async function readFuelDay(dateISO: string): Promise<Fuel[]> {
  const key = fuelKeyFor(dateISO);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Fuel[];
    if (parsed && Array.isArray(parsed.items)) return parsed.items as Fuel[];
    if (parsed && parsed.id) return [parsed as Fuel];
  } catch {}
  return [];
}

async function writeFuelDay(dateISO: string, list: Fuel[]) {
  const key = fuelKeyFor(dateISO);
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

function makeFuelRepo() {
  return {
    async create(fuel: Fuel): Promise<void> {
      const list = await readFuelDay(fuel.dataISO);
      const idx = list.findIndex((f) => f.id === fuel.id);
      if (idx >= 0) list[idx] = fuel;
      else list.push(fuel);
      await writeFuelDay(fuel.dataISO, list);
    },
    async update(fuel: Fuel): Promise<void> {
      const list = await readFuelDay(fuel.dataISO);
      const idx = list.findIndex((f) => f.id === fuel.id);
      if (idx >= 0) list[idx] = fuel;
      await writeFuelDay(fuel.dataISO, list);
    },
    async remove(id: string, dateISO: string): Promise<void> {
      const list = await readFuelDay(dateISO);
      await writeFuelDay(
        dateISO,
        list.filter((f) => f.id !== id)
      );
    },
    async listByDate(dateISO: string): Promise<Fuel[]> {
      return readFuelDay(dateISO);
    },
  };
}

export const fuelRepo = makeFuelRepo();
