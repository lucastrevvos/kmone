import { Settings } from "@core/domain/types";
import { ISettingsRepo } from "@core/ports/repos";

export function saveSettings(repo: ISettingsRepo) {
  return async (s: Settings) => {
    if (s.metaDiariaBruta < 0 || s.metaMinRSKm <= 0) {
      throw new Error("Metas inválidas");
    }
    await repo.save(s);
  };
}
