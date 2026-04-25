import { Settings } from "@core/domain/types";
import { ISettingsRepo } from "@core/ports/repos";

const DEFAULTS: Settings = {
  metaDiariaBruta: 260,
  metaMinRSKm: 1.5,
  radarMinValor: 8,
  radarMinRSKm: 1.8,
  radarMinRSHora: 22,
};

export function getSettings(repo: ISettingsRepo) {
  return async (): Promise<Settings> => {
    const settings = await repo.get();
    if (!settings) return DEFAULTS;

    const usingLegacyRadarDefaults =
      settings.radarMinValor === 10 &&
      settings.radarMinRSKm === 2 &&
      settings.radarMinRSHora === 25;

    if (!usingLegacyRadarDefaults) {
      return settings;
    }

    return {
      ...settings,
      radarMinValor: DEFAULTS.radarMinValor,
      radarMinRSKm: DEFAULTS.radarMinRSKm,
      radarMinRSHora: DEFAULTS.radarMinRSHora,
    };
  };
}
