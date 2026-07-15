import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { PaginatedResult, CercaVirtual } from '../types';

export function useCercasVirtuais(veiculoId?: string) {
  return useQuery({
    queryKey: ['cercas', veiculoId],
    queryFn: async () => {
      const res = await api.get<PaginatedResult<CercaVirtual>>('/cerca-virtual/paginado', {
        params: { pageSize: 100, veiculoId },
      });
      return res.data;
    },
  });
}

export function useCriarCercaVirtual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CercaVirtual>) => api.post('/cerca-virtual', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cercas'] }),
  });
}

export function useAlterarCercaVirtual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CercaVirtual> & { id: string }) => api.put('/cerca-virtual', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cercas'] }),
  });
}

export function useDeletarCercaVirtual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete('/cerca-virtual', { data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cercas'] }),
  });
}
