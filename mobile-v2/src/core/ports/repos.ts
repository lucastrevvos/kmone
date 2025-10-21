import { FuelToUp, Ride, Settings } from "@core/domain/types";

export interface IRideRepo {
  create(ride: Ride): Promise<void>;
  listByDate(dateISO: string): Promise<Ride[]>;
}

export interface IFuelRepo {
  create(topup: FuelToUp): Promise<void>;
  listByDate(dateISO: string): Promise<FuelToUp[]>;
}

export interface ISettingsRepo {
  get(): Promise<Settings | null>;
  save(s: Settings): Promise<void>;
}
