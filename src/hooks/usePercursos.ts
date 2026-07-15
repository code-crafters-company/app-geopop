import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { PaginatedResult, HistoricoPosicao } from '../types';

export function usePercurso(params: { veiculoId: string; dataInicio?: string; dataFim?: string }) {
  return useInfiniteQuery({
    queryKey: ['percurso', params],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await api.get<PaginatedResult<HistoricoPosicao>>('/percurso', {
        params: { pageNumber: pageParam, pageSize: 500, ...params },
      });
      return res.data;
    },
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.pagination.pageNumber < last.pagination.totalPages - 1
        ? last.pagination.pageNumber + 1
        : undefined,
    enabled: !!params.veiculoId,
  });
}
