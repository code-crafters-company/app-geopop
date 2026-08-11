import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

// Resolve o endereço a partir de lat/long via geocoding reverso da API
// (Nominatim + cache no backend). Doc AGO26 (App): mostrar o endereço no lugar
// da LAT/LONG. Cacheado por coordenada arredondada.
export function useEndereco(lat?: number | null, lon?: number | null) {
  const habilitado = typeof lat === 'number' && typeof lon === 'number' && (lat !== 0 || lon !== 0);
  return useQuery({
    queryKey: ['endereco', habilitado ? Number(lat).toFixed(5) : 'none', habilitado ? Number(lon).toFixed(5) : 'none'],
    queryFn: async () => {
      const res = await api.get<{ endereco: string | null }>('/geocoding/reverse', { params: { lat, lon } });
      return res.data?.endereco ?? null;
    },
    enabled: habilitado,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });
}
