import { IFuelRepo } from "@core/ports/repos";

export function listFuelByDate(repo: IFuelRepo) {
  return async (dateISO: string) => repo.listByDate(dateISO);
}
