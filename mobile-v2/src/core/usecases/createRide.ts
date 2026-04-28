import { Ride } from "@core/domain/types";
import { IRideRepo } from "@core/ports/repos";
import {
  getDistanceValidationMessage,
  normalizeDistanceKm,
} from "@utils/distance";

export function createRide(repo: IRideRepo) {
  return async (ride: Ride) => {
    const normalizedDistance = normalizeDistanceKm(
      ride.kmRodado,
      "ride.kmRodado",
    );

    if (!normalizedDistance.normalizedKm || normalizedDistance.normalizedKm <= 0) {
      throw new Error(getDistanceValidationMessage(normalizedDistance));
    }

    if (ride.receitaBruta < 0) throw new Error("Receita invalida");

    await repo.create({
      ...ride,
      kmRodado: +normalizedDistance.normalizedKm.toFixed(2),
    });
  };
}
