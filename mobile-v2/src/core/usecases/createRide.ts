import { Ride } from "@core/domain/types";
import { IRideRepo } from "@core/ports/repos";

export function createRide(repo: IRideRepo) {
  return async (ride: Ride) => {
    if (ride.kmRodado <= 0) throw new Error("KM inválido");
    if (ride.receitaBruta < 0) throw new Error("Receita inválida");
    await repo.create(ride);
  };
}
