import { Settings } from "@core/domain/types";
import { settingsRepo } from "@core/infra/asyncStorageRepos";
import { getSettings } from "@core/usecases/getSettings";
import { saveSettings } from "@core/usecases/saveSettings";
import { offerOverlayBridge } from "@features/offerRadar/overlayBridge";
import { create } from "zustand";

type S = {
  settings: Settings;
  loading: boolean;
  load(): Promise<void>;
  save(s: Settings): Promise<void>;
};

export const useSettingsStore = create<S>((set) => ({
  settings: {
    metaDiariaBruta: 260,
    metaMinRSKm: 1.5,
    radarMinValor: 8,
    radarMinRSKm: 1.8,
    radarMinRSHora: 22,
  },
  loading: false,

  async load() {
    set({ loading: true });
    try {
      const settings = await getSettings(settingsRepo)();
      await offerOverlayBridge.syncRadarConfig(settings);
      set({ settings });
    } finally {
      set({ loading: false });
    }
  },

  async save(settings) {
    set({ loading: true });
    try {
      await saveSettings(settingsRepo)(settings);
      await offerOverlayBridge.syncRadarConfig(settings);
      set({ settings });
    } finally {
      set({ loading: false });
    }
  },
}));
