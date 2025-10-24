import { Settings } from "@core/domain/types";
import { settingsRepo } from "@core/infra/asyncStorageRepos";
import { getSettings } from "@core/usecases/getSettings";
import { saveSettings } from "@core/usecases/saveSettings";
import { create } from "zustand";

type S = {
  settings: Settings;
  loading: boolean;
  load(): Promise<void>;
  save(s: Settings): Promise<void>;
};

export const useSettingsStore = create<S>((set) => ({
  settings: { metaDiariaBruta: 260, metaMinRSKm: 1.5 },
  loading: false,

  async load() {
    set({ loading: true });
    try {
      const s = await getSettings(settingsRepo)();
      set({ settings: s });
    } finally {
      set({ loading: false });
    }
  },

  async save(s) {
    set({ loading: true });
    try {
      await saveSettings(settingsRepo)(s);
      set({ settings: s });
    } finally {
      set({ loading: false });
    }
  },
}));
