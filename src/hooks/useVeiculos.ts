import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { PaginatedResult, Veiculo } from '../types';

export function useVeiculos(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['veiculos', params],
    queryFn: async () => {
      const res = await api.get<PaginatedResult<Veiculo>>('/veiculo/paginado', { params: { pageSize: 100, ...params } });
      return res.data;
    },
  });
}

export function useVeiculo(id: string) {
  return useQuery({
    queryKey: ['veiculo', id],
    queryFn: async () => {
      const res = await api.get<{ result: Veiculo }>('/veiculo/by-id', { params: { id } });
      return res.data.result;
    },
    enabled: !!id,
  });
}

export function useAtualizarLimiteVelocidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { veiculoId: string; limiteKmh: number | null }) =>
      api.put('/veiculo-config/limite-velocidade', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['veiculos'] }),
  });
}
