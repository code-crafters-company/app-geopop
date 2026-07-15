import React, { useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MagnifyingGlass } from 'phosphor-react-native';
import { useVeiculos } from '../../../src/hooks/useVeiculos';
import { VeiculoCard } from '../../../src/components/VeiculoCard';
import { EmptyState } from '../../../src/components/EmptyState';
import { colors, spacing } from '../../../src/components/theme';

export default function VeiculosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch, isRefetching } = useVeiculos(
    search.length >= 2 ? { placa: search } : undefined
  );

  const items = data?.result ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Veículos</Text>
        <Text style={styles.count}>{data?.pagination.totalElements ?? 0} total</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <MagnifyingGlass size={18} color={colors.textMuted} style={{ marginLeft: spacing.md }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por placa..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="characters"
          returnKeyType="search"
          testID="search-placa"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(v) => v.id}
          renderItem={({ item }) => (
            <VeiculoCard
              veiculo={item}
              onPress={() => router.push(`/(app)/veiculos/${item.id}`)}
            />
          )}
          ListEmptyComponent={<EmptyState title="Nenhum veículo encontrado" />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
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
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  count: { color: colors.textSecondary, fontSize: 13 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10, marginHorizontal: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1, color: colors.text, fontSize: 15,
    padding: spacing.md, paddingLeft: spacing.sm,
  },
  list: { padding: spacing.lg, paddingTop: 0, flexGrow: 1 },
});
