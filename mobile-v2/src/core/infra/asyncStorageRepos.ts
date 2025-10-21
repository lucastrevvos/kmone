import AsyncStorage from "@react-native-async-storage/async-storage";

import { FuelToUp, Ride, Settings } from "@core/domain/types";
import { IFuelRepo, IRideRepo, ISettingsRepo } from "@core/ports/repos";

const K = {
  rides: (d: string) => `kmone:rides:${d}`,
  fuels: (d: string) => `kmone:fuels:${d}`,
  settings: "kmone:settings",
};

async function read<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

async function write<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const AsyncRideRepo = (): IRideRepo => ({
  async create(ride) {
    const key = K.rides(ride.dataISO);
    const list = await read<Ride[]>(key, []);

    list.push(ride);
    await write(key, list);
  },
  async listByDate(dateISO: string) {
    return read<Ride[]>(K.rides(dateISO), []);
  },
});

export const AsyncFuelRepo = (): IFuelRepo => ({
  async create(t) {
    const key = K.fuels(t.dataISO);
    const list = await read<FuelToUp[]>(key, []);
    list.push(t);
    await write(key, list);
  },

  async listByDate(dateISO) {
    return read<FuelToUp[]>(K.fuels(dateISO), []);
  },
});

export const AsyncSettingsRepo = (): ISettingsRepo => ({
  async get() {
    return read<Settings | null>(K.settings, null);
  },
  async save(s) {
    await write(K.settings, s);
  },
});
