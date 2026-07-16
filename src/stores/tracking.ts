import { create } from 'zustand';
import type { Veiculo } from '../types';

interface TrackingState {
  vehicles: Record<string, Veiculo>;
  connected: boolean;
  updateVehicle: (v: Partial<Veiculo> & { id: string }) => void;
  setVehicles: (vs: Veiculo[]) => void;
  setConnected: (connected: boolean) => void;
  clear: () => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  vehicles: {},
  connected: false,
  clear: () => set({ vehicles: {} }),
  setConnected: (connected) => set({ connected }),

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
