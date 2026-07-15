import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { usePercurso } from '../../../src/hooks/usePercursos';
import { useVeiculos } from '../../../src/hooks/useVeiculos';
import { EmptyState } from '../../../src/components/EmptyState';
import { colors, spacing, radius } from '../../../src/components/theme';
import { formatDateTime, formatSpeed } from '../../../src/utils/format';
import { Button } from '../../../src/components/Button';

export default function PercursosScreen() {
  const { data: veiculos } = useVeiculos();
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState(1);
  const [periodEnd, setPeriodEnd] = useState(() => Date.now());
  const mapRef = useRef<MapView>(null);

  const period = useMemo(() => ({
    dataFim: new Date(periodEnd).toISOString(),
    dataInicio: new Date(periodEnd - periodDays * 24 * 60 * 60 * 1000).toISOString(),
  }), [periodDays, periodEnd]);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = usePercurso({
    veiculoId: selectedVeiculoId ?? '',
    ...period,
  });

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const pontos = useMemo(() => (data?.pages.flatMap((p) => p.result) ?? [])
    .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()), [data]);
  const coords = pontos
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({ latitude: p.latitude, longitude: p.longitude }));

  useEffect(() => {
    if (coords.length > 1) mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true });
  }, [coords.length]);

  return (
    <View style={styles.container} testID="routes-screen">
      {/* Seletor de veículo */}
      <View style={styles.selectorWrap}>
        <FlatList
          horizontal
          data={veiculos?.result ?? []}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.selector}
          renderItem={({ item }) => (
            <Button
              testID={`route-vehicle-${item.id}`}
              label={item.placa}
              variant={selectedVeiculoId === item.id ? 'primary' : 'outline'}
              onPress={() => setSelectedVeiculoId(item.id)}
              style={styles.selectorBtn}
            />
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>
      <View style={styles.periods}>
        {[1, 7, 30].map((days) => <Pressable testID={`route-period-${days}`} key={days} style={[styles.period, periodDays === days && styles.periodActive]} onPress={() => { setPeriodDays(days); setPeriodEnd(Date.now()); }}><Text style={[styles.periodText, periodDays === days && styles.periodTextActive]}>{days === 1 ? '24 horas' : `${days} dias`}</Text></Pressable>)}
      </View>

      {!selectedVeiculoId ? (
        <EmptyState title="Selecione um veículo" message="Escolha o veículo acima para ver o percurso das últimas 24h." />
      ) : isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : pontos.length === 0 ? (
        <EmptyState title="Sem percurso" message="Nenhuma posição registrada nas últimas 24 horas." />
      ) : (
        <>
          <View style={styles.mapWrap} testID="route-map">
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFillObject}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              userInterfaceStyle="light"
              initialRegion={coords.length > 0 ? {
                latitude: coords[0].latitude,
                longitude: coords[0].longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              } : undefined}
            >
              {coords.length > 1 && (
                <Polyline
                  coordinates={coords}
                  strokeColor={colors.primary}
                  strokeWidth={3}
                />
              )}
              {coords.length > 0 && <Marker coordinate={coords[0]} title="Início" pinColor={colors.success} />}
              {coords.length > 1 && <Marker coordinate={coords[coords.length - 1]} title="Fim" pinColor={colors.error} />}
            </MapView>
          </View>

          <View style={styles.statsRow} testID="route-stats">
            <View style={styles.stat}>
              <Text style={styles.statValue}>{isFetchingNextPage ? '...' : pontos.length}</Text>
              <Text style={styles.statLabel}>Pontos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatSpeed(Math.max(...pontos.map((p) => p.velocidade)))}</Text>
              <Text style={styles.statLabel}>Vel. Máxima</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDateTime(pontos[0]?.dataHora ?? '')}</Text>
              <Text style={styles.statLabel}>Início</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  selectorWrap: { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  selector: { padding: spacing.lg, gap: spacing.sm },
  selectorBtn: { height: 36, paddingHorizontal: spacing.md, marginRight: spacing.sm },
  periods: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  period: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.cardBorder },
  periodActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  periodTextActive: { color: '#111111' },
  mapWrap: { flex: 1, margin: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },
  statsRow: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
