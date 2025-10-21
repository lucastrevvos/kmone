import { Settings } from "@core/domain/types";
import { AsyncSettingsRepo } from "@core/infra/asyncStorageRepos";
import { getSettings } from "@core/usecases/getSettings";
import { saveSettings } from "@core/usecases/saveSettings";
import { create } from "zustand";

type S = {
  settings: Settings;
  loading: boolean;
  load(): Promise<void>;
  save(s: Settings): Promise<void>;
};

const repo = AsyncSettingsRepo();

export const useSettingsStore = create<S>((set) => ({
  settings: { metaDiariaBruta: 260, metaMinRSKm: 1.5 },
  loading: false,

  async load() {
    set({ loading: true });
    try {
      const s = await getSettings(repo)();
      set({ settings: s });
    } finally {
      set({ loading: false });
    }
  },

  async save(s) {
    set({ loading: true });
    try {
      await saveSettings(repo)(s);
      set({ settings: s });
    } finally {
      set({ loading: false });
    }
  },
}));
