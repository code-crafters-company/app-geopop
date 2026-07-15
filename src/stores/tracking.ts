import { create } from 'zustand';
import type { Veiculo } from '../types';

interface TrackingState {
  vehicles: Record<string, Veiculo>;
  updateVehicle: (v: Partial<Veiculo> & { id: string }) => void;
  setVehicles: (vs: Veiculo[]) => void;
  clear: () => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  vehicles: {},
  clear: () => set({ vehicles: {} }),

  setVehicles: (vs) => {
    const map: Record<string, Veiculo> = {};
    vs.forEach((v) => { map[v.id] = v; });
    set({ vehicles: map });
  },

  updateVehicle: (partial) => {
    set((state) => ({
      vehicles: {
        ...state.vehicles,
        [partial.id]: { ...state.vehicles[partial.id], ...partial },
      },
    }));
  },
}));
