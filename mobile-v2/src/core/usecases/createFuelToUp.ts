import { FuelToUp } from "@core/domain/types";
import { IFuelRepo } from "@core/ports/repos";

export function createFuelTopUp(repo: IFuelRepo) {
  return async (t: FuelToUp) => {
    if (t.valor <= 0) throw new Error("Valor do abastecimento inválido");
    await repo.create(t);
  };
}
