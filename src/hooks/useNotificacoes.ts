import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { PaginatedResult, Notificacao } from '../types';

export function useNotificacoes(params?: { lida?: boolean }) {
  return useInfiniteQuery({
    queryKey: ['notificacoes', params],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await api.get<PaginatedResult<Notificacao>>('/notificacao/paginado', {
        params: { pageNumber: pageParam, pageSize: 20, ...params },
      });
      return res.data;
    },
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.pagination.pageNumber < last.pagination.totalPages - 1
        ? last.pagination.pageNumber + 1
        : undefined,
  });
}

export function useMarcarLida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put('/notificacao/marcar-lida', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });
}

export function useMarcarTodasLidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (usuarioAppId?: string) =>
      api.put('/notificacao/marcar-todas-lidas', { usuarioAppId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });
}
