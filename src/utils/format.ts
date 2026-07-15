export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatSpeed(kmh?: number | null): string {
  if (kmh == null) return '—';
  return `${Math.round(kmh)} km/h`;
}

export function formatCoord(lat?: number | null, lng?: number | null): string {
  if (lat == null || lng == null) return 'Sem posição';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
