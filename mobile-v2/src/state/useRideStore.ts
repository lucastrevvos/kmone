import { Ride } from "@core/domain/types";
import { rideRepo } from "@core/infra/asyncStorageRepos";
import { createRide } from "@core/usecases/createRide";
import { listRidesByDate } from "@core/usecases/listRidesByDate";
import { todayLocalISO } from "@utils/format";
import { create } from "zustand";

type UndoState = { last?: { type: "ride"; snapshot: Ride } };

type S = {
  dateISO: string;
  rides: Ride[];
  loading: boolean;

  loadToday(): Promise<void>;
  addRide(input: Omit<Ride, "id" | "dataISO">): Promise<void>;

  // novos
  updateRide(id: string, patch: Partial<Ride>): Promise<void>;
  removeRide(id: string): Promise<void>;
  undo(): Promise<void>;
  _undoState: UndoState;
};

export const useRideStore = create<S>((set, get) => ({
  dateISO: todayLocalISO(),
  rides: [],
  loading: false,
  _undoState: {},

  async loadToday() {
    set({ loading: true });
    try {
      const usecase = listRidesByDate(rideRepo);
      const rides = await usecase(get().dateISO);
      set({ rides });
    } finally {
      set({ loading: false });
    }
  },

  async addRide(input) {
    const id = Math.random().toString(36).slice(2);
    const dataISO = get().dateISO;
    await createRide(rideRepo)({ id, ...input, dataISO });
    await get().loadToday();
  },

  // ====== novos métodos ======

  async updateRide(id, patch) {
    const { rides } = get();
    const idx = rides.findIndex((r) => r.id === id);
    if (idx === -1) return;

    // preserva dataISO e id
    const current = rides[idx];
    const updated: Ride = {
      ...current,
      ...patch,
      id: current.id,
      dataISO: current.dataISO,
      // se tiver campo updatedAt no domínio, pode adicionar:
      // updatedAt: new Date().toISOString(),
    };

    // persiste
    // troque por rideRepo.upsert/update se for o teu nome real
    // @ts-expect-error - depende da tua implementação do repo
    await rideRepo.save(updated);

    // atualiza store em memória
    const next = [...rides];
    next[idx] = updated;
    set({ rides: next });
  },

  async removeRide(id) {
    const { rides } = get();
    const idx = rides.findIndex((r) => r.id === id);
    if (idx === -1) return;

    const snapshot = rides[idx];

    // persiste remoção (troque o método se necessário)
    // @ts-expect-error - depende da tua implementação do repo
    await rideRepo.remove(id);

    // atualiza memória + registra undo
    set({
      rides: rides.filter((r) => r.id !== id),
      _undoState: { last: { type: "ride", snapshot } },
    });

    // limpa janela de undo após 7s se nada for desfeito
    setTimeout(() => {
      const last = get()._undoState.last;
      if (last?.snapshot.id === snapshot.id) {
        set({ _undoState: {} });
      }
    }, 7000);
  },

  async undo() {
    const { _undoState, rides, dateISO } = get();
    const last = _undoState.last;
    if (!last) return;

    // só restaura se pertencer ao dia atual da store
    if (last.type === "ride" && last.snapshot.dataISO === dateISO) {
      // @ts-expect-error - depende da tua implementação do repo
      await rideRepo.save(last.snapshot);
      set({
        rides: [last.snapshot, ...rides],
        _undoState: {},
      });
    } else {
      // se for de outro dia, apenas limpa o estado de undo
      set({ _undoState: {} });
    }
  },
}));
