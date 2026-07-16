import React from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl,
  StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell, Warning, Car, Lightning, MapPin, CheckCircle,
} from 'phosphor-react-native';
import {
  useNotificacoes, useMarcarLida, useMarcarTodasLidas,
} from '../../src/hooks/useNotificacoes';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, radius } from '../../src/components/theme';
import { formatDateTime } from '../../src/utils/format';
import type { Notificacao } from '../../src/types';

const TIPO_META: Record<number, { icon: typeof Bell; color: string; label: string }> = {
  0: { icon: Warning, color: '#F59E0B', label: 'Alerta' },
  1: { icon: Bell, color: colors.primary, label: 'Info' },
};

function getEventoIcon(texto: string) {
  if (texto.toLowerCase().includes('velocidade')) return Lightning;
  if (texto.toLowerCase().includes('cerca')) return MapPin;
  if (texto.toLowerCase().includes('veículo') || texto.toLowerCase().includes('veiculo')) return Car;
  return Bell;
}

function NotificacaoItem({
  item,
  onRead,
}: {
  item: Notificacao;
  onRead: (id: string) => void;
}) {
  const meta = TIPO_META[item.tipo] ?? TIPO_META[1];
  const IconComp = getEventoIcon(item.titulo + ' ' + (item.mensagem ?? ''));
  const isUnread = !item.lida;

  return (
    <Pressable
      testID={`${isUnread ? 'notification-unread' : 'notification'}-${item.id}`}
      style={[styles.item, isUnread && styles.itemUnread]}
      onPress={() => !item.lida && onRead(item.id)}
    >
      <View style={[styles.iconWrap, { backgroundColor: meta.color + '22' }]}>
        <IconComp size={22} color={meta.color} weight="fill" />
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTitle, isUnread && styles.itemTitleUnread]} numberOfLines={1}>
            {item.titulo}
          </Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        {item.mensagem && (
          <Text style={styles.itemMsg} numberOfLines={2}>{item.mensagem}</Text>
        )}
        {item.veiculoPlaca && (
          <Text style={styles.itemPlaca}>{item.veiculoPlaca}</Text>
        )}
        <Text style={styles.itemTime}>{formatDateTime(item.dataCriacao)}</Text>
      </View>
    </Pressable>
  );
}

export default function NotificacoesScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useNotificacoes();
  const marcarLida = useMarcarLida();
  const marcarTodas = useMarcarTodasLidas();

  const items: Notificacao[] = data?.pages.flatMap((p) => p.result) ?? [];
  const hasUnread = items.some((n) => !n.lida);

  return (
    <View testID="notifications-screen" style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alertas</Text>
        {hasUnread && (
          <Pressable style={styles.markAllBtn} onPress={() => marcarTodas.mutate(undefined)} testID="mark-all-btn">
            <CheckCircle size={18} color={colors.primary} />
            <Text style={styles.markAllText}>Marcar todas</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NotificacaoItem item={item} onRead={(id) => marcarLida.mutate(id)} />
          )}
          ListEmptyComponent={
            <EmptyState
              title="Sem alertas"
              message="Você não tem nenhuma notificação no momento."
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxl }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.lg }} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  markAllText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  list: { paddingVertical: spacing.sm, flexGrow: 1 },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  itemUnread: { backgroundColor: colors.primary + '08' },
  iconWrap: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  itemTitle: { flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  itemTitleUnread: { color: colors.text, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  itemMsg: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  itemPlaca: { color: colors.primary, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  itemTime: { color: colors.textMuted, fontSize: 11 },
  separator: { height: 1, backgroundColor: colors.cardBorder, marginHorizontal: spacing.lg },
});
