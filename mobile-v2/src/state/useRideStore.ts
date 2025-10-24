import { Ride } from "@core/domain/types";
import { rideRepo } from "@core/infra/asyncStorageRepos";
import { createRide } from "@core/usecases/createRide";
import { listRidesByDate } from "@core/usecases/listRidesByDate";
import { todayLocalISO } from "@utils/format";
import { create } from "zustand";

type S = {
  dateISO: string;
  rides: Ride[];
  loading: boolean;

  // NOVO
  lastDeleted: Ride | null;
  removeRide: (ride: Ride) => Promise<void>;
  undoLastDelete: () => Promise<void>;

  loadToday(): Promise<void>;
  addRide(input: Omit<Ride, "id" | "dataISO">): Promise<void>;
};

export const useRideStore = create<S>((set, get) => ({
  dateISO: todayLocalISO(),
  rides: [],
  loading: false,

  lastDeleted: null,

  async loadToday() {
    set({ loading: true });
    const usecase = listRidesByDate(rideRepo);
    const rides = await usecase(get().dateISO);
    set({ rides, loading: false });
  },

  async addRide(input) {
    const id = Math.random().toString(36).slice(2);
    const dataISO = get().dateISO;
    await createRide(rideRepo)({ id, ...input, dataISO });
    await get().loadToday();
  },

  // NOVO: remove + guarda p/ desfazer
  async removeRide(ride) {
    set({ loading: true });
    try {
      await rideRepo.remove(ride.id, ride.dataISO);
      set({ lastDeleted: ride });
      await get().loadToday();
    } finally {
      set({ loading: false });
    }
  },

  // NOVO: desfazer
  async undoLastDelete() {
    const last = get().lastDeleted;
    if (!last) return;
    set({ loading: true });
    try {
      await rideRepo.create(last);
      set({ lastDeleted: null });
      await get().loadToday();
    } finally {
      set({ loading: false });
    }
  },
}));
