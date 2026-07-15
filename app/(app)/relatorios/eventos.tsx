import React, { useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { Lightning, LightningSlash, Speedometer, MapPin, ArrowSquareIn, ArrowSquareOut } from 'phosphor-react-native';
import { useEventos } from '../../../src/hooks/useEventos';
import { EmptyState } from '../../../src/components/EmptyState';
import { colors, spacing, radius } from '../../../src/components/theme';
import { formatDateTime } from '../../../src/utils/format';
import type { Evento } from '../../../src/types';
import { useVeiculos } from '../../../src/hooks/useVeiculos';

const TIPO_CONFIG: Record<number, { label: string; color: string; Icon: React.ComponentType<any> }> = {
  0: { label: 'Ignição Ligada', color: colors.success, Icon: Lightning },
  1: { label: 'Ignição Desligada', color: colors.error, Icon: LightningSlash },
  2: { label: 'Velocidade Excedida', color: colors.warning, Icon: Speedometer },
  3: { label: 'Entrada na Cerca', color: colors.info, Icon: ArrowSquareIn },
  4: { label: 'Saída da Cerca', color: colors.error, Icon: ArrowSquareOut },
};

function EventoItem({ item }: { item: Evento }) {
  const cfg = TIPO_CONFIG[item.tipo] ?? { label: 'Evento', color: colors.primary, Icon: MapPin };
  const { Icon } = cfg;
  return (
    <View style={styles.item}>
      <View style={[styles.iconWrap, { backgroundColor: cfg.color + '18' }]}>
        <Icon size={22} color={cfg.color} weight="fill" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemPlaca}>{item.veiculoPlaca}</Text>
        <Text style={styles.itemDesc}>{item.descricao}</Text>
        <Text style={styles.itemTime}>{formatDateTime(item.dataHora)}</Text>
      </View>
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
    </View>
  );
}

export default function EventosScreen() {
  const [veiculoId, setVeiculoId] = useState<string | undefined>();
  const [tipo, setTipo] = useState<number | undefined>();
  const { data: veiculos } = useVeiculos();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useEventos({ veiculoId, tipo });

  const items = data?.pages.flatMap((p) => p.result) ?? [];

  return (
    <View style={styles.container} testID="events-screen">
      <View style={styles.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <FilterChip label="Todos veículos" active={!veiculoId} onPress={() => setVeiculoId(undefined)} />
          {(veiculos?.result ?? []).map((vehicle) => <FilterChip key={vehicle.id} label={vehicle.placa} active={veiculoId === vehicle.id} onPress={() => setVeiculoId(vehicle.id)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <FilterChip label="Todos eventos" active={tipo == null} onPress={() => setTipo(undefined)} />
          {Object.entries(TIPO_CONFIG).map(([value, config]) => <FilterChip key={value} label={config.label} active={tipo === Number(value)} onPress={() => setTipo(Number(value))} />)}
        </ScrollView>
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EventoItem item={item} />}
          ListEmptyComponent={
            <EmptyState title="Nenhum evento" message="Os eventos de ignição, velocidade e cerca aparecem aqui." />
          }
          contentContainerStyle={styles.list}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <Pressable testID={`event-filter-${id}`} style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filtersWrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingVertical: spacing.xs },
  filters: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.sm },
  filterChip: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.full, paddingHorizontal: 11, paddingVertical: 6 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textSecondary, fontSize: 10, fontWeight: '600' },
  filterTextActive: { color: '#111111' },
  list: { padding: spacing.lg, flexGrow: 1 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemPlaca: { color: colors.text, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  itemDesc: { color: colors.textSecondary, fontSize: 12, marginVertical: 2 },
  itemTime: { color: colors.textMuted, fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
