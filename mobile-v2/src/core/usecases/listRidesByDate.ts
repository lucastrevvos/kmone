import { IRideRepo } from "@core/ports/repos";

export function listRidesByDate(repo: IRideRepo) {
  return async (dateISO: string) => repo.listByDate(dateISO);
}
