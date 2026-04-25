import { Settings } from "@core/domain/types";
import { ISettingsRepo } from "@core/ports/repos";

export function saveSettings(repo: ISettingsRepo) {
  return async (settings: Settings) => {
    if (
      settings.metaDiariaBruta < 0 ||
      settings.metaMinRSKm <= 0 ||
      settings.radarMinValor <= 0 ||
      settings.radarMinRSKm <= 0 ||
      settings.radarMinRSHora <= 0
    ) {
      throw new Error("Metas invalidas");
    }
    await repo.save(settings);
  };
}
