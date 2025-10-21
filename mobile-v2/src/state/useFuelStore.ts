import { FuelToUp } from "@core/domain/types";
import { AsyncFuelRepo } from "@core/infra/asyncStorageRepos";
import { createFuelTopUp } from "@core/usecases/createFuelToUp";
import { listFuelByDate } from "@core/usecases/listFuelByDate";
import { todayLocalISO } from "@utils/format";
import { create } from "zustand";

type S = {
  dateISO: string;
  fuels: FuelToUp[];
  loading: boolean;
  loadToday(): Promise<void>;
  addFuel(input: Omit<FuelToUp, "id" | "dataISO">): Promise<void>;
};

const repo = AsyncFuelRepo();

export const useFuelStore = create<S>((set, get) => ({
  dateISO: todayLocalISO(),
  fuels: [],
  loading: false,

  async loadToday() {
    set({ loading: true });

    try {
      const uc = listFuelByDate(repo);
      const fuels = await uc(get().dateISO);
      set({ fuels });
    } finally {
      set({ loading: false });
    }
  },

  async addFuel(input) {
    set({ loading: true });

    try {
      const id = Math.random().toString(36).slice(2);
      const dataISO = get().dateISO;
      await createFuelTopUp(repo)({ id, dataISO, ...input });
      await get().loadToday();
    } finally {
      set({ loading: false });
    }
  },
}));
