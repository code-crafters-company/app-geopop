import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Linking, Platform, Pressable, RefreshControl,
  StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowSquareIn, ArrowSquareOut, CarProfile, CaretDown, Check, Funnel,
  Lightning, LightningSlash, MapPin, Speedometer, X,
} from 'phosphor-react-native';
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

const PERIODOS = [
  { key: 'tudo', label: 'Tudo', days: undefined },
  { key: '24h', label: '24h', days: 1 },
  { key: '7d', label: '7 dias', days: 7 },
  { key: '30d', label: '30 dias', days: 30 },
] as const;

function openLocal(item: Evento) {
  if (item.latitude == null || item.longitude == null) return;
  const label = encodeURIComponent(`${item.veiculoPlaca} · ${TIPO_CONFIG[item.tipo]?.label ?? 'Evento'}`);
  const url = Platform.OS === 'ios'
    ? `http://maps.apple.com/?ll=${item.latitude},${item.longitude}&q=${label}`
    : `geo:${item.latitude},${item.longitude}?q=${item.latitude},${item.longitude}(${label})`;
  void Linking.openURL(url);
}

function EventoItem({ item }: { item: Evento }) {
  const cfg = TIPO_CONFIG[item.tipo] ?? { label: 'Evento', color: colors.primary, Icon: MapPin };
  const { Icon } = cfg;
  const hasLocal = item.latitude != null && item.longitude != null;
  return (
    <View style={styles.item}>
      <View style={[styles.iconWrap, { backgroundColor: cfg.color + '18' }]}>
        <Icon size={22} color={cfg.color} weight="fill" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemPlaca}>{item.veiculoPlaca}</Text>
        <Text style={styles.itemDesc}>{item.descricao}</Text>
        {hasLocal && (
          <Pressable
            testID={`event-local-${item.id}`}
            style={styles.itemLocalRow}
            onPress={() => openLocal(item)}
            accessibilityLabel="Abrir local do evento no mapa"
          >
            <MapPin size={12} color={colors.info} weight="fill" />
            <Text style={styles.itemLocal} numberOfLines={1}>
              {item.latitude!.toFixed(5)}, {item.longitude!.toFixed(5)}
            </Text>
          </Pressable>
        )}
        <Text style={styles.itemTime}>{formatDateTime(item.dataHora)}</Text>
      </View>
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
    </View>
  );
}

interface SelectOption {
  key: string;
  label: string;
  testID: string;
}

function SelectSheet({
  visible, title, options, selectedKey, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <View style={styles.sheetOverlay}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} accessible={false} accessibilityLabel="Fechar filtro" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} testID="sheet-close" accessibilityLabel="Fechar">
            <X size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <FlatList
          data={options}
          keyExtractor={(option) => option.key}
          style={styles.sheetList}
          renderItem={({ item: option }) => {
            const active = option.key === selectedKey;
            return (
              <Pressable
                testID={option.testID}
                style={styles.sheetOption}
                onPress={() => { onSelect(option.key); onClose(); }}
              >
                <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>{option.label}</Text>
                {active && <Check size={18} color={colors.primary} weight="bold" />}
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

function FilterField({
  icon, label, value, onPress, testID,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable testID={testID} style={styles.filterField} onPress={onPress} accessible={false}>
      {icon}
      <View style={styles.filterFieldText}>
        <Text style={styles.filterFieldLabel}>{label}</Text>
        <Text style={styles.filterFieldValue} numberOfLines={1}>{value}</Text>
      </View>
      <CaretDown size={14} color={colors.textMuted} />
    </Pressable>
  );
}

export default function EventosScreen() {
  const [veiculoId, setVeiculoId] = useState<string | undefined>();
  const [tipo, setTipo] = useState<number | undefined>();
  const [periodKey, setPeriodKey] = useState<typeof PERIODOS[number]['key']>('tudo');
  const [periodEnd, setPeriodEnd] = useState(() => Date.now());
  const [sheet, setSheet] = useState<'veiculo' | 'tipo' | null>(null);
  const { data: veiculos } = useVeiculos();

  const periodDays = PERIODOS.find((p) => p.key === periodKey)?.days;
  const periodo = useMemo(() => (periodDays == null ? {} : {
    dataInicio: new Date(periodEnd - periodDays * 24 * 60 * 60 * 1000).toISOString(),
    dataFim: new Date(periodEnd).toISOString(),
  }), [periodDays, periodEnd]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useEventos({ veiculoId, tipo, ...periodo });

  const items = data?.pages.flatMap((p) => p.result) ?? [];
  const veiculosList = veiculos?.result ?? [];
  const selectedVeiculo = veiculosList.find((v) => v.id === veiculoId);

  const veiculoOptions: SelectOption[] = [
    { key: 'all', label: 'Todos os veículos', testID: 'veiculo-option-all' },
    ...veiculosList.map((v) => ({ key: v.id, label: v.placa, testID: `veiculo-option-${v.placa}` })),
  ];
  const tipoOptions: SelectOption[] = [
    { key: 'all', label: 'Todos os eventos', testID: 'tipo-option-all' },
    ...Object.entries(TIPO_CONFIG).map(([value, config]) => ({
      key: value, label: config.label, testID: `tipo-option-${value}`,
    })),
  ];

  return (
    <View style={styles.container} testID="events-screen">
      <View style={styles.filterBar}>
        <View style={styles.filterRow}>
          <FilterField
            testID="filter-veiculo"
            icon={<CarProfile size={18} color={colors.primary} weight="fill" />}
            label="Veículo"
            value={selectedVeiculo?.placa ?? 'Todos'}
            onPress={() => setSheet('veiculo')}
          />
          <FilterField
            testID="filter-tipo"
            icon={<Funnel size={18} color={colors.primary} weight="fill" />}
            label="Tipo de evento"
            value={tipo != null ? TIPO_CONFIG[tipo].label : 'Todos'}
            onPress={() => setSheet('tipo')}
          />
        </View>
        <View style={styles.segmented}>
          {PERIODOS.map((p) => {
            const active = periodKey === p.key;
            return (
              <Pressable
                key={p.key}
                testID={`period-${p.key}`}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => { setPeriodKey(p.key); setPeriodEnd(Date.now()); }}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
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

      <SelectSheet
        visible={sheet === 'veiculo'}
        title="Filtrar por veículo"
        options={veiculoOptions}
        selectedKey={veiculoId ?? 'all'}
        onSelect={(key) => setVeiculoId(key === 'all' ? undefined : key)}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'tipo'}
        title="Filtrar por tipo de evento"
        options={tipoOptions}
        selectedKey={tipo != null ? String(tipo) : 'all'}
        onSelect={(key) => setTipo(key === 'all' ? undefined : Number(key))}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterBar: {
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.sm,
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterField: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  filterFieldText: { flex: 1 },
  filterFieldLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  filterFieldValue: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 1 },
  segmented: {
    flexDirection: 'row', backgroundColor: colors.background, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.cardBorder, padding: 3,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: radius.full },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  segmentTextActive: { color: '#111111', fontWeight: '800' },
  sheetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 20 },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingTop: spacing.md, maxHeight: '65%',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingBottom: spacing.sm,
  },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  sheetList: { paddingHorizontal: spacing.md },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  sheetOptionText: { color: colors.textSecondary, fontSize: 14 },
  sheetOptionTextActive: { color: colors.text, fontWeight: '700' },
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
  itemLocalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  itemLocal: { color: colors.info, fontSize: 11, flexShrink: 1 },
  itemTime: { color: colors.textMuted, fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
