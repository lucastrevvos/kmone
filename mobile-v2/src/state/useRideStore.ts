import { Ride } from "@core/domain/types";
import { AsyncRideRepo } from "@core/infra/asyncStorageRepos";
import { createRide } from "@core/usecases/createRide";
import { listRidesByDate } from "@core/usecases/listRidesByDate";
import { todayLocalISO } from "@utils/format";
import { create } from "zustand";

type S = {
  dateISO: string;
  rides: Ride[];
  loading: boolean;
  loadToday(): Promise<void>;
  addRide(input: Omit<Ride, "id" | "dataISO">): Promise<void>;
};

const rideRepo = AsyncRideRepo();

export const useRideStore = create<S>((set, get) => ({
  dateISO: todayLocalISO(),
  rides: [],
  loading: false,

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
}));
