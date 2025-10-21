import { Settings } from "@core/domain/types";
import { ISettingsRepo } from "@core/ports/repos";

const DEFAULTS: Settings = { metaDiariaBruta: 260, metaMinRSKm: 1.5 };

export function getSettings(repo: ISettingsRepo) {
  return async (): Promise<Settings> => {
    const s = await repo.get();
    return s ?? DEFAULTS;
  };
}
