import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { PaginatedResult, Evento } from '../types';

export function useEventos(params?: { veiculoId?: string; tipo?: number; dataInicio?: string; dataFim?: string }) {
  return useInfiniteQuery({
    queryKey: ['eventos', params],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await api.get<PaginatedResult<Evento>>('/evento/paginado', {
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
